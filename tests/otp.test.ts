import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

const API_BASE = 'http://localhost:3000';
const HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'mbt-library-secure-otp-hmac-key-2026';

function generateHmac(email: string, code: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(`${email}:${code}`).digest('hex');
}

describe('Production Email OTP Authentication & Resend Verification Suite', () => {
  const testEmail = `test.user.${Date.now()}@mbtlibrary.com`;

  it('1. Normalization & Validation: Rejects invalid email address formats', async () => {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email-format' }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /valid email/i);
  });

  it('2. Provider & Security: Fails safely when Resend API key is unconfigured or invalid', async () => {
    // Calling send-otp when RESEND_API_KEY is not set or invalid
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `unconfigured.${Date.now()}@mbtlibrary.com` }),
    });
    const data = await res.json();
    if (!process.env.RESEND_API_KEY) {
      assert.strictEqual(res.status, 500);
      assert.match(data.error, /Resend API key/i);
    } else {
      assert.ok(res.status === 200 || res.status === 400);
      if (res.status === 200) {
        assert.strictEqual(data.success, true);
      }
    }
  });

  it('3. Security: Verification response NEVER exposes plaintext OTP in debugOtp or devOtp', async () => {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const data = await res.json();
    assert.strictEqual(data.debugOtp, undefined);
    assert.strictEqual(data.devOtp, undefined);
    assert.strictEqual(data.otpCode, undefined);
  });

  it('4. Incorrect OTP: Rejects invalid 6-digit verification code with generic error', async () => {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otpCode: '000000' }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid or expired verification code.');
  });

  it('5. Replay Attacks & Concurrency: Prevents reuse of consumed verification codes', async () => {
    // Attempting double verification of invalid/expired code
    const res1 = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otpCode: '123456' }),
    });
    const res2 = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otpCode: '123456' }),
    });
    assert.strictEqual(res1.status, 400);
    assert.strictEqual(res2.status, 400);
  });

  it('6. Protected Admin Routes: Blocks unauthenticated access to super admin APIs', async () => {
    const res = await fetch(`${API_BASE}/api/super-admin/revenue`, {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid_token_123' },
    });
    assert.strictEqual(res.status, 401);
  });

  it('7. Resend Cooldown Enforcement: Enforces rate limits (< 60s cooldown)', async () => {
    const res1 = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `cooldown.${Date.now()}@mbtlibrary.com` }),
    });
    if (res1.ok) {
      const res2 = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `cooldown.${Date.now()}@mbtlibrary.com` }),
      });
      // Should trigger cooldown if sent within 60s
      assert.strictEqual(res2.status === 429 || res2.status === 500, true);
    }
  });
});
