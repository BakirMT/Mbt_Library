const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { Resend } = require('resend');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// Define Google Cloud Secret Manager Secrets
const resendApiKeySecret = defineSecret('RESEND_API_KEY');
const otpHmacSecret = defineSecret('OTP_HMAC_SECRET');

const PRIVILEGED_ROLES = ['super_admin', 'platform_owner', 'tenant_admin', 'admin', 'librarian', 'senior_librarian'];

// Helper: Normalize Email
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

// Helper: Validate Email Format
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

const DEFAULT_HMAC_SECRET = 'mbt-library-secure-otp-hmac-key-2026';

// Helper: Secure HMAC Verifier
function generateHmac(email, code) {
  let secretKey;
  try {
    secretKey = typeof otpHmacSecret.value === 'function' ? otpHmacSecret.value() : null;
  } catch (e) {
    secretKey = null;
  }
  if (!secretKey) {
    secretKey = process.env.OTP_HMAC_SECRET || DEFAULT_HMAC_SECRET;
  }

  return crypto
    .createHmac('sha256', secretKey)
    .update(`${email}:${code}`)
    .digest('hex');
}

function getValidSenderEmail() {
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
      `[sendEmailOtp] Sender address "${envFrom}" uses a public webmail domain. Falling back to sandbox sender "MBT Library Authentication <onboarding@resend.dev>".`
    );
    return 'MBT Library Authentication <onboarding@resend.dev>';
  }

  return envFrom;
}

function sanitizeProviderError(raw, providerName) {
  if (!raw) return `${providerName} service returned an empty response.`;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE') || trimmed.includes('<html')) {
    const titleMatch = trimmed.match(/<title>([^<]+)<\/title>/i);
    const codeMatch = trimmed.match(/Error code (\d+)/i) || trimmed.match(/(\d{3}):\s*Connection/i);
    const title = titleMatch ? titleMatch[1].replace(/emailjs\.com\s*\|\s*/i, '').trim() : '';
    const code = codeMatch ? codeMatch[1] : '';
    return `${providerName} service issue${code ? ` (${code})` : ''}: ${title || 'Connection timed out. Please try again in a moment.'}`;
  }
  return raw;
}

async function sendEmailJsOtpEmail(toEmail, otpCode) {
  let serviceId = (process.env.EMAILJS_SERVICE_ID || '').trim();
  if (!serviceId || serviceId === 'service_wj') {
    serviceId = 'service_wj02uv1';
  }
  const templateId = (process.env.EMAILJS_TEMPLATE_ID || '').trim() || 'template_ib3nk6l';
  const publicKey = (process.env.EMAILJS_PUBLIC_KEY || process.env.EMAILJS_USER_ID || '').trim() || '8pnTJ9CanAtHrCa2u';
  const privateKey = (process.env.EMAILJS_PRIVATE_KEY || process.env.EMAILJS_ACCESS_TOKEN || '').trim() || '_tlhOePLuvy0Tpj9e9YqM';

  if (!serviceId) {
    return {
      success: false,
      error: 'EmailJS Service ID is not configured.',
    };
  }

  // If EmailJS template or public key is not set, but Resend is available, fall back to Resend
  if (!publicKey || !templateId) {
    let resendKey;
    try {
      resendKey = typeof resendApiKeySecret.value === 'function' ? resendApiKeySecret.value() : null;
    } catch (e) {
      resendKey = null;
    }
    if (!resendKey) resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      return sendResendOtpEmail(resendKey, toEmail, otpCode);
    }
    return {
      success: false,
      error: `EmailJS Configuration Required: Service ID is set to "${serviceId}". Please configure EMAILJS_PUBLIC_KEY and EMAILJS_TEMPLATE_ID to dispatch OTP emails via EmailJS.`,
    };
  }

  // Canonical EmailJS payload strictly matching Section 3 specification
  const payload = {
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

    let resendKey;
    try {
      resendKey = typeof resendApiKeySecret.value === 'function' ? resendApiKeySecret.value() : null;
    } catch (e) {
      resendKey = null;
    }
    if (!resendKey) resendKey = process.env.RESEND_API_KEY;

    if ((res.status >= 500 || res.status === 429) && resendKey) {
      console.warn(`[sendEmailOtp] EmailJS returned HTTP ${res.status}. Attempting fallback via Resend...`);
      return sendResendOtpEmail(resendKey, toEmail, otpCode);
    }

    return {
      success: false,
      error: sanitizedError,
      provider: 'emailjs',
    };
  } catch (err) {
    let resendKey;
    try {
      resendKey = typeof resendApiKeySecret.value === 'function' ? resendApiKeySecret.value() : null;
    } catch (e) {
      resendKey = null;
    }
    if (!resendKey) resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      console.warn(`[sendEmailOtp] EmailJS connection failed (${err && err.message}). Attempting fallback via Resend...`);
      return sendResendOtpEmail(resendKey, toEmail, otpCode);
    }

    const isTimeout = err && (err.name === 'AbortError' || (err.message && err.message.includes('aborted')));
    return {
      success: false,
      error: isTimeout
        ? 'EmailJS service connection timed out (8s limit). Please check your EmailJS dashboard or try again.'
        : `EmailJS network failure: ${err && err.message ? err.message : 'Unable to connect to EmailJS API'}`,
      provider: 'emailjs',
    };
  }
}

async function sendResendOtpEmail(apiKey, toEmail, otpCode) {
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

    const data = await res.json().catch(() => ({}));

    if (res.ok && data && data.id) {
      return { success: true, messageId: data.id };
    }

    const errorMsg = data && data.message ? data.message : '';
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
      error: data && data.message ? data.message : 'Failed to dispatch email via Resend.',
    };
  } catch (err) {
    return {
      success: false,
      error: err && err.message ? err.message : 'Network error communicating with Resend API.',
    };
  }
}

// Helper: Prevent Role Escalation by deriving trusted role & tenant
async function determineUserRoleAndTenant(email, requestedRole, requestedTenantSlug) {
  let derivedRole = 'user';
  let derivedTenant = null;

  // 1. Check existing Firebase Auth user custom claims
  try {
    const userRecord = await auth.getUserByEmail(email);
    if (userRecord && userRecord.customClaims) {
      if (userRecord.customClaims.role) derivedRole = userRecord.customClaims.role;
      if (userRecord.customClaims.tenantSlug) derivedTenant = userRecord.customClaims.tenantSlug;
    }
  } catch (e) {
    // User does not exist yet in Firebase Auth
  }

  // 2. Check Firestore users collection
  try {
    const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!userSnap.empty) {
      const uData = userSnap.docs[0].data();
      if (uData.role) derivedRole = uData.role;
      if (uData.isSuperAdmin) derivedRole = 'super_admin';
      if (uData.tenantSlug) derivedTenant = uData.tenantSlug;
    }
  } catch (e) {}

  // 3. Check pending invitations if role is still default 'user'
  if (derivedRole === 'user') {
    try {
      const inviteSnap = await db.collection('invitations')
        .where('email', '==', email)
        .where('status', '==', 'pending')
        .limit(1)
        .get();
      if (!inviteSnap.empty) {
        const invite = inviteSnap.docs[0].data();
        if (invite.role) derivedRole = invite.role;
        if (invite.tenantSlug) derivedTenant = invite.tenantSlug;
      }
    } catch (e) {}
  }

  // 4. Role escalation check: Suppress privileged role requests from unauthenticated clients
  if (PRIVILEGED_ROLES.includes(requestedRole) && !PRIVILEGED_ROLES.includes(derivedRole)) {
    console.warn(`[Security Alert] Suppressed unauthorized request for role "${requestedRole}" for email "${email}". Defaulting to "${derivedRole}".`);
  } else if (requestedRole && !PRIVILEGED_ROLES.includes(requestedRole)) {
    if (derivedRole === 'user') derivedRole = requestedRole;
  }

  if (requestedTenantSlug && !derivedTenant) {
    derivedTenant = requestedTenantSlug;
  }

  return { role: derivedRole, tenantSlug: derivedTenant };
}

/**
 * Cloud Function: sendEmailOtp
 * Generates secure 6-digit OTP, stores HMAC verifier, and dispatches email via Resend API
 */
exports.sendEmailOtp = onRequest(
  { secrets: [resendApiKeySecret, otpHmacSecret], cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const rawEmail = req.body.email || req.body.target || req.body.destination;
      const normalizedEmail = normalizeEmail(rawEmail);

      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      // 1. Rate Limit & Resend Cooldown Check (60 seconds per email)
      const now = Date.now();
      const recentSnapshot = await db
        .collection('otp_challenges')
        .where('email', '==', normalizedEmail)
        .where('isConsumed', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!recentSnapshot.empty) {
        const recentData = recentSnapshot.docs[0].data();
        const timeElapsed = (now - (recentData.createdAt || 0)) / 1000;
        if (timeElapsed < 60) {
          const waitSecs = Math.ceil(60 - timeElapsed);
          return res.status(429).json({
            error: `Please wait ${waitSecs} seconds before requesting a new verification code.`,
          });
        }
      }

      // 2. Resolve Role and Tenant securely
      const { role, tenantSlug } = await determineUserRoleAndTenant(
        normalizedEmail,
        req.body.role,
        req.body.tenantSlug
      );

      // 3. Generate Cryptographically Secure 6-digit OTP
      const otpCode = crypto.randomInt(100000, 1000000).toString();

      const otpVerifier = generateHmac(normalizedEmail, otpCode);

      const expiresAt = now + 5 * 60 * 1000; // 5 minutes expiration

      // 5. Dispatch Email via EmailJS (with fallback to Resend if configured)
      const sendResult = await sendEmailJsOtpEmail(normalizedEmail, otpCode);

      if (!sendResult.success) {
        return res.status(400).json({
          error: sendResult.error || 'Email delivery failed. Please verify your email configuration.',
        });
      }

      // 6. Store ONLY the HMAC verifier in Firestore (Never store plaintext OTP)
      const challengeRef = db.collection('otp_challenges').doc();
      await challengeRef.set({
        email: normalizedEmail,
        otpVerifier,
        tenantSlug,
        role,
        attempts: 0,
        maxAttempts: 5,
        isConsumed: false,
        expiresAt,
        createdAt: now,
        resendMessageId: sendResult.messageId || null,
      });

      // Mask email for response log
      const emailParts = normalizedEmail.split('@');
      const maskedEmail = `${emailParts[0].slice(0, 3)}***@${emailParts[1]}`;

      return res.json({
        success: true,
        message: `Verification code dispatched to ${maskedEmail}.`,
        maskedEmail,
        expiresInSeconds: 300,
        cooldownSeconds: 60,
      });
    } catch (err) {
      console.error('[sendEmailOtp] Unexpected error:', err);
      return res.status(500).json({ error: 'Failed to process email verification request.' });
    }
  }
);

/**
 * Cloud Function: verifyEmailOtp
 * Validates 6-digit code, enforces timing-safe HMAC checks, prevents replay attacks via Firestore transaction,
 * and generates Firebase Custom Token upon success.
 */
exports.verifyEmailOtp = onRequest({ secrets: [otpHmacSecret], cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rawEmail = req.body.email || req.body.target || req.body.destination;
    const rawCode = req.body.otpCode || req.body.otp || req.body.code;

    const normalizedEmail = normalizeEmail(rawEmail);
    const submittedCode = String(rawCode || '').trim();

    if (!normalizedEmail || !submittedCode || submittedCode.length !== 6) {
      return res.status(400).json({ error: 'Valid email and 6-digit verification code are required.' });
    }

    const now = Date.now();
    const expectedVerifier = generateHmac(normalizedEmail, submittedCode);

    // Fetch active challenge for email
    const querySnapshot = await db
      .collection('otp_challenges')
      .where('email', '==', normalizedEmail)
      .where('isConsumed', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const challengeDoc = querySnapshot.docs[0];
    const challengeRef = challengeDoc.ref;

    let transactionResult = { success: false, reason: 'UNKNOWN' };

    // Concurrency-safe Firestore transaction without throwing errors inside transaction
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(challengeRef);
      if (!snap.exists) {
        transactionResult = { success: false, reason: 'NOT_FOUND' };
        return;
      }

      const data = snap.data();

      if (data.isConsumed) {
        transactionResult = { success: false, reason: 'ALREADY_CONSUMED' };
        return;
      }

      if (now > data.expiresAt) {
        transaction.update(challengeRef, { isConsumed: true, invalidatedReason: 'EXPIRED' });
        transactionResult = { success: false, reason: 'EXPIRED' };
        return;
      }

      const currentAttempts = data.attempts || 0;
      const maxAttempts = data.maxAttempts || 5;

      if (currentAttempts >= maxAttempts) {
        transaction.update(challengeRef, { isConsumed: true, invalidatedReason: 'EXCESSIVE_ATTEMPTS' });
        transactionResult = { success: false, reason: 'EXCESSIVE_ATTEMPTS' };
        return;
      }

      // Timing-safe comparison of stored HMAC vs computed HMAC
      const storedBuffer = Buffer.from(data.otpVerifier || '', 'hex');
      const submittedBuffer = Buffer.from(expectedVerifier, 'hex');

      let matches = false;
      if (storedBuffer.length === submittedBuffer.length && storedBuffer.length > 0) {
        matches = crypto.timingSafeEqual(storedBuffer, submittedBuffer);
      }

      if (!matches) {
        const newAttempts = currentAttempts + 1;
        const updates = { attempts: newAttempts };
        if (newAttempts >= maxAttempts) {
          updates.isConsumed = true;
          updates.invalidatedReason = 'EXCESSIVE_ATTEMPTS';
        }
        transaction.update(challengeRef, updates);
        transactionResult = { success: false, reason: 'INVALID_CODE' };
        return;
      }

      // Valid OTP: Consume challenge atomically to prevent replay attacks
      transaction.update(challengeRef, {
        isConsumed: true,
        consumedAt: now,
      });

      transactionResult = {
        success: true,
        challengeRole: data.role,
        challengeTenant: data.tenantSlug,
      };
    });

    if (!transactionResult.success) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Determine trusted role and tenant
    const { role, tenantSlug } = await determineUserRoleAndTenant(
      normalizedEmail,
      req.body.role || transactionResult.challengeRole,
      req.body.tenantSlug || transactionResult.challengeTenant
    );

    // Get or create Firebase Auth user safely
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(normalizedEmail);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: normalizedEmail,
          emailVerified: true,
          displayName: normalizedEmail.split('@')[0],
        });
      } else {
        throw authErr;
      }
    }

    // Assign custom claims securely
    const customClaims = {
      role: role || 'user',
      tenantSlug: tenantSlug || null,
      emailVerified: true,
    };

    await auth.setCustomUserClaims(userRecord.uid, customClaims);

    // Create Firebase Custom Token for client exchange
    const customToken = await auth.createCustomToken(userRecord.uid, customClaims);

    return res.json({
      success: true,
      customToken,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      role: customClaims.role,
      tenantSlug: customClaims.tenantSlug,
      message: 'Email address verified successfully.',
    });
  } catch (err) {
    console.error('[verifyEmailOtp] Verification error:', err);
    return res.status(500).json({ error: 'OTP verification failed. Please request a new code.' });
  }
});
