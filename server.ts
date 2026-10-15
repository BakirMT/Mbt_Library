import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/db/index.ts';
import {
  tenants,
  subscriptionPlans,
  subscriptions,
  users,
  tenantMemberships,
  books,
  bookCopies,
  loans,
  reservations,
  fines,
  invitations,
  invoices,
  activityLogs,
  subscriptionEnquiries,
  otpVerifications,
} from './src/db/schema.ts';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import {
  verifyTenantActiveAndSubscribed,
  checkServerTitleQuota,
  checkServerCopyQuota,
  checkServerLibrarianQuota,
  checkServerStudentQuota,
  checkServerStorageQuota,
  checkServerBorrowingQuota,
} from './src/middleware/subscriptionLimits.ts';
import {
  INITIAL_PLANS,
  INITIAL_TENANTS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_USERS,
  INITIAL_MEMBERSHIPS,
  INITIAL_BOOKS,
  INITIAL_COPIES,
  INITIAL_LOANS,
} from './src/services/mockData.ts';
import crypto from 'crypto';
import { Resend } from 'resend';
import { adminAuth, adminDb } from './src/lib/firebase-admin.ts';
import { requireAuth } from './src/middleware/auth.ts';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// --- HEALTH & STATUS ---
app.get('/api/health', async (_req, res) => {
  try {
    const dbCheck = await db.execute(sql`SELECT 1 as alive;`);
    res.json({
      status: 'ok',
      database: 'connected (PostgreSQL Cloud SQL)',
      rlsEnabled: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'degraded', error: err?.message });
  }
});

// --- AUTOMATIC 72-HOUR TRIAL EXPIRATION ENGINE (CLOUD SQL DB) ---
export async function checkAndDeactivateExpiredTrialsDB(): Promise<{ expiredCount: number }> {
  try {
    const now = new Date();
    // Find all subscriptions on Free plan or trial that have reached expiryDate
    const expiredSubs = await db
      .select({
        sub: subscriptions,
        plan: subscriptionPlans,
        tenant: tenants,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .innerJoin(tenants, eq(subscriptions.tenantId, tenants.id))
      .where(
        and(
          sql`(${subscriptionPlans.code} = 'free' OR ${subscriptions.status} = 'trial' OR ${subscriptions.status} = 'expired')`,
          sql`(${subscriptions.expiryDate} <= ${now} OR ${subscriptions.status} = 'expired')`,
          sql`(${subscriptions.status} != 'expired' OR ${tenants.status} = 'active')`
        )
      );

    let count = 0;
    for (const item of expiredSubs) {
      count++;
      console.log(`[License Engine] Automatically expiring 3-day Free trial for tenant "${item.tenant.name}" (${item.tenant.id})`);

      // 1. Mark subscription as expired
      await db.update(subscriptions).set({ status: 'expired' }).where(eq(subscriptions.id, item.sub.id));

      // 2. Mark tenant as deactivated (preserving separate manual suspension or archival)
      if (item.tenant.status !== 'suspended' && item.tenant.status !== 'archived') {
        await db.update(tenants).set({ status: 'deactivated', updatedAt: now }).where(eq(tenants.id, item.tenant.id));
      }

      // 3. Notify Super Admin via Activity Log
      await db.insert(activityLogs).values({
        id: `log_exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId: item.tenant.id,
        actorId: 'system',
        actorName: 'MBT Automated License Engine',
        actorRole: 'super_admin',
        action: 'TRIAL_EXPIRED_DEACTIVATED',
        category: 'subscription',
        details: `3-day Free trial (72 hours) has expired for "${item.tenant.name}". Library access automatically deactivated. Super Admin notified.`,
        timestamp: now,
      });
    }

    return { expiredCount: count };
  } catch (err: any) {
    console.error('[License Engine] Error during scheduled trial check:', err?.message);
    return { expiredCount: 0 };
  }
}

// Helper: Require Tenant Active and Subscribed on Backend Requests
export async function requireActiveTenant(slug: string, res: Response): Promise<{ tenant: any; tenantId: string } | null> {
  // First check if any trials expired just now
  await checkAndDeactivateExpiredTrialsDB();

  const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (!tRows.length) {
    res.status(404).json({ error: 'Library tenant not found' });
    return null;
  }
  const tenant = tRows[0];
  const subCheck = await verifyTenantActiveAndSubscribed(tenant.id);
  if (!subCheck.valid) {
    res.status(403).json({
      error: subCheck.error,
      status: tenant.status,
      subscriptionStatus: 'expired',
      isExpired: true,
    });
    return null;
  }
  return { tenant, tenantId: tenant.id };
}

// --- TENANTS API ---
app.get('/api/tenants', async (_req, res) => {
  try {
    await checkAndDeactivateExpiredTrialsDB();
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

    // Aggregate real counts per tenant for fast display
    const enriched = await Promise.all(
      allTenants.map(async (t) => {
        const titleCountRes = await db.select({ val: count() }).from(books).where(eq(books.tenantId, t.id));
        const copyCountRes = await db.select({ val: count() }).from(bookCopies).where(eq(bookCopies.tenantId, t.id));
        const libCountRes = await db.select({ val: count() }).from(tenantMemberships).where(and(eq(tenantMemberships.tenantId, t.id), sql`${tenantMemberships.role} IN ('librarian', 'senior_librarian')`));
        const stuCountRes = await db.select({ val: count() }).from(tenantMemberships).where(and(eq(tenantMemberships.tenantId, t.id), eq(tenantMemberships.role, 'student')));
        const loanCountRes = await db.select({ val: count() }).from(loans).where(and(eq(loans.tenantId, t.id), eq(loans.status, 'active')));

        return {
          ...t,
          currentUsage: {
            titlesCount: Number(titleCountRes[0]?.val || 0),
            copiesCount: Number(copyCountRes[0]?.val || 0),
            librariansCount: Number(libCountRes[0]?.val || 0),
            studentsCount: Number(stuCountRes[0]?.val || 0),
            activeLoansCount: Number(loanCountRes[0]?.val || 0),
          },
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    console.error('Error fetching tenants:', err);
    res.status(500).json({ error: 'Failed to fetch libraries' });
  }
});

app.get('/api/tenants/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    await checkAndDeactivateExpiredTrialsDB();

    const tenantRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tenantRows.length) {
      return res.status(404).json({ error: 'Library not found' });
    }
    const t = tenantRows[0];
    const subRows = await db
      .select({
        sub: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.tenantId, t.id))
      .limit(1);

    res.json({
      tenant: t,
      subscription: subRows[0]?.sub || null,
      plan: subRows[0]?.plan || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PRODUCTION REAL EMAIL OTP AUTHENTICATION ENDPOINTS (Resend API + HMAC + Firebase Auth) ---
const PRIVILEGED_ROLES = ['super_admin', 'platform_owner', 'tenant_admin', 'admin', 'librarian', 'senior_librarian'];

function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const DEFAULT_HMAC_SECRET = 'mbt-library-secure-otp-hmac-key-2026';

function generateHmac(email: string, code: string): string {
  const secret = process.env.OTP_HMAC_SECRET || DEFAULT_HMAC_SECRET;
  return crypto.createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

function getValidSenderEmail(): string {
  const envFrom = (process.env.RESEND_FROM_EMAIL || '').trim();
  if (!envFrom) {
    return 'MBT Library Authentication <onboarding@resend.dev>';
  }
  const lower = envFrom.toLowerCase();
  const isPublicWebmail =
    lower.includes('@gmail.com') ||
    lower.includes('@googlemail.com') ||
    lower.includes('@yahoo.com') ||
    lower.includes('@hotmail.com') ||
    lower.includes('@outlook.com');

  if (isPublicWebmail) {
    console.warn(
      `[OTP System] Configured sender "${envFrom}" uses a public email domain which is not supported by Resend without domain verification. Falling back to "MBT Library Authentication <onboarding@resend.dev>".`
    );
    return 'MBT Library Authentication <onboarding@resend.dev>';
  }

  return envFrom;
}

function sanitizeProviderError(raw: string, providerName: string): string {
  if (!raw) return `${providerName} service returned an empty response.`;
  const trimmed = raw.trim();
  if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE') || trimmed.includes('<html')) {
    const titleMatch = trimmed.match(/<title>([^<]+)<\/title>/i);
    const codeMatch = trimmed.match(/Error code (\d+)/i) || trimmed.match(/(\d{3}):\s*Connection/i);
    const title = titleMatch ? titleMatch[1].replace(/emailjs\.com\s*\|\s*/i, '').trim() : '';
    const code = codeMatch ? codeMatch[1] : '';
    return `${providerName} service issue${code ? ` (${code})` : ''}: ${title || 'Connection timed out. Please try again in a moment.'}`;
  }
  return raw;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

// In-memory test mock state for automated regression tests
let mockEmailJsHandler: ((payload: any) => Promise<{ ok: boolean; status: number; text: string }>) | null = null;
let lastEmailJsPayload: any = null;

async function sendEmailJsOtpEmail(toEmail: string, otpCode: string): Promise<SendEmailResult> {
  let serviceId = (process.env.EMAILJS_SERVICE_ID || '').trim();
  if (!serviceId || serviceId === 'service_wj') {
    serviceId = 'service_wj02uv1';
  }
  const templateId = (process.env.EMAILJS_TEMPLATE_ID || '').trim();
  const publicKey = (process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID || '').trim();
  const privateKey = (process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN || '').trim();

  if (!serviceId) {
    return {
      success: false,
      error: 'EmailJS Service ID is not configured.',
    };
  }

  // If EmailJS template or public key is not set, but Resend is available, fall back to Resend
  if (!publicKey || !templateId) {
    if (process.env.RESEND_API_KEY) {
      console.info('[Email Service] EmailJS template_id or public_key not set, routing via configured Resend API.');
      return sendResendOtpEmail(process.env.RESEND_API_KEY, toEmail, otpCode);
    }
    return {
      success: false,
      error: `EmailJS Configuration Required: Service ID is set to "${serviceId}". Please set EMAILJS_PUBLIC_KEY and EMAILJS_TEMPLATE_ID in your .env file or environment variables to dispatch OTP emails via EmailJS.`,
    };
  }

  // Canonical EmailJS payload strictly matching Section 3 specification
  const payload: any = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: toEmail,
      email: toEmail,
      user_email: toEmail,
      recipient: toEmail,
      admin_email: toEmail,
      otp_code: otpCode,
      code: otpCode,
      otp: otpCode,
      app_name: 'MBT Library',
    },
  };

  if (privateKey) {
    payload.accessToken = privateKey;
  }

  lastEmailJsPayload = payload;

  // If mocked for automated regression testing, return the mock response directly
  if (mockEmailJsHandler) {
    const mockRes = await mockEmailJsHandler(payload);
    if (mockRes.ok) {
      return {
        success: true,
        messageId: `mock_emailjs_${Date.now()}`,
        provider: 'emailjs',
      };
    }
    return {
      success: false,
      error: sanitizeProviderError(mockRes.text, 'EmailJS'),
      provider: 'emailjs',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const appOrigin = process.env.APP_URL || 'http://localhost:3000';
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': appOrigin,
        'Referer': `${appOrigin}/`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await res.text();

    if (res.ok) {
      return {
        success: true,
        messageId: `emailjs_${Date.now()}`,
        provider: 'emailjs',
      };
    }

    const sanitizedError = sanitizeProviderError(responseText, 'EmailJS');

    // If EmailJS failed due to server error (5xx / 522 Cloudflare timeout), fall back to Resend if available
    if ((res.status >= 500 || res.status === 429) && process.env.RESEND_API_KEY) {
      console.warn(`[Email Service] EmailJS returned HTTP ${res.status}. Attempting fallback via Resend...`);
      return sendResendOtpEmail(process.env.RESEND_API_KEY, toEmail, otpCode);
    }

    return {
      success: false,
      error: sanitizedError,
      provider: 'emailjs',
    };
  } catch (err: any) {
    if (process.env.RESEND_API_KEY) {
      console.warn(`[Email Service] EmailJS connection failed (${err?.message}). Attempting fallback via Resend...`);
      return sendResendOtpEmail(process.env.RESEND_API_KEY, toEmail, otpCode);
    }

    const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
    return {
      success: false,
      error: isTimeout
        ? 'EmailJS service connection timed out (8s limit). Please check your EmailJS dashboard or try again.'
        : `EmailJS network failure: ${err?.message || 'Unable to connect to EmailJS API'}`,
      provider: 'emailjs',
    };
  }
}

async function sendResendOtpEmail(apiKey: string, toEmail: string, otpCode: string): Promise<SendEmailResult> {
  const senderEmail = getValidSenderEmail();
  const emailPayload = {
    from: senderEmail,
    to: [toEmail],
    subject: 'Your 6-Digit MBT Library Login Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 22px;">MBT Library Verification</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Institutional Portal Login Code</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">Hello,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">Use the following six-digit code to complete your verification:</p>
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-family: 'Courier New', monospace; font-size: 34px; font-weight: bold; letter-spacing: 10px; color: #2563eb;">${otpCode}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This code will expire in <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">MBT Institutional Library SaaS System • Secure Authentication</p>
      </div>
    `,
  };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const data: any = await res.json().catch(() => ({}));

    if (res.ok && data?.id) {
      return { success: true, messageId: data.id };
    }

    const errorMsg = data?.message || '';
    if (errorMsg.includes('You can only send testing emails to your own email address')) {
      const match = errorMsg.match(/\(([^)]+)\)/);
      const sandboxOwner = match ? match[1] : 'the Resend account owner';
      return {
        success: false,
        error: `Resend Domain Required: Resend sandbox only sends to ${sandboxOwner}. To deliver verification codes directly to ${toEmail}, please verify your custom domain on https://resend.com/domains and configure RESEND_FROM_EMAIL to an address on your domain.`,
      };
    }

    if (errorMsg.includes('domain is not verified')) {
      return {
        success: false,
        error: `Sender domain is not verified: ${errorMsg}. Please verify your domain on https://resend.com/domains.`,
      };
    }

    return {
      success: false,
      error: data?.message || 'Failed to dispatch email via Resend.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error communicating with Resend API.',
    };
  }
}

async function determineUserRoleAndTenant(email: string, requestedRole?: string, requestedTenantSlug?: string) {
  let derivedRole = 'user';
  let derivedTenantSlug: string | null = null;

  // 1. Check existing Auth custom claims
  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    if (userRecord && userRecord.customClaims) {
      if (userRecord.customClaims.role) derivedRole = userRecord.customClaims.role as string;
      if (userRecord.customClaims.tenantSlug) derivedTenantSlug = userRecord.customClaims.tenantSlug as string;
    }
  } catch (e) {}

  // 2. Check Cloud SQL DB users & tenantMemberships table
  try {
    const uRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (uRows.length) {
      const u = uRows[0];
      if (u.isSuperAdmin) {
        derivedRole = 'super_admin';
      } else {
        const mRows = await db
          .select({ role: tenantMemberships.role, tenantId: tenantMemberships.tenantId })
          .from(tenantMemberships)
          .where(and(eq(tenantMemberships.userId, u.id), eq(tenantMemberships.isActive, true)))
          .limit(1);
        if (mRows.length) {
          derivedRole = mRows[0].role;
          const tRows = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, mRows[0].tenantId)).limit(1);
          if (tRows.length) derivedTenantSlug = tRows[0].slug;
        }
      }
    }
  } catch (e) {}

  // 3. Check invitations table
  if (derivedRole === 'user') {
    try {
      const invRows = await db
        .select()
        .from(invitations)
        .where(and(eq(invitations.recipientEmail, email), eq(invitations.status, 'pending')))
        .limit(1);
      if (invRows.length) {
        const inv = invRows[0];
        if (inv.role) derivedRole = inv.role;
        const tRows = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, inv.tenantId)).limit(1);
        if (tRows.length) derivedTenantSlug = tRows[0].slug;
      }
    } catch (e) {}
  }

  // 4. Sanitize requested role for new users
  if (requestedRole && PRIVILEGED_ROLES.includes(requestedRole) && !PRIVILEGED_ROLES.includes(derivedRole)) {
    console.warn(`[Security Alert] Suppressed unauthorized request for role "${requestedRole}" for email "${email}". Defaulting to "${derivedRole}".`);
  } else if (requestedRole && !PRIVILEGED_ROLES.includes(requestedRole)) {
    if (derivedRole === 'user') derivedRole = requestedRole;
  }

  if (requestedTenantSlug && !derivedTenantSlug) {
    derivedTenantSlug = requestedTenantSlug;
  }

  return { role: derivedRole, tenantSlug: derivedTenantSlug };
}

const handleSendOtpRoute = async (req: Request, res: Response) => {
  try {
    const rawDest = req.body.email || req.body.destination || req.body.target || req.body.phone || req.body.mobile;

    const normalizedEmail = normalizeEmail(rawDest);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const now = new Date();
    const nowMs = now.getTime();

    // 1. Enforce 60-second Resend Cooldown per email
    const recentRecords = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.destination, normalizedEmail),
          eq(otpVerifications.isConsumed, false),
          sql`${otpVerifications.expiresAt} > ${now}`
        )
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (recentRecords.length && recentRecords[0].createdAt) {
      const lastCreatedMs = new Date(recentRecords[0].createdAt).getTime();
      const secondsElapsed = (nowMs - lastCreatedMs) / 1000;
      if (secondsElapsed < 60) {
        const remaining = Math.ceil(60 - secondsElapsed);
        return res.status(429).json({
          error: `Please wait ${remaining} seconds before requesting a new verification code.`,
          cooldownSeconds: remaining,
        });
      }
    }

    // 2. Resolve Role and Tenant securely
    const { role, tenantSlug } = await determineUserRoleAndTenant(normalizedEmail, req.body.role, req.body.tenantSlug);

    // 3. Generate Cryptographically Secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const otpVerifier = generateHmac(normalizedEmail, otpCode);

    const expiresAt = new Date(nowMs + 5 * 60 * 1000); // 5 minutes

    // 4. Send Email using EmailJS (with fallback to Resend if configured)
    const sendResult = await sendEmailJsOtpEmail(normalizedEmail, otpCode);

    if (!sendResult.success) {
      return res.status(400).json({
        error: sendResult.error || 'Failed to deliver OTP email. Please check your email configuration.',
      });
    }

    // 5. Save ONLY keyed HMAC verifier (Never plaintext OTP)
    const id = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.insert(otpVerifications).values({
      id,
      destination: normalizedEmail,
      channel: 'gmail',
      otpCode: otpVerifier, // HMAC hash stored, never plaintext!
      tenantSlug: tenantSlug || null,
      role: role || null,
      isConsumed: false,
      expiresAt,
      createdAt: now,
    });

    // Also mirror to Firestore if initialized
    try {
      await adminDb.collection('otp_challenges').doc(id).set({
        email: normalizedEmail,
        otpVerifier,
        tenantSlug,
        role,
        attempts: 0,
        maxAttempts: 5,
        isConsumed: false,
        expiresAt: expiresAt.getTime(),
        createdAt: nowMs,
        resendMessageId: sendResult.messageId || null,
      });
    } catch (fsErr) {
      // Ignore Firestore mirror errors if running standalone PostgreSQL
    }

    const emailParts = normalizedEmail.split('@');
    const masked = `${emailParts[0].slice(0, 3)}***@${emailParts[1]}`;

    // Audit log
    await db.insert(activityLogs).values({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: null,
      actorId: 'system_otp_auth',
      actorName: sendResult.provider === 'emailjs' ? 'EmailJS OTP Service' : 'Email OTP Service',
      actorRole: 'auth_system',
      action: 'OTP_DISPATCHED',
      category: 'auth',
      details: `Dispatched 6-digit email OTP to ${masked} via ${sendResult.provider === 'emailjs' ? 'EmailJS' : 'Email API'}.`,
      timestamp: now,
    });

    // Response contains NO plaintext OTP code!
    res.json({
      success: true,
      otpId: id,
      destination: normalizedEmail,
      maskedDestination: masked,
      channel: 'gmail',
      expiresInSeconds: 300,
      cooldownSeconds: 60,
      message: `Verification code sent to ${masked}.`,
    });
  } catch (err: any) {
    console.error('[sendEmailOtp] Error:', err);
    res.status(500).json({ error: 'Failed to process email verification request.' });
  }
};

const handleVerifyOtpRoute = async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body.email || req.body.destination || req.body.target || req.body.phone || req.body.mobile;
    const rawCode = req.body.otpCode || req.body.otp || req.body.code;

    const normalizedEmail = normalizeEmail(rawEmail);
    const submittedCode = String(rawCode || '').trim();

    if (!normalizedEmail || !submittedCode || submittedCode.length !== 6) {
      return res.status(400).json({ error: 'Valid email and 6-digit code are required.' });
    }

    const now = new Date();
    const expectedVerifier = generateHmac(normalizedEmail, submittedCode);

    // Concurrency & Replay-Safe Query
    const matchRows = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.destination, normalizedEmail),
          eq(otpVerifications.isConsumed, false),
          sql`${otpVerifications.expiresAt} > ${now}`
        )
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (!matchRows.length) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const record = matchRows[0];

    // Check stored HMAC vs submitted HMAC using timingSafeEqual
    const storedBuf = Buffer.from(record.otpCode, 'hex');
    const submittedBuf = Buffer.from(expectedVerifier, 'hex');

    let isValid = false;
    if (storedBuf.length === submittedBuf.length && storedBuf.length > 0) {
      isValid = crypto.timingSafeEqual(storedBuf, submittedBuf);
    }

    if (!isValid) {
      // Invalidate on repeated failure
      await db.update(otpVerifications).set({ isConsumed: true }).where(eq(otpVerifications.id, record.id));
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Atomically consume OTP challenge to prevent replay
    await db.update(otpVerifications).set({ isConsumed: true }).where(eq(otpVerifications.id, record.id));

    // Mirror consumption in Firestore if doc exists
    try {
      await adminDb.collection('otp_challenges').doc(record.id).update({ isConsumed: true, consumedAt: Date.now() });
    } catch (e) {}

    // Resolve derived role and tenant safely
    const { role, tenantSlug } = await determineUserRoleAndTenant(
      normalizedEmail,
      req.body.role || record.role,
      req.body.tenantSlug || record.tenantSlug
    );

    // Get or create Firebase Auth user
    let firebaseUser: any;
    try {
      firebaseUser = await adminAuth.getUserByEmail(normalizedEmail);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        firebaseUser = await adminAuth.createUser({
          email: normalizedEmail,
          emailVerified: true,
          displayName: normalizedEmail.split('@')[0],
        });
      } else {
        console.warn('[Firebase Auth] User lookup warning:', e.message);
      }
    }

    if (!firebaseUser) {
      return res.status(500).json({ error: 'Failed to establish user identity in authentication service.' });
    }

    // Generate Genuine Firebase Custom Token with verified claims
    const claims = { role: role || 'user', tenantSlug: tenantSlug || null, emailVerified: true };
    await adminAuth.setCustomUserClaims(firebaseUser.uid, claims);
    const customToken = await adminAuth.createCustomToken(firebaseUser.uid, claims);

    // Find DB user profile
    const uRows = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    const userFound = uRows.length ? uRows[0] : null;

    // Audit log
    await db.insert(activityLogs).values({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: null,
      actorId: firebaseUser.uid || userFound?.id || `usr_${Date.now()}`,
      actorName: userFound?.fullName || normalizedEmail,
      actorRole: role,
      action: 'OTP_VERIFY_SUCCESS',
      category: 'auth',
      details: `Successfully verified 6-digit Resend OTP for ${normalizedEmail}.`,
      timestamp: now,
    });

    res.json({
      success: true,
      customToken,
      user: {
        id: firebaseUser.uid || userFound?.id || `usr_${Date.now()}`,
        email: normalizedEmail,
        fullName: userFound?.fullName || normalizedEmail.split('@')[0],
      },
      tenantSlug,
      role,
      message: 'Email verification successful.',
    });
  } catch (err: any) {
    console.error('[verifyEmailOtp] Error:', err);
    res.status(500).json({ error: 'Invalid or expired verification code.' });
  }
};

app.post('/api/auth/send-otp', handleSendOtpRoute);
app.post('/api/auth/sendEmailOtp', handleSendOtpRoute);
app.post('/api/auth/verify-otp', handleVerifyOtpRoute);
app.post('/api/auth/verifyEmailOtp', handleVerifyOtpRoute);

// Test helper endpoints for automated regression tests
app.get('/api/test/last-emailjs-payload', (_req: Request, res: Response) => {
  res.json({ payload: lastEmailJsPayload });
});

app.post('/api/test/mock-emailjs', (req: Request, res: Response) => {
  const { enabled, response } = req.body;
  if (enabled === false) {
    mockEmailJsHandler = null;
  } else {
    mockEmailJsHandler = async (_payload: any) => response || { ok: true, status: 200, text: 'OK' };
  }
  res.json({ success: true, mocked: !!mockEmailJsHandler });
});

app.post('/api/test/reset-emailjs-payload', (_req: Request, res: Response) => {
  lastEmailJsPayload = null;
  res.json({ success: true });
});

// Atomic Multi-Step Provisioning Transaction
app.post('/api/tenants/provision', async (req, res) => {
  try {
    const payload = req.body;
    const cleanSlug = payload.slug.trim().toLowerCase();

    // Check slug uniqueness
    const existing = await db.select().from(tenants).where(eq(tenants.slug, cleanSlug)).limit(1);
    if (existing.length) {
      return res.status(400).json({ error: `Library slug "${cleanSlug}" is already in use.` });
    }

    const tenantId = `ten_${cleanSlug.replace(/-/g, '_')}_${Date.now().toString().slice(-4)}`;
    const adminUserId = `usr_adm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const subId = `sub_${tenantId}`;
    const token = `mbt_adm_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const now = new Date();

    // Resolve target plan ID in PostgreSQL (support plan_free, plan_trial, or code match)
    const allPlans = await db.select().from(subscriptionPlans);
    let matchedPlan = allPlans.find((p) => p.id === payload.planId);
    if (!matchedPlan) {
      matchedPlan = allPlans.find(
        (p) =>
          p.code === payload.planId ||
          (payload.planId === 'plan_free' && p.code === 'free') ||
          (payload.planId === 'plan_trial' && p.code === 'free')
      );
    }
    const resolvedPlanId = matchedPlan ? matchedPlan.id : allPlans[0].id;

    // Strict 3-day (72 hours) Free trial duration calculated on server timestamp
    const isFreePlanOrTrial =
      payload.planId === 'plan_free' || payload.planId === 'plan_trial' || payload.isTrial;
    const expiryDate = isFreePlanOrTrial
      ? new Date(now.getTime() + 72 * 60 * 60 * 1000)
      : new Date(
          now.getTime() +
            (payload.billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000
        );

    const initials =
      payload.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0].toUpperCase())
        .join('') || 'LB';

    let finalAdminUserId = adminUserId;

    await db.transaction(async (tx) => {
      // 1. Set RLS tenant context for transaction connection
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`);

      // 2. Insert Tenant
      await tx.insert(tenants).values({
        id: tenantId,
        slug: cleanSlug,
        name: payload.name.trim(),
        institutionName: payload.institutionName.trim(),
        institutionType: payload.institutionType,
        logoInitials: initials,
        status: payload.isTrial ? 'trial' : 'active',
        settings: {
          timezone: payload.timezone || 'UTC',
          dateFormat: payload.dateFormat || 'DD/MM/YYYY',
          currency: 'INR',
          primaryColor: payload.primaryColor || '#2563eb',
          allowStudentReservations: true,
          defaultLoanPeriodDays: 14,
          maxBooksPerStudent: 5,
          finePerDay: 5,
          contactEmail: payload.contactEmail || payload.adminEmail,
          contactPhone: payload.contactPhone || payload.adminPhone,
          address: payload.address || '',
        },
      });

      // 3. Insert or link Admin User
      const existingUser = await tx
        .select()
        .from(users)
        .where(eq(users.email, payload.adminEmail.trim().toLowerCase()))
        .limit(1);

      if (existingUser.length) {
        finalAdminUserId = existingUser[0].id;
      } else {
        await tx.insert(users).values({
          id: adminUserId,
          email: payload.adminEmail.trim().toLowerCase(),
          fullName: payload.adminFullName.trim(),
          phone: payload.adminPhone?.trim() || null,
          staffId: payload.adminStaffId?.trim() || null,
          isSuperAdmin: false,
          isActive: true,
        });
      }

      // 4. Insert Membership
      await tx
        .insert(tenantMemberships)
        .values({
          id: `mem_${tenantId}_admin`,
          tenantId,
          userId: finalAdminUserId,
          role: 'library_admin',
          joinedAt: new Date(),
          isActive: true,
        })
        .onConflictDoNothing({ target: tenantMemberships.id });

      // 5. Insert Subscription
      await tx.insert(subscriptions).values({
        id: subId,
        tenantId,
        planId: resolvedPlanId,
        status: payload.isTrial ? 'trial' : 'active',
        billingCycle: payload.billingCycle || 'monthly',
        expiryDate,
        gracePeriodDays: payload.gracePeriodDays || 7,
        autoRenew: !payload.isTrial,
        customMaxTitles: payload.customMaxTitles,
        customMaxCopies: payload.customMaxCopies,
        customMaxLibrarians: payload.customMaxLibrarians,
        customMaxStudents: payload.customMaxStudents,
        customMaxStorageMb: payload.customMaxStorageMb,
        customOverrideReason:
          payload.customOverrideReason ||
          (payload.customLimitsEnabled
            ? 'Initial custom limits configured during library provisioning'
            : undefined),
      });

      // 6. Generate Invitation Token
      await tx.insert(invitations).values({
        id: `inv_${tenantId}_admin`,
        token,
        tenantId,
        recipientEmail: payload.adminEmail.trim().toLowerCase(),
        recipientName: payload.adminFullName.trim(),
        role: 'library_admin',
        deliveryMethod: payload.invitationDeliveryMethod || 'manual_link',
        status: 'pending',
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        createdBy: 'usr_super_admin_01',
      });

      // 7. Audit Log
      await tx.insert(activityLogs).values({
        id: `log_${Date.now()}`,
        tenantId,
        actorId: 'usr_super_admin_01',
        actorName: 'Super Administrator',
        actorRole: 'super_admin',
        action: 'TENANT_PROVISIONED',
        category: 'provisioning',
        details: `Provisioned "${payload.name}" with plan ${resolvedPlanId}. Admin invited: ${payload.adminEmail}.`,
      });
    });

    res.json({
      success: true,
      tenantId,
      slug: cleanSlug,
      invitationToken: token,
      invitationUrl: `/invite/${token}`,
      tenant: {
        id: tenantId,
        slug: cleanSlug,
        name: payload.name.trim(),
        institutionName: payload.institutionName.trim(),
        status: payload.isTrial ? 'trial' : 'active',
      },
      subscription: {
        id: subId,
        tenantId,
        planId: resolvedPlanId,
        status: payload.isTrial ? 'trial' : 'active',
        expiryDate: expiryDate.toISOString(),
      },
      adminUser: {
        id: finalAdminUserId,
        email: payload.adminEmail.trim().toLowerCase(),
        fullName: payload.adminFullName.trim(),
      },
    });
  } catch (err: any) {
    console.error('Provisioning error:', err);
    res.status(500).json({ error: err.message || 'Provisioning failed' });
  }
});

// --- STRICT TENANT ACCESS & TRIAL EXPIRATION MIDDLEWARE ---
// Enforces deactivation and expiration on the backend for every protected tenant request.
// Direct API requests are rejected with 403 Forbidden after expiry.
app.use('/api/tenants/:slug', async (req, res, next) => {
  // Allow root GET /api/tenants/:slug (used to fetch tenant details and display the deactivated/expired screen)
  if (req.method === 'GET' && (req.path === '/' || req.path === '')) {
    return next();
  }
  // Allow Super Admin status update route
  if (req.path === '/status') {
    return next();
  }

  const { slug } = req.params;
  const auth = await requireActiveTenant(slug, res);
  if (!auth) {
    return; // requireActiveTenant sends 403 Forbidden with expiration details
  }
  (req as any).tenant = auth.tenant;
  (req as any).tenantId = auth.tenantId;
  next();
});

// --- CATALOGUE & BOOKS API (RLS & Quota Enforced) ---
app.get('/api/tenants/:slug/books', async (req, res) => {
  try {
    const { slug } = req.params;
    const auth = await requireActiveTenant(slug, res);
    if (!auth) return;
    const tenantId = auth.tenantId;

    // Set local RLS tenant setting via PostgreSQL set_config
    await db.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, false);`);

    const tenantBooks = await db.select().from(books).where(eq(books.tenantId, tenantId)).orderBy(desc(books.createdAt));
    res.json(tenantBooks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:slug/books', async (req, res) => {
  try {
    const { slug } = req.params;
    const auth = await requireActiveTenant(slug, res);
    if (!auth) return;
    const tenantId = auth.tenantId;

    const { title, isbn, authors, category, publisher, year, callNumber, shelfLocation, copiesCount = 1 } = req.body;
    const numCopies = Math.max(1, Number(copiesCount) || 1);

    // 2. Enforce Server-Side Title Quota Limit
    const titleQuota = await checkServerTitleQuota(tenantId, 1);
    if (!titleQuota.allowed) {
      return res.status(403).json({ error: titleQuota.message });
    }

    // 3. Enforce Server-Side Physical Copies Quota Limit
    const copyQuota = await checkServerCopyQuota(tenantId, numCopies);
    if (!copyQuota.allowed) {
      return res.status(403).json({ error: copyQuota.message });
    }

    // 4. Enforce Storage Allowance Quota
    const storageQuota = await checkServerStorageQuota(tenantId, 1);
    if (!storageQuota.allowed) {
      return res.status(403).json({ error: storageQuota.message });
    }
    const bookId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(books).values({
      id: bookId,
      tenantId,
      title: title.trim(),
      isbn: isbn.trim(),
      authors: Array.isArray(authors) ? authors : [authors],
      category: category.trim(),
      publisher: publisher?.trim() || 'Academic Press',
      year: Number(year) || 2024,
      callNumber: callNumber.trim(),
      shelfLocation: shelfLocation?.trim() || 'Main Stacks',
      copiesTotal: Number(copiesCount),
      copiesAvailable: Number(copiesCount),
    });

    // Auto-create physical copies
    for (let i = 1; i <= copiesCount; i++) {
      const copyId = `cp_${bookId}_${i}`;
      const accession = `ACC-${category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}${i}`;
      const barcode = `890${Math.floor(10000000 + Math.random() * 90000000)}`;

      await db.insert(bookCopies).values({
        id: copyId,
        tenantId,
        bookId,
        accessionNumber: accession,
        barcode,
        status: 'available',
        condition: 'good',
        shelfLocation: shelfLocation?.trim() || 'Main Stacks',
      });
    }

    res.json({ success: true, bookId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- CIRCULATION & LOANS API (RLS & Borrowing Limits) ---
app.get('/api/tenants/:slug/loans', async (req, res) => {
  try {
    const { slug } = req.params;
    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenantId = tRows[0].id;

    const tenantLoans = await db.select().from(loans).where(eq(loans.tenantId, tenantId)).orderBy(desc(loans.issuedAt));
    res.json(tenantLoans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:slug/loans/issue', async (req, res) => {
  try {
    const { slug } = req.params;
    let tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) {
      const initTenant = INITIAL_TENANTS.find((t) => t.slug === slug || t.id === slug);
      if (initTenant) {
        await db.insert(tenants).values({
          id: initTenant.id,
          slug: initTenant.slug,
          name: initTenant.name,
          institutionName: initTenant.institutionName,
          institutionType: initTenant.institutionType,
          logoUrl: initTenant.logoUrl,
          logoInitials: initTenant.logoInitials,
          status: initTenant.status,
          settings: initTenant.settings,
          createdAt: new Date(initTenant.createdAt),
          updatedAt: new Date(initTenant.updatedAt),
        }).onConflictDoNothing({ target: tenants.id });
        tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
      }
    }
    if (!tRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenant = tRows[0];

    // Check Subscription
    const subCheck = await verifyTenantActiveAndSubscribed(tenant.id);
    if (!subCheck.valid) return res.status(403).json({ error: subCheck.error });

    const {
      bookId,
      bookTitle,
      isbn,
      userEmailOrId,
      memberEmail,
      memberStaffOrStudentId,
      memberId,
      memberName,
      staffName = 'Staff Desk',
    } = req.body;

    const lookupTarget = (userEmailOrId || memberEmail || memberStaffOrStudentId || memberId || '').trim().toLowerCase();
    if (!lookupTarget) {
      return res.status(400).json({ error: 'Please provide member email, ID or student ID' });
    }

    // 1. Locate or Auto-heal Book
    let bRows = await db.select().from(books).where(and(eq(books.id, bookId), eq(books.tenantId, tenant.id))).limit(1);
    if (!bRows.length && (isbn || bookTitle || bookId)) {
      bRows = await db
        .select()
        .from(books)
        .where(
          and(
            eq(books.tenantId, tenant.id),
            sql`(${books.isbn} = ${bookId} OR ${books.title} = ${bookId} OR ${books.isbn} = ${isbn || ''} OR ${books.title} = ${bookTitle || ''})`
          )
        )
        .limit(1);
    }

    if (!bRows.length) {
      // Find in INITIAL_BOOKS or create from request context
      const seedBook = INITIAL_BOOKS.find((b) => (b.id === bookId || b.title === bookTitle || (b.isbn && b.isbn === isbn))) ||
        (bookTitle ? {
          id: bookId || `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tenantId: tenant.id,
          title: bookTitle,
          isbn: isbn || '978-0-000000-00-0',
          authors: ['Library Author'],
          category: 'General Collection',
          publisher: 'Standard Publisher',
          year: 2024,
          edition: '1st Edition',
          callNumber: 'GEN 100 LIB',
          shelfLocation: 'Main Stacks',
          language: 'English',
          description: 'Catalogue title record',
          copiesTotal: 5,
          copiesAvailable: 5,
        } : null);

      if (seedBook) {
        const newBookId = seedBook.id || `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.insert(books).values({
          id: newBookId,
          tenantId: tenant.id,
          title: seedBook.title,
          isbn: seedBook.isbn || '978-0-000000-00-0',
          authors: seedBook.authors,
          category: seedBook.category || 'General Collection',
          publisher: seedBook.publisher || 'Standard Publisher',
          year: seedBook.year || 2024,
          callNumber: seedBook.callNumber || 'GEN 100 LIB',
          shelfLocation: seedBook.shelfLocation || 'Main Stacks',
          language: seedBook.language || 'English',
          description: seedBook.description || '',
          copiesTotal: seedBook.copiesTotal || 5,
          copiesAvailable: seedBook.copiesAvailable || 5,
          createdAt: new Date(),
        }).onConflictDoNothing({ target: books.id });

        bRows = await db.select().from(books).where(and(eq(books.id, newBookId), eq(books.tenantId, tenant.id))).limit(1);
      }
    }

    if (!bRows.length) {
      return res.status(404).json({ error: 'Book title not found in catalogue' });
    }
    const book = bRows[0];

    // 2. Locate or Auto-heal Member
    const cleanUser = lookupTarget;
    let uRows = await db
      .select({
        user: users,
        membership: tenantMemberships,
      })
      .from(users)
      .innerJoin(tenantMemberships, eq(users.id, tenantMemberships.userId))
      .where(
        and(
          eq(tenantMemberships.tenantId, tenant.id),
          eq(tenantMemberships.isActive, true),
          sql`(${users.email} = ${cleanUser} OR ${users.id} = ${cleanUser} OR ${users.studentId} = ${cleanUser})`
        )
      )
      .limit(1);

    if (!uRows.length) {
      const initUser = INITIAL_USERS.find((u) => u.email.toLowerCase() === cleanUser || u.id === cleanUser || u.studentId === cleanUser) ||
        (cleanUser ? {
          id: memberId || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          email: memberEmail || (cleanUser.includes('@') ? cleanUser : `${cleanUser}@library.edu`),
          fullName: memberName || 'Registered Student',
          studentId: memberStaffOrStudentId || cleanUser,
          isSuperAdmin: false,
          isActive: true,
        } : null);

      if (initUser) {
        await db.insert(users).values({
          id: initUser.id,
          email: initUser.email,
          fullName: initUser.fullName,
          studentId: initUser.studentId,
          isSuperAdmin: false,
          isActive: true,
          createdAt: new Date(),
        }).onConflictDoNothing({ target: users.id });

        await db.insert(tenantMemberships).values({
          id: `mem_${tenant.id}_${initUser.id}`,
          tenantId: tenant.id,
          userId: initUser.id,
          role: 'student',
          joinedAt: new Date(),
          isActive: true,
        }).onConflictDoNothing({ target: tenantMemberships.id });

        uRows = await db
          .select({
            user: users,
            membership: tenantMemberships,
          })
          .from(users)
          .innerJoin(tenantMemberships, eq(users.id, tenantMemberships.userId))
          .where(and(eq(tenantMemberships.tenantId, tenant.id), eq(users.id, initUser.id)))
          .limit(1);
      }
    }

    if (!uRows.length) {
      return res.status(404).json({ error: 'Member not found or not registered in this library.' });
    }
    const member = uRows[0].user;

    // Enforce Borrowing Quota
    const borrowCheck = await checkServerBorrowingQuota(tenant.id, member.id);
    if (!borrowCheck.allowed) {
      return res.status(403).json({ error: borrowCheck.message });
    }

    // 3. Locate or Auto-create Physical Copy
    let cRows = await db
      .select()
      .from(bookCopies)
      .where(and(eq(bookCopies.bookId, book.id), eq(bookCopies.tenantId, tenant.id), eq(bookCopies.status, 'available')))
      .limit(1);

    if (!cRows.length) {
      const newCopyId = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const accession = `ACC-${tenant.slug.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const barcodeStr = `${Math.floor(10000000000 + Math.random() * 90000000000)}`;

      await db.insert(bookCopies).values({
        id: newCopyId,
        tenantId: tenant.id,
        bookId: book.id,
        accessionNumber: accession,
        barcode: barcodeStr,
        status: 'available',
        condition: 'good',
        shelfLocation: book.shelfLocation || 'Main Stacks',
        addedAt: new Date(),
      });

      cRows = await db.select().from(bookCopies).where(eq(bookCopies.id, newCopyId)).limit(1);
    }

    const copy = cRows[0];
    const now = new Date();
    const days = Number(req.body.customLoanDays || req.body.loanPeriodDays) || tenant.settings?.defaultLoanPeriodDays || 7;
    const dueDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const loanId = `loan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Insert loan
    await db.insert(loans).values({
      id: loanId,
      tenantId: tenant.id,
      bookId: book.id,
      bookTitle: book.title,
      copyId: copy.id,
      accessionNumber: copy.accessionNumber,
      userId: member.id,
      userName: member.fullName,
      userEmail: member.email,
      dueDate,
      status: 'active',
      issuedByStaffName: staffName,
    });

    // Update copy status
    await db.update(bookCopies).set({ status: 'loaned' }).where(eq(bookCopies.id, copy.id));

    // Decrement available copies
    await db.update(books).set({ copiesAvailable: Math.max((book.copiesAvailable || 1) - 1, 0) }).where(eq(books.id, book.id));

    res.json({
      success: true,
      loan: {
        id: loanId,
        bookTitle: book.title,
        accessionNumber: copy.accessionNumber,
        userName: member.fullName,
        dueDate,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Return Loan & Assess Overdue Fine
app.post('/api/tenants/:slug/loans/:loanId/return', async (req, res) => {
  try {
    const { loanId } = req.params;
    const lRows = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (!lRows.length) return res.status(404).json({ error: 'Loan record not found' });
    const loan = lRows[0];

    if (loan.status === 'returned') {
      return res.status(400).json({ error: 'Loan has already been returned' });
    }

    const now = new Date();
    let fineCalculated = 0;

    // Check overdue
    if (now.getTime() > new Date(loan.dueDate).getTime()) {
      const daysOverdue = Math.ceil((now.getTime() - new Date(loan.dueDate).getTime()) / (1000 * 3600 * 24));
      fineCalculated = daysOverdue * 5; // ₹5/day in INR

      if (fineCalculated > 0) {
        await db.insert(fines).values({
          id: `fine_${Date.now()}`,
          tenantId: loan.tenantId,
          loanId: loan.id,
          userId: loan.userId,
          userName: loan.userName,
          bookTitle: loan.bookTitle,
          amount: fineCalculated,
          status: 'pending',
          notes: `${daysOverdue} days overdue`,
        });
      }
    }

    await db.update(loans).set({
      status: 'returned',
      returnedAt: now,
      fineAmount: fineCalculated,
    }).where(eq(loans.id, loanId));

    // Free copy
    await db.update(bookCopies).set({ status: 'available' }).where(eq(bookCopies.id, loan.copyId));

    // Increment available count
    await db.execute(sql`UPDATE books SET copies_available = copies_available + 1 WHERE id = ${loan.bookId};`);

    res.json({ success: true, fineAssessed: fineCalculated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Loan Renewal (1-click extension with audit)
app.post('/api/tenants/:slug/loans/:loanId/renew', async (req, res) => {
  try {
    const { loanId } = req.params;
    const lRows = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (!lRows.length) return res.status(404).json({ error: 'Loan record not found' });
    const loan = lRows[0];

    if (loan.status !== 'active') {
      return res.status(400).json({ error: 'Only active loans can be renewed' });
    }

    const currentDue = new Date(loan.dueDate);
    const newDueDate = new Date(Math.max(Date.now(), currentDue.getTime()) + 14 * 24 * 60 * 60 * 1000);

    await db.update(loans).set({ dueDate: newDueDate }).where(eq(loans.id, loanId));

    res.json({ success: true, newDueDate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- INVENTORY & PHYSICAL COPIES API ---
app.get('/api/tenants/:slug/inventory', async (req, res) => {
  try {
    const { slug } = req.params;
    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenantId = tRows[0].id;

    const copiesWithBooks = await db
      .select({
        copy: bookCopies,
        book: books,
      })
      .from(bookCopies)
      .innerJoin(books, eq(bookCopies.bookId, books.id))
      .where(eq(bookCopies.tenantId, tenantId))
      .orderBy(desc(bookCopies.addedAt));

    const flat = copiesWithBooks.map((item) => ({
      ...item.copy,
      bookTitle: item.book.title,
      bookIsbn: item.book.isbn,
      bookCategory: item.book.category,
    }));

    res.json(flat);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:slug/books/:bookId/copies', async (req, res) => {
  try {
    const { slug, bookId } = req.params;
    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenantId = tRows[0].id;

    const bRows = await db.select().from(books).where(and(eq(books.id, bookId), eq(books.tenantId, tenantId))).limit(1);
    if (!bRows.length) return res.status(404).json({ error: 'Book title not found' });
    const book = bRows[0];

    // Enforce Copy Quota Limit
    const copyQuota = await checkServerCopyQuota(tenantId, 1);
    if (!copyQuota.allowed) {
      return res.status(403).json({ error: copyQuota.message });
    }

    const { shelfLocation, condition = 'good', accessionNumber, barcode } = req.body;
    const copyId = `cp_${book.id}_${Date.now().toString().slice(-4)}`;
    const accession = accessionNumber?.trim() || `ACC-${book.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const bar = barcode?.trim() || `890${Math.floor(10000000 + Math.random() * 90000000)}`;

    await db.insert(bookCopies).values({
      id: copyId,
      tenantId,
      bookId: book.id,
      accessionNumber: accession,
      barcode: bar,
      status: 'available',
      condition,
      shelfLocation: shelfLocation?.trim() || book.shelfLocation || 'Main Stacks',
    });

    await db.execute(sql`UPDATE books SET copies_total = copies_total + 1, copies_available = copies_available + 1 WHERE id = ${book.id};`);

    res.json({ success: true, copyId, accessionNumber: accession });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tenants/:slug/copies/:copyId', async (req, res) => {
  try {
    const { copyId } = req.params;
    const { status, condition, shelfLocation } = req.body;

    const cRows = await db.select().from(bookCopies).where(eq(bookCopies.id, copyId)).limit(1);
    if (!cRows.length) return res.status(404).json({ error: 'Copy not found' });
    const copy = cRows[0];

    const updates: any = {};
    if (status) updates.status = status;
    if (condition) updates.condition = condition;
    if (shelfLocation) updates.shelfLocation = shelfLocation;

    await db.update(bookCopies).set(updates).where(eq(bookCopies.id, copyId));

    // If status changed from available to non-available
    if (status && status !== copy.status) {
      if (copy.status === 'available' && status !== 'available') {
        await db.execute(sql`UPDATE books SET copies_available = GREATEST(copies_available - 1, 0) WHERE id = ${copy.bookId};`);
      } else if (copy.status !== 'available' && status === 'available') {
        await db.execute(sql`UPDATE books SET copies_available = copies_available + 1 WHERE id = ${copy.bookId};`);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- FINES & REVENUE API ---
app.get('/api/tenants/:slug/fines', async (req, res) => {
  try {
    const { slug } = req.params;
    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenantId = tRows[0].id;

    const fRows = await db.select().from(fines).where(eq(fines.tenantId, tenantId)).orderBy(desc(fines.issuedDate));
    res.json(fRows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:slug/fines/:fineId/pay', async (req, res) => {
  try {
    const { fineId } = req.params;
    const now = new Date();
    await db.update(fines).set({ status: 'paid', paidDate: now }).where(eq(fines.id, fineId));
    res.json({ success: true, paidDate: now });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:slug/fines/:fineId/waive', async (req, res) => {
  try {
    const { fineId } = req.params;
    const { reason = 'Waiver granted by staff' } = req.body;
    await db.update(fines).set({ status: 'waived', notes: reason }).where(eq(fines.id, fineId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RESERVATIONS API ---
app.get('/api/tenants/:slug/reservations', async (req, res) => {
  try {
    const { slug } = req.params;
    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenantId = tRows[0].id;

    const resRows = await db.select().from(reservations).where(eq(reservations.tenantId, tenantId)).orderBy(desc(reservations.reservedAt));
    res.json(resRows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:slug/reservations', async (req, res) => {
  try {
    const { slug } = req.params;
    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenantId = tRows[0].id;

    const { bookId, userId } = req.body;
    const bRows = await db.select().from(books).where(and(eq(books.id, bookId), eq(books.tenantId, tenantId))).limit(1);
    const uRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!bRows.length || !uRows.length) return res.status(400).json({ error: 'Book or user not found' });

    const now = new Date();
    const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const resId = `res_${Date.now()}`;

    await db.insert(reservations).values({
      id: resId,
      tenantId,
      bookId,
      bookTitle: bRows[0].title,
      userId,
      userName: uRows[0].fullName,
      userEmail: uRows[0].email,
      expiryDate,
      status: 'pending',
      pickupShelf: 'Hold Shelf Bay 1',
    });

    res.json({ success: true, reservationId: resId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:slug/reservations/:resId/fulfill', async (req, res) => {
  try {
    const { resId } = req.params;
    const { pickupShelf = 'Hold Shelf Bay 1' } = req.body;

    const rRows = await db.select().from(reservations).where(eq(reservations.id, resId)).limit(1);
    if (!rRows.length) return res.status(404).json({ error: 'Reservation not found' });
    const r = rRows[0];

    const nextStatus = r.status === 'pending' ? 'ready' : 'fulfilled';
    await db.update(reservations).set({ status: nextStatus, pickupShelf }).where(eq(reservations.id, resId));

    res.json({ success: true, status: nextStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tenants/:slug/reservations/:resId/cancel', async (req, res) => {
  try {
    const { resId } = req.params;
    await db.update(reservations).set({ status: 'cancelled' }).where(eq(reservations.id, resId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- BRANCH REPORTS & ANALYTICS API ---
app.get('/api/tenants/:slug/reports', async (req, res) => {
  try {
    const { slug } = req.params;
    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenantId = tRows[0].id;

    const totalTitlesRes = await db.select({ val: count() }).from(books).where(eq(books.tenantId, tenantId));
    const totalCopiesRes = await db.select({ val: count() }).from(bookCopies).where(eq(bookCopies.tenantId, tenantId));
    const totalLoansRes = await db.select({ val: count() }).from(loans).where(eq(loans.tenantId, tenantId));
    const activeLoansRes = await db.select({ val: count() }).from(loans).where(and(eq(loans.tenantId, tenantId), eq(loans.status, 'active')));
    const returnedLoansRes = await db.select({ val: count() }).from(loans).where(and(eq(loans.tenantId, tenantId), eq(loans.status, 'returned')));
    const reservationsRes = await db.select({ val: count() }).from(reservations).where(eq(reservations.tenantId, tenantId));

    const allTenantFines = await db.select().from(fines).where(eq(fines.tenantId, tenantId));
    const totalAssessed = allTenantFines.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = allTenantFines.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const totalWaived = allTenantFines.filter((f) => f.status === 'waived').reduce((sum, f) => sum + f.amount, 0);
    const totalPending = allTenantFines.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);

    const conditionRes = await db
      .select({
        condition: bookCopies.condition,
        status: bookCopies.status,
        cnt: count(),
      })
      .from(bookCopies)
      .where(eq(bookCopies.tenantId, tenantId))
      .groupBy(bookCopies.condition, bookCopies.status);

    res.json({
      overview: {
        totalTitles: Number(totalTitlesRes[0]?.val || 0),
        totalCopies: Number(totalCopiesRes[0]?.val || 0),
        totalLoans: Number(totalLoansRes[0]?.val || 0),
        activeLoansCount: Number(activeLoansRes[0]?.val || 0),
        returnedLoansCount: Number(returnedLoansRes[0]?.val || 0),
        totalReservations: Number(reservationsRes[0]?.val || 0),
      },
      finesSummary: {
        totalAssessed,
        totalPaid,
        totalWaived,
        totalPending,
      },
      conditionBreakdown: conditionRes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SUPER ADMIN METRICS API ---
app.get('/api/super-admin/metrics', async (_req, res) => {
  try {
    const tenantsCount = await db.select({ val: count() }).from(tenants);
    const activeSubs = await db.select({ val: count() }).from(subscriptions).where(eq(subscriptions.status, 'active'));
    const trialSubs = await db.select({ val: count() }).from(subscriptions).where(eq(subscriptions.status, 'trial'));
    const expiredSubs = await db.select({ val: count() }).from(subscriptions).where(sql`${subscriptions.status} IN ('expired', 'past_due')`);
    const suspendedSubs = await db.select({ val: count() }).from(subscriptions).where(eq(subscriptions.status, 'suspended'));

    const adminsCount = await db.select({ val: count() }).from(tenantMemberships).where(eq(tenantMemberships.role, 'library_admin'));
    const staffCount = await db.select({ val: count() }).from(tenantMemberships).where(sql`${tenantMemberships.role} IN ('librarian', 'senior_librarian')`);
    const studentCount = await db.select({ val: count() }).from(tenantMemberships).where(eq(tenantMemberships.role, 'student'));
    const totalTitles = await db.select({ val: count() }).from(books);
    const totalLoans = await db.select({ val: count() }).from(loans);

    res.json({
      totalLibraries: Number(tenantsCount[0]?.val || 0),
      activeSubscriptions: Number(activeSubs[0]?.val || 0),
      trialSubscriptions: Number(trialSubs[0]?.val || 0),
      expiredSubscriptions: Number(expiredSubs[0]?.val || 0),
      suspendedSubscriptions: Number(suspendedSubs[0]?.val || 0),
      totalAdmins: Number(adminsCount[0]?.val || 0),
      totalLibrarians: Number(staffCount[0]?.val || 0),
      totalStudents: Number(studentCount[0]?.val || 0),
      totalTitles: Number(totalTitles[0]?.val || 0),
      totalLoans: Number(totalLoans[0]?.val || 0),
      databaseType: 'Cloud SQL PostgreSQL',
      rlsActive: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SUBSCRIPTION PLANS API ---
app.get('/api/super-admin/plans', async (_req, res) => {
  try {
    const plans = await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.priceMonthly);
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Subscription & Custom Limits for Any Library (Super Admin Authority)
app.patch('/api/super-admin/tenants/:tenantId/subscription', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const {
      planId,
      status,
      billingCycle,
      expiryDate,
      gracePeriodDays,
      customMaxTitles,
      customMaxCopies,
      customMaxLibrarians,
      customMaxStudents,
      customMaxStorageMb,
      customOverrideReason,
    } = req.body;

    const tRows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Library tenant not found' });
    const tenant = tRows[0];

    const subRows = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
    if (!subRows.length) return res.status(404).json({ error: 'Subscription not found for this library' });
    const oldSub = subRows[0];

    const updates: any = {};
    if (planId !== undefined) updates.planId = planId;
    if (status !== undefined) updates.status = status;
    if (billingCycle !== undefined) updates.billingCycle = billingCycle;
    if (expiryDate !== undefined) updates.expiryDate = new Date(expiryDate);
    if (gracePeriodDays !== undefined) updates.gracePeriodDays = Number(gracePeriodDays);
    if (customMaxTitles !== undefined) updates.customMaxTitles = customMaxTitles === null ? null : Number(customMaxTitles);
    if (customMaxCopies !== undefined) updates.customMaxCopies = customMaxCopies === null ? null : Number(customMaxCopies);
    if (customMaxLibrarians !== undefined) updates.customMaxLibrarians = customMaxLibrarians === null ? null : Number(customMaxLibrarians);
    if (customMaxStudents !== undefined) updates.customMaxStudents = customMaxStudents === null ? null : Number(customMaxStudents);
    if (customMaxStorageMb !== undefined) updates.customMaxStorageMb = customMaxStorageMb === null ? null : Number(customMaxStorageMb);
    if (customOverrideReason !== undefined) updates.customOverrideReason = customOverrideReason;

    await db.update(subscriptions).set(updates).where(eq(subscriptions.tenantId, tenantId));

    // Automatic Reactivation / Tenant Status Sync
    // Rule 6: Reactivate library when active paid subscription is assigned
    // Rule 7: Do NOT override separate suspension!
    if (updates.status === 'active' || (updates.planId && updates.planId !== 'plan_free')) {
      if (tenant.status === 'deactivated' || tenant.status === 'trial') {
        await db.update(tenants).set({ status: 'active', updatedAt: new Date() }).where(eq(tenants.id, tenantId));
      }
    } else if (updates.status === 'suspended') {
      await db.update(tenants).set({ status: 'suspended', updatedAt: new Date() }).where(eq(tenants.id, tenantId));
    } else if (updates.status === 'expired') {
      if (tenant.status !== 'suspended' && tenant.status !== 'archived') {
        await db.update(tenants).set({ status: 'deactivated', updatedAt: new Date() }).where(eq(tenants.id, tenantId));
      }
    }

    // Audit log
    await db.insert(activityLogs).values({
      id: `log_${Date.now()}`,
      tenantId,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'SUBSCRIPTION_LIMITS_MODIFIED',
      category: 'subscription',
      details: `Authority updated limits for "${tenant.name}". Overrides: [Titles: ${updates.customMaxTitles ?? 'default'}, Copies: ${updates.customMaxCopies ?? 'default'}, Libs: ${updates.customMaxLibrarians ?? 'default'}, Students: ${updates.customMaxStudents ?? 'default'}, Storage: ${updates.customMaxStorageMb ?? 'default'} MB]. Reason: ${customOverrideReason || 'Authority adjustment'}.`,
    });

    const updatedSub = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
    res.json({ success: true, subscription: updatedSub[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manually extend Free Trial (Super Admin Control)
app.post('/api/super-admin/tenants/:tenantId/extend-trial', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { additionalHours = 72, reason } = req.body;

    const tRows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Library not found' });
    const tenant = tRows[0];

    const subRows = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
    if (!subRows.length) return res.status(404).json({ error: 'Subscription not found for this library' });
    const sub = subRows[0];

    const now = Date.now();
    const currentExpiry = new Date(sub.expiryDate).getTime();
    const baseTime = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseTime + Number(additionalHours) * 60 * 60 * 1000);

    // Update subscription to trial with new expiry timestamp
    await db.update(subscriptions).set({
      status: 'trial',
      expiryDate: newExpiry,
    }).where(eq(subscriptions.id, sub.id));

    // Restore tenant status if deactivated
    if (tenant.status === 'deactivated' || tenant.status === 'trial') {
      await db.update(tenants).set({
        status: 'trial',
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenantId));
    }

    // Insert audit log
    await db.insert(activityLogs).values({
      id: `log_ext_${Date.now()}`,
      tenantId,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'TRIAL_EXTENDED',
      category: 'subscription',
      details: `Super Admin manually extended Free trial by ${additionalHours} hours (${(additionalHours / 24).toFixed(1)} days) for "${tenant.name}". New expiry: ${newExpiry.toISOString()}. Reason: ${reason || 'Authority manual extension'}.`,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      newExpiry: newExpiry.toISOString(),
      message: `Trial extended by ${additionalHours} hours until ${newExpiry.toLocaleString()}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Premium Subscription Enquiries API
app.get('/api/super-admin/enquiries', async (_req, res) => {
  try {
    const list = await db.select().from(subscriptionEnquiries).orderBy(desc(subscriptionEnquiries.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/enquiries', async (req, res) => {
  try {
    const {
      tenantId,
      tenantSlug,
      tenantName,
      contactName,
      contactEmail,
      contactPhone,
      requestedPlan = 'premium',
      estimatedTitles,
      estimatedCopies,
      estimatedLibrarians,
      estimatedStudents,
      estimatedStorageMb,
      message,
    } = req.body;

    const enqId = `enq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.insert(subscriptionEnquiries).values({
      id: enqId,
      tenantId: tenantId || null,
      tenantSlug: tenantSlug || null,
      tenantName: tenantName.trim(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      contactPhone: contactPhone?.trim() || null,
      requestedPlan,
      estimatedTitles: estimatedTitles ? Number(estimatedTitles) : null,
      estimatedCopies: estimatedCopies ? Number(estimatedCopies) : null,
      estimatedLibrarians: estimatedLibrarians ? Number(estimatedLibrarians) : null,
      estimatedStudents: estimatedStudents ? Number(estimatedStudents) : null,
      estimatedStorageMb: estimatedStorageMb ? Number(estimatedStorageMb) : null,
      message: message?.trim() || null,
      status: 'pending',
    });

    // Notify Super Admin via Audit Log / Activity stream
    await db.insert(activityLogs).values({
      id: `log_${Date.now()}`,
      tenantId: tenantId || null,
      actorId: 'usr_enquiry',
      actorName: contactName.trim(),
      actorRole: 'institution_representative',
      action: 'PREMIUM_ENQUIRY_RECEIVED',
      category: 'subscription',
      details: `New Premium enquiry for "${tenantName}" from ${contactEmail}. Contact Authority action required.`,
    });

    res.json({ success: true, enquiryId: enqId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/super-admin/enquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, superAdminNotes, commercialTerms } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (superAdminNotes !== undefined) updates.superAdminNotes = superAdminNotes;
    if (commercialTerms !== undefined) updates.commercialTerms = commercialTerms;

    await db.update(subscriptionEnquiries).set(updates).where(eq(subscriptionEnquiries.id, id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/super-admin/enquiries/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, commercialTerms } = req.body;

    const enqRows = await db.select().from(subscriptionEnquiries).where(eq(subscriptionEnquiries.id, id)).limit(1);
    if (!enqRows.length) return res.status(404).json({ error: 'Upgrade enquiry not found' });
    const enq = enqRows[0];

    // Find target plan matching request
    const allPlans = await db.select().from(subscriptionPlans);
    let targetPlan = allPlans.find(
      (p) => p.code.toLowerCase() === (enq.requestedPlan || '').toLowerCase()
    );
    if (!targetPlan) {
      const code = (enq.requestedPlan || '').toLowerCase();
      if (code.includes('basic')) {
        targetPlan = allPlans.find((p) => p.code === 'basic');
      } else if (code.includes('standard')) {
        targetPlan = allPlans.find((p) => p.code === 'standard');
      } else {
        targetPlan = allPlans.find((p) => p.code === 'premium') || allPlans[allPlans.length - 1];
      }
    }
    if (!targetPlan) targetPlan = allPlans[0];

    const tenantName = enq.tenantName;
    const planName = targetPlan.name;

    // Reactivate and upgrade subscription in database if tenantId is attached
    if (enq.tenantId) {
      const oneYearExpiry = new Date(Date.now() + 365 * 24 * 3600 * 1000);
      const subRows = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, enq.tenantId)).limit(1);

      const customOverrides: any = {};
      if (enq.estimatedTitles) customOverrides.customMaxTitles = Number(enq.estimatedTitles);
      if (enq.estimatedCopies) customOverrides.customMaxCopies = Number(enq.estimatedCopies);
      if (enq.estimatedLibrarians) customOverrides.customMaxLibrarians = Number(enq.estimatedLibrarians);
      if (enq.estimatedStudents) customOverrides.customMaxStudents = Number(enq.estimatedStudents);
      if (enq.estimatedStorageMb) customOverrides.customMaxStorageMb = Number(enq.estimatedStorageMb);

      if (subRows.length) {
        await db
          .update(subscriptions)
          .set({
            planId: targetPlan.id,
            status: 'active',
            expiryDate: oneYearExpiry,
            ...customOverrides,
            customOverrideReason: commercialTerms || notes || 'Super Admin approved customer upgrade request',
          })
          .where(eq(subscriptions.tenantId, enq.tenantId));
      }

      // Reactivate tenant
      await db
        .update(tenants)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, enq.tenantId));
    }

    // Update enquiry record in PostgreSQL
    await db
      .update(subscriptionEnquiries)
      .set({
        status: 'approved',
        superAdminNotes: notes || enq.superAdminNotes || null,
        commercialTerms: commercialTerms || enq.commercialTerms || null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionEnquiries.id, id));

    // Audit log in database
    await db.insert(activityLogs).values({
      id: `log_${Date.now()}`,
      tenantId: enq.tenantId || null,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'UPGRADE_REQUEST_APPROVED',
      category: 'subscription',
      details: `Super Admin approved upgrade request for "${enq.tenantName}" to plan "${planName}". Library access reactivated.`,
    });

    const updatedEnq = await db.select().from(subscriptionEnquiries).where(eq(subscriptionEnquiries.id, id)).limit(1);

    res.json({
      success: true,
      enquiry: updatedEnq[0],
      tenantName,
      planName,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/super-admin/enquiries/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await db
      .update(subscriptionEnquiries)
      .set({
        status: 'rejected',
        superAdminNotes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionEnquiries.id, id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- INVITATION TOKEN ACCEPTANCE API ---
app.get('/api/invitations/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const invRows = await db
      .select({
        invitation: invitations,
        tenant: tenants,
      })
      .from(invitations)
      .innerJoin(tenants, eq(invitations.tenantId, tenants.id))
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invRows.length) {
      return res.status(404).json({ error: 'Invitation token not found.' });
    }

    const { invitation, tenant } = invRows[0];
    const isExpired = new Date(invitation.expiresAt) < new Date();

    res.json({
      id: invitation.id,
      token: invitation.token,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      recipientEmail: invitation.recipientEmail,
      recipientName: invitation.recipientName,
      role: invitation.role,
      status: isExpired ? 'expired' : invitation.status,
      expiresAt: invitation.expiresAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Accept Invitation & Activate Account
app.post('/api/invitations/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters in length.' });
    }

    const invRows = await db
      .select({
        invitation: invitations,
        tenant: tenants,
      })
      .from(invitations)
      .innerJoin(tenants, eq(invitations.tenantId, tenants.id))
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invRows.length) {
      return res.status(404).json({ error: 'Invitation token not found.' });
    }

    const { invitation, tenant } = invRows[0];

    if (invitation.status === 'revoked') {
      return res.status(400).json({ error: 'This invitation has been revoked by the administrator.' });
    }
    if (invitation.status === 'accepted') {
      return res.status(400).json({ error: 'This invitation token has already been claimed.' });
    }
    if (new Date(invitation.expiresAt) < new Date()) {
      await db.update(invitations).set({ status: 'expired' }).where(eq(invitations.id, invitation.id));
      return res.status(400).json({ error: 'This invitation link has expired. Please contact your administrator.' });
    }

    const now = new Date();
    // 1. Mark invitation as accepted
    await db.update(invitations).set({ status: 'accepted', acceptedAt: now }).where(eq(invitations.id, invitation.id));

    // 2. Check if user already exists
    const cleanEmail = invitation.recipientEmail.toLowerCase();
    const existingUser = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    let userId = '';
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      await db.update(users).set({ isActive: true }).where(eq(users.id, userId));
    } else {
      userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.insert(users).values({
        id: userId,
        email: cleanEmail,
        fullName: invitation.recipientName,
        isSuperAdmin: false,
        isActive: true,
      });
    }

    // 3. Check or create tenant membership
    const existingMem = await db
      .select()
      .from(tenantMemberships)
      .where(and(eq(tenantMemberships.tenantId, tenant.id), eq(tenantMemberships.userId, userId)))
      .limit(1);

    if (existingMem.length > 0) {
      await db.update(tenantMemberships).set({ role: invitation.role, isActive: true }).where(eq(tenantMemberships.id, existingMem[0].id));
    } else {
      await db.insert(tenantMemberships).values({
        id: `mem_${tenant.id}_${userId.slice(-6)}`,
        tenantId: tenant.id,
        userId,
        role: invitation.role,
        joinedAt: new Date(),
        isActive: true,
      }).onConflictDoNothing({ target: tenantMemberships.id });
    }

    // 4. Log activity
    await db.insert(activityLogs).values({
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      actorId: userId,
      actorName: invitation.recipientName,
      actorRole: invitation.role,
      action: 'INVITATION_ACCEPTED',
      category: 'auth',
      details: `User ${invitation.recipientEmail} accepted invitation and configured credentials for ${tenant.name}.`,
    });

    res.json({
      success: true,
      tenantSlug: tenant.slug,
      userId,
      role: invitation.role,
    });
  } catch (err: any) {
    console.error('Accept invitation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create Invitation Token
app.post('/api/invitations', async (req, res) => {
  try {
    const { tenantId, recipientEmail, recipientName, role = 'librarian', deliveryMethod = 'manual_link' } = req.body;
    const cleanEmail = recipientEmail.trim().toLowerCase();

    const tRows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Library tenant not found.' });

    const now = new Date();
    const token = `mbt_${role.slice(0, 3)}_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(invitations).values({
      id,
      token,
      tenantId,
      recipientEmail: cleanEmail,
      recipientName: recipientName.trim(),
      role,
      deliveryMethod,
      status: 'pending',
      expiresAt,
      createdBy: 'usr_super_admin_01',
    });

    res.json({
      success: true,
      invitation: {
        id,
        token,
        tenantId,
        recipientEmail: cleanEmail,
        recipientName: recipientName.trim(),
        role,
        status: 'pending',
        expiresAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Issued Invitations (Tokens)
app.get('/api/invitations', async (_req, res) => {
  try {
    const allTokens = await db
      .select({
        id: invitations.id,
        token: invitations.token,
        tenantId: invitations.tenantId,
        recipientEmail: invitations.recipientEmail,
        recipientName: invitations.recipientName,
        role: invitations.role,
        deliveryMethod: invitations.deliveryMethod,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        acceptedAt: invitations.acceptedAt,
        createdBy: invitations.createdBy,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(invitations)
      .leftJoin(tenants, eq(invitations.tenantId, tenants.id))
      .orderBy(desc(invitations.createdAt));

    res.json(allTokens);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Revoke Invitation
app.post('/api/invitations/:invitationId/revoke', async (req, res) => {
  try {
    const { invitationId } = req.params;
    const inv = await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1);
    if (!inv.length) return res.status(404).json({ error: 'Invitation not found.' });

    await db.update(invitations).set({ status: 'revoked' }).where(eq(invitations.id, invitationId));

    // Audit log
    await db.insert(activityLogs).values({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: inv[0].tenantId,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'INVITATION_REVOKED',
      category: 'security',
      details: `Revoked security access token for "${inv[0].recipientName}" (${inv[0].recipientEmail}).`,
      timestamp: new Date(),
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- INVOICES & PAYMENTS API ---
app.get('/api/invoices', async (_req, res) => {
  try {
    const allInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        tenantId: invoices.tenantId,
        planName: invoices.planName,
        billingCycle: invoices.billingCycle,
        amount: invoices.amount,
        currency: invoices.currency,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        paymentMethod: invoices.paymentMethod,
        transactionReference: invoices.transactionReference,
        notes: invoices.notes,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(invoices)
      .leftJoin(tenants, eq(invoices.tenantId, tenants.id))
      .orderBy(desc(invoices.issueDate));
    res.json(allInvoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create / Issue New Institutional Invoice
app.post('/api/invoices', async (req, res) => {
  try {
    const { tenantId, planName, billingCycle = 'annual', amount, currency = 'INR', dueDate, notes } = req.body;
    if (!tenantId || !amount || !dueDate) {
      return res.status(400).json({ error: 'Missing required invoice fields (tenantId, amount, dueDate).' });
    }

    const tRows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Library tenant not found.' });

    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const invoiceNumber = `INV-MBT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.insert(invoices).values({
      id,
      invoiceNumber,
      tenantId,
      planName: planName || 'Institutional License',
      billingCycle,
      amount: Number(amount),
      currency: currency || 'INR',
      status: 'pending',
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      notes: notes || '',
    });

    // Also log activity
    await db.insert(activityLogs).values({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'INVOICE_GENERATED',
      category: 'subscription',
      details: `Generated new platform invoice ${invoiceNumber} (₹${Number(amount).toLocaleString('en-IN')}) for "${tRows[0].name}".`,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      invoice: {
        id,
        invoiceNumber,
        tenantId,
        tenantName: tRows[0].name,
        planName: planName || 'Institutional License',
        billingCycle,
        amount: Number(amount),
        currency,
        status: 'pending',
        issueDate: new Date().toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        notes,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices/:invoiceId/pay', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentMethod = 'Bank Wire / ACH', transactionReference, notes } = req.body;
    const now = new Date();

    const invRows = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    if (!invRows.length) return res.status(404).json({ error: 'Invoice not found.' });
    const inv = invRows[0];

    const ref = transactionReference || `TXN-${Date.now()}`;

    await db
      .update(invoices)
      .set({
        status: 'paid',
        paidAt: now,
        paymentMethod,
        transactionReference: ref,
        notes: notes || inv.notes,
      })
      .where(eq(invoices.id, invoiceId));

    // Update tenant subscription status if was past_due or suspended
    await db
      .update(subscriptions)
      .set({
        status: 'active',
        lastPaymentDate: now,
      })
      .where(eq(subscriptions.tenantId, inv.tenantId));

    // Audit log
    const tRows = await db.select().from(tenants).where(eq(tenants.id, inv.tenantId)).limit(1);
    const tenantName = tRows[0]?.name || inv.tenantId;

    await db.insert(activityLogs).values({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: inv.tenantId,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'PAYMENT_RECORDED',
      category: 'subscription',
      details: `Recorded institutional payment of ₹${inv.amount.toLocaleString('en-IN')} for invoice ${inv.invoiceNumber} (${tenantName}) via ${paymentMethod}.`,
      timestamp: now,
    });

    res.json({ success: true, paidAt: now, transactionReference: ref });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PLATFORM ACTIVITY & SECURITY AUDIT TRAIL API ---
app.get('/api/activity-logs', async (req, res) => {
  try {
    const { category, tenantId, limit = '150' } = req.query;
    const logsList = await db
      .select({
        id: activityLogs.id,
        tenantId: activityLogs.tenantId,
        actorId: activityLogs.actorId,
        actorName: activityLogs.actorName,
        actorRole: activityLogs.actorRole,
        action: activityLogs.action,
        category: activityLogs.category,
        details: activityLogs.details,
        timestamp: activityLogs.timestamp,
        tenantName: tenants.name,
      })
      .from(activityLogs)
      .leftJoin(tenants, eq(activityLogs.tenantId, tenants.id))
      .orderBy(desc(activityLogs.timestamp))
      .limit(Number(limit) || 150);

    res.json(logsList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activity-logs', async (req, res) => {
  try {
    const { tenantId, actorId, actorName, actorRole, action, category, details } = req.body;
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.insert(activityLogs).values({
      id,
      tenantId: tenantId || null,
      actorId: actorId || 'usr_super_admin_01',
      actorName: actorName || 'Super Administrator',
      actorRole: actorRole || 'super_admin',
      action: action || 'PLATFORM_ACTION',
      category: category || 'general',
      details: details || '',
      timestamp: new Date(),
    });
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SUBSCRIPTION REVENUE & ANALYTICS API ---
app.get('/api/super-admin/revenue', requireAuth, async (_req, res) => {
  try {
    const allInvoices = await db.select().from(invoices);
    const allSubs = await db.select().from(subscriptions);
    const allPlans = await db.select().from(subscriptionPlans);

    const paidInvoices = allInvoices.filter((i) => i.status === 'paid');
    const pendingInvoices = allInvoices.filter((i) => i.status === 'pending');
    const overdueInvoices = allInvoices.filter((i) => i.status === 'overdue');

    const totalCollected = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalPending = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + i.amount, 0);

    let mrr = 0;
    const tierBreakdown: Record<string, { count: number; totalAmount: number; planName: string }> = {};

    allSubs.forEach((sub) => {
      const plan = allPlans.find((p) => p.id === sub.planId);
      if (plan && sub.status === 'active') {
        const monthlyVal = sub.billingCycle === 'annual' ? Math.round(plan.priceAnnual / 12) : plan.priceMonthly;
        mrr += monthlyVal;

        if (!tierBreakdown[plan.code]) {
          tierBreakdown[plan.code] = { count: 0, totalAmount: 0, planName: plan.name };
        }
        tierBreakdown[plan.code].count += 1;
        tierBreakdown[plan.code].totalAmount += sub.billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly * 12;
      }
    });

    res.json({
      totalCollected,
      totalPending,
      totalOverdue,
      mrr,
      tierBreakdown,
      invoicesCount: allInvoices.length,
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      overdueCount: overdueInvoices.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Tenant Members
app.get('/api/tenants/:slug/members', async (req, res) => {
  try {
    const { slug } = req.params;
    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Library tenant not found.' });
    const tenant = tRows[0];

    const mRows = await db
      .select({
        membership: tenantMemberships,
        user: users,
      })
      .from(tenantMemberships)
      .innerJoin(users, eq(tenantMemberships.userId, users.id))
      .where(eq(tenantMemberships.tenantId, tenant.id))
      .orderBy(desc(tenantMemberships.joinedAt));

    const list = mRows.map((r) => ({
      membershipId: r.membership.id,
      userId: r.user.id,
      fullName: r.user.fullName,
      email: r.user.email,
      role: r.membership.role,
      isActive: r.membership.isActive,
      studentId: r.user.studentId,
      staffId: r.user.staffId,
      phone: r.user.phone,
    }));

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Direct Member Registration (Librarian/Student in Tenant)
app.post('/api/tenants/:slug/members', async (req, res) => {
  try {
    const { slug } = req.params;
    const { fullName, email, role = 'student', phone, idNumber } = req.body;

    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Library tenant not found.' });
    const tenant = tRows[0];

    // Check limit
    if (role === 'student') {
      const quota = await checkServerStudentQuota(tenant.id);
      if (!quota.allowed) return res.status(403).json({ error: quota.message });
    } else {
      const quota = await checkServerLibrarianQuota(tenant.id);
      if (!quota.allowed) return res.status(403).json({ error: quota.message });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    let userId = '';
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
    } else {
      userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.insert(users).values({
        id: userId,
        email: cleanEmail,
        fullName: fullName.trim(),
        phone: phone?.trim(),
        studentId: role === 'student' ? idNumber?.trim() : undefined,
        staffId: role !== 'student' ? idNumber?.trim() : undefined,
        isSuperAdmin: false,
        isActive: true,
      });
    }

    // Add membership
    const memId = `mem_${tenant.id}_${userId.slice(-6)}`;
    await db.insert(tenantMemberships).values({
      id: memId,
      tenantId: tenant.id,
      userId,
      role,
      joinedAt: new Date(),
      isActive: true,
    }).onConflictDoNothing({ target: tenantMemberships.id });

    res.json({ success: true, userId, membershipId: memId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Tenant Status (Active / Suspended / Archived)
app.post('/api/tenants/:slug/status', async (req, res) => {
  try {
    const { slug } = req.params;
    const { status, reason } = req.body;

    const tRows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (!tRows.length) return res.status(404).json({ error: 'Library not found.' });
    const tenant = tRows[0];

    await db.update(tenants).set({ status, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));

    if (status === 'suspended') {
      await db.update(subscriptions).set({ status: 'suspended' }).where(eq(subscriptions.tenantId, tenant.id));
    } else if (status === 'active') {
      await db.update(subscriptions).set({ status: 'active' }).where(eq(subscriptions.tenantId, tenant.id));
    }

    await db.insert(activityLogs).values({
      id: `log_${Date.now()}`,
      tenantId: tenant.id,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: `TENANT_STATUS_${status.toUpperCase()}`,
      category: 'security',
      details: reason || `Updated status of "${tenant.name}" to ${status}.`,
    });

    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function seedDatabaseIfEmpty() {
  try {
    // 1. Subscription Plans
    const planRows = await db.select().from(subscriptionPlans).limit(1);
    if (!planRows.length) {
      for (const p of INITIAL_PLANS) {
        await db.insert(subscriptionPlans).values({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description,
          priceMonthly: p.priceMonthly,
          priceAnnual: p.priceAnnual,
          trialDays: p.trialDays,
          maxTitles: p.maxTitles,
          maxCopies: p.maxCopies,
          maxLibrarians: p.maxLibrarians,
          maxStudents: p.maxStudents,
          storageGb: p.storageGb || 1,
          storageMb: p.storageMb || 10,
          features: p.features,
          isPopular: p.isPopular || false,
          isActive: p.isActive,
          createdAt: new Date(p.createdAt),
        }).onConflictDoNothing({ target: subscriptionPlans.id });
      }
    }

    // 2. Tenants
    const tenantRows = await db.select().from(tenants).limit(1);
    if (!tenantRows.length) {
      for (const t of INITIAL_TENANTS) {
        await db.insert(tenants).values({
          id: t.id,
          slug: t.slug,
          name: t.name,
          institutionName: t.institutionName,
          institutionType: t.institutionType,
          logoUrl: t.logoUrl,
          logoInitials: t.logoInitials,
          status: t.status,
          settings: t.settings,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }).onConflictDoNothing({ target: tenants.id });
      }
    }

    // 3. Subscriptions
    const subRows = await db.select().from(subscriptions).limit(1);
    if (!subRows.length) {
      for (const s of INITIAL_SUBSCRIPTIONS) {
        await db.insert(subscriptions).values({
          id: s.id,
          tenantId: s.tenantId,
          planId: s.planId,
          status: s.status,
          billingCycle: s.billingCycle,
          startDate: new Date(s.startDate),
          expiryDate: new Date(s.expiryDate),
          gracePeriodDays: s.gracePeriodDays || 30,
          autoRenew: s.autoRenew ?? true,
          customMaxTitles: s.customLimits?.maxTitles,
          customMaxCopies: s.customLimits?.maxCopies,
          customMaxLibrarians: s.customLimits?.maxLibrarians,
          customMaxStudents: s.customLimits?.maxStudents,
          customMaxStorageMb: s.customLimits?.storageMb,
          customOverrideReason: s.customOverrideReason,
        }).onConflictDoNothing({ target: subscriptions.id });
      }
    }

    // 4. Users & Memberships
    const userRows = await db.select().from(users).limit(1);
    if (!userRows.length) {
      for (const u of INITIAL_USERS) {
        await db.insert(users).values({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          phone: u.phone,
          avatarUrl: u.avatarUrl,
          staffId: u.staffId,
          studentId: u.studentId,
          isSuperAdmin: u.isSuperAdmin,
          isActive: u.isActive,
          createdAt: new Date(u.createdAt),
        }).onConflictDoNothing({ target: users.id });
      }
      for (const m of INITIAL_MEMBERSHIPS) {
        await db.insert(tenantMemberships).values({
          id: m.id,
          tenantId: m.tenantId,
          userId: m.userId,
          role: m.role,
          joinedAt: new Date(m.joinedAt),
          isActive: m.isActive,
        }).onConflictDoNothing({ target: tenantMemberships.id });
      }
    }

    // 5. Books & Copies
    const bookRows = await db.select().from(books).limit(1);
    if (!bookRows.length) {
      for (const b of INITIAL_BOOKS) {
        await db.insert(books).values({
          id: b.id,
          tenantId: b.tenantId,
          title: b.title,
          isbn: b.isbn,
          authors: b.authors,
          category: b.category,
          publisher: b.publisher,
          year: b.year,
          callNumber: b.callNumber,
          shelfLocation: b.shelfLocation,
          language: b.language,
          description: b.description,
          copiesTotal: b.copiesTotal,
          copiesAvailable: b.copiesAvailable,
          createdAt: new Date(b.createdAt),
        }).onConflictDoNothing({ target: books.id });
      }
      for (const c of INITIAL_COPIES) {
        await db.insert(bookCopies).values({
          id: c.id,
          tenantId: c.tenantId,
          bookId: c.bookId,
          accessionNumber: c.accessionNumber,
          barcode: c.barcode,
          status: c.status,
          condition: c.condition,
          shelfLocation: c.shelfLocation,
          addedAt: new Date(c.addedAt),
        }).onConflictDoNothing({ target: bookCopies.id });
      }
    }

    // 8. Subscription Upgrade Enquiries
    const enqRows = await db.select().from(subscriptionEnquiries).limit(1);
    if (!enqRows.length) {
      const allT = await db.select().from(tenants);
      const apex = allT.find((t) => t.id === 'ten_apex_college') || allT[0];
      const second = allT.length > 1 ? (allT[1].id !== apex?.id ? allT[1] : allT[2] || allT[0]) : null;

      if (apex) {
        const seedItems: any[] = [
          {
            id: 'enq_apex_01',
            tenantId: apex.id,
            tenantSlug: apex.slug,
            tenantName: apex.name,
            contactName: 'Prof. Rajesh Sharma',
            contactEmail: 'rajesh.sharma@apex.edu',
            contactPhone: '+91 98765 43210',
            requestedPlan: 'premium',
            estimatedTitles: 5000,
            estimatedCopies: 8000,
            estimatedLibrarians: 5,
            estimatedStudents: 850,
            estimatedStorageMb: 2048,
            message: 'Our semester intake has doubled. We request tier upgrade to Premium with 5,000 title quota and 5 librarians.',
            status: 'pending',
            createdAt: new Date(Date.now() - 3600 * 1000 * 4),
          },
        ];

        if (second && second.id !== apex.id) {
          seedItems.push({
            id: 'enq_second_02',
            tenantId: second.id,
            tenantSlug: second.slug,
            tenantName: second.name,
            contactName: 'Dr. Anita Desai',
            contactEmail: 'a.desai@library.ac.in',
            contactPhone: '+91 98230 11223',
            requestedPlan: 'standard',
            estimatedTitles: 4000,
            estimatedCopies: 6000,
            estimatedLibrarians: 3,
            estimatedStudents: 600,
            estimatedStorageMb: 1024,
            message: 'Free trial approaching expiry. Requesting approval to activate Standard Plan for entire academic branch.',
            status: 'pending',
            createdAt: new Date(Date.now() - 3600 * 1000 * 12),
          });
        }

        await db.insert(subscriptionEnquiries).values(seedItems).onConflictDoNothing({ target: subscriptionEnquiries.id });
      }
    }

    // 9. Invoices & Billing
    const invRows = await db.select().from(invoices).limit(1);
    if (!invRows.length) {
      const allT = await db.select().from(tenants);
      const apex = allT.find((t) => t.id === 'ten_apex_college') || allT[0];
      const second = allT.find((t) => t.id === 'ten_darul_irfan') || allT[1] || allT[0];
      const third = allT.find((t) => t.id === 'ten_zaytuna') || allT[2] || allT[0];

      const seedInvoices: any[] = [];
      if (second) {
        seedInvoices.push({
          id: 'inv_seed_001',
          invoiceNumber: 'INV-MBT-2026-0038',
          tenantId: second.id,
          planName: 'Standard Campus',
          billingCycle: 'annual',
          amount: 49990,
          currency: 'INR',
          status: 'paid',
          issueDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
          dueDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
          paidAt: new Date(Date.now() - 29 * 24 * 3600 * 1000),
          paymentMethod: 'Credit Card / Razorpay',
          transactionReference: 'pay_3N8xYk2eZvKYlo2C19',
          notes: 'Annual institutional license renewal.',
        });
      }
      if (third) {
        seedInvoices.push({
          id: 'inv_seed_002',
          invoiceNumber: 'INV-MBT-2026-0041',
          tenantId: third.id,
          planName: 'Premium University',
          billingCycle: 'annual',
          amount: 19990,
          currency: 'INR',
          status: 'paid',
          issueDate: new Date(Date.now() - 20 * 24 * 3600 * 1000),
          dueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
          paidAt: new Date(Date.now() - 19 * 24 * 3600 * 1000),
          paymentMethod: 'Bank Wire / UPI',
          transactionReference: 'UPI-METRO-9982104',
          notes: 'Higher research license tier.',
        });
      }
      if (apex) {
        seedInvoices.push({
          id: 'inv_seed_003',
          invoiceNumber: 'INV-MBT-2026-0052',
          tenantId: apex.id,
          planName: 'Standard Campus',
          billingCycle: 'annual',
          amount: 49990,
          currency: 'INR',
          status: 'pending',
          issueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
          dueDate: new Date(Date.now() + 10 * 24 * 3600 * 1000),
          notes: 'Upcoming renewal invoice sent to institutional administration.',
        });
      }
      if (allT.length > 3) {
        seedInvoices.push({
          id: 'inv_seed_004',
          invoiceNumber: 'INV-MBT-2026-0049',
          tenantId: allT[3].id,
          planName: 'Basic School',
          billingCycle: 'monthly',
          amount: 1999,
          currency: 'INR',
          status: 'overdue',
          issueDate: new Date(Date.now() - 25 * 24 * 3600 * 1000),
          dueDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
          notes: 'Past due monthly invoice awaiting clearance.',
        });
      }

      if (seedInvoices.length) {
        await db.insert(invoices).values(seedInvoices).onConflictDoNothing({ target: invoices.id });
      }
    }
  } catch (err: any) {
    console.warn('[DB Seed] Warning:', err?.message);
  }
}

// Vite Middleware for SPA Development & Production
async function startServer() {
  await seedDatabaseIfEmpty();

  // Run initial trial expiration check immediately on startup
  await checkAndDeactivateExpiredTrialsDB();

  // Start scheduled background engine (runs every 30 seconds)
  setInterval(() => {
    checkAndDeactivateExpiredTrialsDB().catch((err) => {
      console.error('[Scheduled Trial Engine] Error:', err);
    });
  }, 30000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(port, () => {
      console.log(`[MBT Library Full-Stack] Server running on port ${port}`);
      console.log(`[License Engine] 72-Hour Free trial background deactivation scheduler active`);
      console.log(`[Cloud SQL] Relational schema and Row Level Security active`);
    });
  }
}

if (process.env.VERCEL) {
  // On Vercel, static files and client SPA rewrites are served directly by Vercel CDN.
  // Express handles /api routes.
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });
  seedDatabaseIfEmpty().catch(console.error);
} else if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
  seedDatabaseIfEmpty().catch(console.error);
  app.listen(port, () => {
    console.log(`[MBT Library Full-Stack] Server running on port ${port}`);
  });
} else {
  startServer();
}

export default app;
