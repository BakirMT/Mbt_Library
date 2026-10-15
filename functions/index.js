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

      // 4. Retrieve Resend API Key
      let apiKey;
      try {
        apiKey = typeof resendApiKeySecret.value === 'function' ? resendApiKeySecret.value() : null;
      } catch (e) {
        apiKey = null;
      }
      if (!apiKey) {
        apiKey = process.env.RESEND_API_KEY;
      }

      if (!apiKey) {
        console.error('[sendEmailOtp] Missing RESEND_API_KEY secret.');
        return res.status(500).json({
          error: 'Email delivery service is currently unconfigured. Please contact support.',
        });
      }

      // 5. Dispatch Email via Resend API
      const resend = new Resend(apiKey);
      const senderEmail = getValidSenderEmail();
      const { data: sendData, error: sendError } = await resend.emails.send({
        from: senderEmail,
        to: [normalizedEmail],
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
      });

      if (sendError) {
        console.warn('[sendEmailOtp] Resend dispatch note:', sendError.message || sendError);
        let clientMsg = sendError.message || 'Email delivery failed. Please verify your email address or try again.';
        if (sendError.message && sendError.message.includes('You can only send testing emails to your own email address')) {
          const owner = sendError.message.match(/\(([^)]+)\)/)?.[1] || 'your registered Resend account';
          clientMsg = `Resend is in Sandbox mode: verification emails can only be sent to ${owner}. Please test with ${owner} or verify a custom domain at resend.com/domains.`;
        } else if (sendError.message && sendError.message.includes('domain is not verified')) {
          clientMsg = 'The sender domain is not verified in Resend. Please use onboarding@resend.dev or verify your domain at resend.com/domains.';
        }
        return res.status(400).json({
          error: clientMsg,
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
        resendMessageId: sendData?.id || null,
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
