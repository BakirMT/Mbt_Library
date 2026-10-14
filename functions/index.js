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

// Helper: Secure HMAC Verifier
function generateHmac(email, code) {
  const secretKey = otpHmacSecret.value() || process.env.OTP_HMAC_SECRET || 'mbt-library-secure-otp-hmac-key-2026';
  return crypto
    .createHmac('sha256', secretKey)
    .update(`${email}:${code}`)
    .digest('hex');
}

/**
 * Cloud Function: sendEmailOtp
 * Generates secure 6-digit OTP, stores HMAC verifier, and dispatches email via Resend API
 */
exports.sendEmailOtp = onRequest(
  { secrets: [resendApiKeySecret, otpHmacSecret], cors: true },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const rawEmail = req.body.email || req.body.target || req.body.destination;
      const tenantSlug = req.body.tenantSlug || null;
      const role = req.body.role || null;

      const normalizedEmail = normalizeEmail(rawEmail);

      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      // Rate limit & Resend Cooldown Check (60 seconds per email)
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

      // Generate cryptographically secure 6-digit OTP code
      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const otpVerifier = generateHmac(normalizedEmail, otpCode);
      const expiresAt = now + 5 * 60 * 1000; // 5 minutes expiration

      // Retrieve Resend API Key from Cloud Secret Manager or Environment
      const apiKey = resendApiKeySecret.value() || process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.error('[sendEmailOtp] Missing RESEND_API_KEY secret.');
        return res.status(500).json({
          error: 'Email delivery service is currently unconfigured. Please contact support.',
        });
      }

      // Dispatch Email via Resend API
      const resend = new Resend(apiKey);
const senderEmail = process.env.RESEND_FROM_EMAIL || 'MBT Library Authentication <onboarding@resend.dev>';
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
        console.error('[sendEmailOtp] Resend dispatch error:', sendError);
        return res.status(500).json({
          error: 'Email delivery failed. Please verify your email address or try again.',
        });
      }

      // Store ONLY the HMAC verifier in Firestore (Never store plaintext OTP)
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

      // Return clean success response without exposing OTP code
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
    const tenantSlug = req.body.tenantSlug || null;
    const role = req.body.role || null;

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

    let isVerified = false;

    // Concurrency-safe Firestore transaction to check and consume OTP
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(challengeRef);
      if (!snap.exists) {
        throw new Error('CHALLENGE_NOT_FOUND');
      }

      const data = snap.data();

      if (data.isConsumed || now > data.expiresAt) {
        throw new Error('CHALLENGE_EXPIRED');
      }

      if ((data.attempts || 0) >= (data.maxAttempts || 5)) {
        transaction.update(challengeRef, { isConsumed: true, invalidatedReason: 'EXCESSIVE_ATTEMPTS' });
        throw new Error('CHALLENGE_MAX_ATTEMPTS');
      }

      // Timing-safe comparison of stored HMAC vs computed HMAC
      const storedBuffer = Buffer.from(data.otpVerifier, 'hex');
      const submittedBuffer = Buffer.from(expectedVerifier, 'hex');

      let matches = false;
      if (storedBuffer.length === submittedBuffer.length) {
        matches = crypto.timingSafeEqual(storedBuffer, submittedBuffer);
      }

      if (!matches) {
        const newAttempts = (data.attempts || 0) + 1;
        const updates = { attempts: newAttempts };
        if (newAttempts >= (data.maxAttempts || 5)) {
          updates.isConsumed = true;
          updates.invalidatedReason = 'EXCESSIVE_ATTEMPTS';
        }
        transaction.update(challengeRef, updates);
        throw new Error('INVALID_CODE');
      }

      // Valid OTP: Consume challenge atomically to prevent replay attacks
      transaction.update(challengeRef, {
        isConsumed: true,
        consumedAt: now,
      });

      isVerified = true;
    });

    if (!isVerified) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Check existing Firebase Auth user before creating account
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(normalizedEmail);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        // Create user with verified email state
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
      message: 'Email address verified successfully.',
    });
  } catch (err) {
    if (
      err.message === 'CHALLENGE_NOT_FOUND' ||
      err.message === 'CHALLENGE_EXPIRED' ||
      err.message === 'CHALLENGE_MAX_ATTEMPTS' ||
      err.message === 'INVALID_CODE'
    ) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    console.error('[verifyEmailOtp] Verification error:', err);
    return res.status(500).json({ error: 'OTP verification failed. Please request a new code.' });
  }
});
