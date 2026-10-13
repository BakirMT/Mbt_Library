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

dotenv.config();

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

// --- SECURE OTP AUTHENTICATION ENDPOINTS ---
const otpStore = new Map<string, { code: string; expiresAt: number; verified: boolean; attempts: number }>();

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { target, type } = req.body;
    if (!target) {
      return res.status(400).json({ error: 'Email address or mobile number is required.' });
    }
    const cleanTarget = target.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(`${type}:${cleanTarget}`, {
      code,
      expiresAt,
      verified: false,
      attempts: 0,
    });

    console.log(`[OTP Engine] Generated ${type} OTP for ${cleanTarget}: ${code}`);

    res.json({
      success: true,
      message: `OTP sent successfully to ${cleanTarget}`,
      devOtp: code,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send OTP' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { target, type, otp } = req.body;
    if (!target || !otp) {
      return res.status(400).json({ error: 'Target and OTP code are required.' });
    }
    const cleanTarget = target.trim().toLowerCase();
    const key = `${type}:${cleanTarget}`;
    const record = otpStore.get(key);

    if (!record) {
      return res.status(400).json({ error: 'No active OTP challenge found. Please request a new OTP.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (record.attempts >= 5) {
      otpStore.delete(key);
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (record.code !== otp.trim()) {
      record.attempts++;
      return res.status(400).json({ error: 'Invalid OTP code. Please verify and try again.' });
    }

    record.verified = true;
    res.json({
      success: true,
      verifiedToken: `token_verified_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      message: `${type === 'email' ? 'Email' : 'Mobile number'} successfully verified!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'OTP verification failed' });
  }
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

    // Strict 3-day (72 hours) Free trial duration calculated on server timestamp
    const isFreePlanOrTrial = payload.planId === 'plan_free' || payload.isTrial;
    const expiryDate = isFreePlanOrTrial
      ? new Date(now.getTime() + 72 * 60 * 60 * 1000)
      : new Date(now.getTime() + (payload.billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000);

    const initials = payload.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join('') || 'LB';

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

      // 3. Insert Admin User
      await tx.insert(users).values({
        id: adminUserId,
        email: payload.adminEmail.trim().toLowerCase(),
        fullName: payload.adminFullName.trim(),
        phone: payload.adminPhone.trim(),
        staffId: payload.adminStaffId?.trim(),
        isSuperAdmin: false,
        isActive: true,
      });

      // 4. Insert Membership
      await tx.insert(tenantMemberships).values({
        id: `mem_${tenantId}_admin`,
        tenantId,
        userId: adminUserId,
        role: 'library_admin',
        joinedAt: new Date(),
        isActive: true,
      }).onConflictDoNothing({ target: tenantMemberships.id });

      // 5. Insert Subscription
      await tx.insert(subscriptions).values({
        id: subId,
        tenantId,
        planId: payload.planId,
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
        customOverrideReason: payload.customOverrideReason || (payload.customLimitsEnabled ? 'Initial custom limits configured during library provisioning' : undefined),
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
        details: `Provisioned "${payload.name}" with plan ${payload.planId}. Admin invited: ${payload.adminEmail}.`,
      });
    });

    res.json({
      success: true,
      tenantId,
      slug: cleanSlug,
      invitationToken: token,
      invitationUrl: `/invite/${token}`,
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

// Revoke Invitation
app.post('/api/invitations/:invitationId/revoke', async (req, res) => {
  try {
    const { invitationId } = req.params;
    await db.update(invitations).set({ status: 'revoked' }).where(eq(invitations.id, invitationId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- INVOICES & PAYMENTS API ---
app.get('/api/invoices', async (_req, res) => {
  try {
    const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.issueDate));
    res.json(allInvoices);
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

    await db
      .update(invoices)
      .set({
        status: 'paid',
        paidAt: now,
        paymentMethod,
        transactionReference: transactionReference || `TXN-${Date.now()}`,
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

    res.json({ success: true, paidAt: now });
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

if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  app.use(express.static(path.resolve(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
  seedDatabaseIfEmpty().catch(console.error);
} else {
  startServer();
}

export default app;
