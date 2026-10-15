import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

const API_BASE = 'http://localhost:3000';
const HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'mbt-library-secure-otp-hmac-key-2026';

function generateHmac(email: string, code: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(`${email}:${code}`).digest('hex');
}

describe('MBT Library OTP Delivery & EmailJS Recipient Verification Suite', () => {
  before(async () => {
    // Enable EmailJS mock to avoid sending real OTPs during automated regression testing
    await fetch(`${API_BASE}/api/test/mock-emailjs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
  });

  after(async () => {
    // Disable mock after test run
    await fetch(`${API_BASE}/api/test/mock-emailjs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
  });

  it('Test A: A user enters student@gmail.com. EmailJS payload to_email must equal student@gmail.com', async () => {
    await fetch(`${API_BASE}/api/test/reset-emailjs-payload`, { method: 'POST' });

    const studentEmail = `student.${Date.now()}@gmail.com`;
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const payloadRes = await fetch(`${API_BASE}/api/test/last-emailjs-payload`);
    const { payload } = await payloadRes.json();

    assert.ok(payload, 'EmailJS payload must be recorded');
    assert.strictEqual(payload.template_params.to_email, studentEmail);
    assert.strictEqual(payload.template_params.app_name, 'MBT Library');
    assert.match(payload.template_params.otp_code, /^\d{6}$/);
  });

  it('Test B: A different user enters librarian@gmail.com. EmailJS payload to_email must equal librarian@gmail.com', async () => {
    await fetch(`${API_BASE}/api/test/reset-emailjs-payload`, { method: 'POST' });

    const librarianEmail = `librarian.${Date.now()}@gmail.com`;
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: librarianEmail }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const payloadRes = await fetch(`${API_BASE}/api/test/last-emailjs-payload`);
    const { payload } = await payloadRes.json();

    assert.ok(payload, 'EmailJS payload must be recorded');
    assert.strictEqual(payload.template_params.to_email, librarianEmail);
    assert.notStrictEqual(payload.template_params.to_email, 'mbtofficial26@gmail.com');
  });

  it('Test C: Authority email mbtofficial26@gmail.com is NOT used as recipient unless user enters that email', async () => {
    await fetch(`${API_BASE}/api/test/reset-emailjs-payload`, { method: 'POST' });

    // Step 1: User enters patron.member@gmail.com -> recipient must NOT be mbtofficial26@gmail.com
    const patronEmail = `patron.${Date.now()}@gmail.com`;
    const res1 = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patronEmail }),
    });
    assert.strictEqual(res1.status, 200);

    const payloadRes1 = await fetch(`${API_BASE}/api/test/last-emailjs-payload`);
    const { payload: payload1 } = await payloadRes1.json();
    assert.strictEqual(payload1.template_params.to_email, patronEmail);
    assert.notStrictEqual(payload1.template_params.to_email, 'mbtofficial26@gmail.com');

    // Step 2: Authority enters mbtofficial26@gmail.com -> only then is it the recipient
    const officialEmail = `mbtofficial26.${Date.now()}@gmail.com`;
    const res2 = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: officialEmail }),
    });
    assert.strictEqual(res2.status, 200);

    const payloadRes2 = await fetch(`${API_BASE}/api/test/last-emailjs-payload`);
    const { payload: payload2 } = await payloadRes2.json();
    assert.strictEqual(payload2.template_params.to_email, officialEmail);
  });

  it('Test D: Invalid or missing email addresses are rejected without sending an email', async () => {
    await fetch(`${API_BASE}/api/test/reset-emailjs-payload`, { method: 'POST' });

    // Invalid format
    const resInvalid = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email-address' }),
    });
    assert.strictEqual(resInvalid.status, 400);

    // Empty email
    const resEmpty = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '   ' }),
    });
    assert.strictEqual(resEmpty.status, 400);

    // Verify no email was dispatched via EmailJS
    const payloadRes = await fetch(`${API_BASE}/api/test/last-emailjs-payload`);
    const { payload } = await payloadRes.json();
    assert.strictEqual(payload, null, 'No EmailJS payload should have been sent for invalid requests');
  });

  it('Test E: OTP is associated with the correct email and cannot be verified against another user email', async () => {
    const victimEmail = `victim.${Date.now()}@gmail.com`;
    const attackerEmail = `attacker.${Date.now()}@gmail.com`;

    const sendRes = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: victimEmail }),
    });
    assert.strictEqual(sendRes.status, 200);

    // Attacker tries to verify using their own email with any code
    const verifyAttackerRes = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: attackerEmail, otpCode: '123456' }),
    });
    assert.strictEqual(verifyAttackerRes.status, 400);
    const data = await verifyAttackerRes.json();
    assert.strictEqual(data.error, 'Invalid or expired verification code.');
  });

  it('Test F: EmailJS errors are handled properly without falsely reporting success', async () => {
    // Configure mock to simulate an EmailJS 500 error
    await fetch(`${API_BASE}/api/test/mock-emailjs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        response: { ok: false, status: 500, text: 'EmailJS: Service temporarily down' },
      }),
    });

    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `failtest.${Date.now()}@gmail.com` }),
    });

    const data = await res.json();
    assert.ok(res.status === 400 || res.status === 500);
    assert.strictEqual(data.success, undefined);
    assert.ok(data.error);

    // Restore standard mock response
    await fetch(`${API_BASE}/api/test/mock-emailjs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
  });

  it('Security: Response never exposes plaintext OTP in response body', async () => {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `security.${Date.now()}@gmail.com` }),
    });
    const data = await res.json();
    assert.strictEqual(data.otpCode, undefined);
    assert.strictEqual(data.devOtp, undefined);
    assert.strictEqual(data.debugOtp, undefined);
  });

  it('Security: Rate limiting & resend cooldown prevents spam (< 60s cooldown)', async () => {
    const testEmail = `cooldown.${Date.now()}@gmail.com`;
    const res1 = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert.strictEqual(res1.status, 200);

    const res2 = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert.strictEqual(res2.status, 429);
  });
});
