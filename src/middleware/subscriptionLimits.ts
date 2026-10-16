import { db } from '../db/index';
import { tenants, subscriptions, subscriptionPlans, books, bookCopies, tenantMemberships, loans } from '../db/schema';
import { eq, and, sql, count } from 'drizzle-orm';

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  status?: string;
  message?: string;
}

export async function verifyTenantActiveAndSubscribed(tenantId: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenantRows.length) {
      return { valid: false, error: 'Tenant library not found.' };
    }
    const tenant = tenantRows[0];
    if (tenant.status === 'deactivated') {
      return {
        valid: false,
        error: `Library "${tenant.name}" has been deactivated due to Free trial expiration. Please upgrade subscription or contact the MBT Library authority to restore access.`,
      };
    }
    if (tenant.status === 'suspended') {
      return { valid: false, error: `Library "${tenant.name}" is suspended. Feature write operations are disabled.` };
    }
    if (tenant.status === 'archived') {
      return { valid: false, error: `Library "${tenant.name}" is archived.` };
    }

    const subRows = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
    if (!subRows.length) {
      return { valid: false, error: 'No active subscription found for this library.' };
    }
    const sub = subRows[0];

    // Check expiry
    const now = new Date();
    const expiry = new Date(sub.expiryDate);

    // If sub is marked expired, block immediately and ensure tenant status is deactivated
    if (sub.status === 'expired') {
      if (tenant.status !== 'suspended' && tenant.status !== 'archived' && tenant.status !== 'deactivated') {
        await db.update(tenants).set({ status: 'deactivated', updatedAt: now }).where(eq(tenants.id, tenant.id));
      }
      return {
        valid: false,
        error: `The 3-day Free trial for "${tenant.name}" has expired and library access is deactivated. Please upgrade to continue.`,
      };
    }

    // Real-time check if Free/trial has expired
    if (now.getTime() >= expiry.getTime() && (sub.status === 'trial' || sub.planId === 'plan_free' || sub.planId === 'plan_trial')) {
      // Auto-deactivate immediately in DB
      await db.update(subscriptions).set({ status: 'expired' }).where(eq(subscriptions.id, sub.id));
      if (tenant.status !== 'suspended' && tenant.status !== 'archived') {
        await db.update(tenants).set({ status: 'deactivated', updatedAt: now }).where(eq(tenants.id, tenant.id));
      }
      return {
        valid: false,
        error: `The 3-day Free trial for "${tenant.name}" has expired and library access is deactivated. Please upgrade to continue.`,
      };
    }

    // For paid subscriptions with grace period
    const graceMs = (sub.gracePeriodDays || 0) * 24 * 60 * 60 * 1000;
    if (now.getTime() > expiry.getTime() + graceMs && sub.status === 'past_due') {
      return {
        valid: false,
        error: `Subscription grace period has expired for "${tenant.name}". Please renew subscription to continue cataloguing and circulation.`,
      };
    }

    return { valid: true };
  } catch (err: any) {
    console.error('Error verifying tenant subscription:', err);
    return { valid: false, error: err?.message || 'Database error validating tenant status' };
  }
}

export async function checkServerTitleQuota(tenantId: string, additionalCount = 1): Promise<QuotaCheckResult> {
  try {
    const subRows = await db
      .select({
        customMaxTitles: subscriptions.customMaxTitles,
        planMaxTitles: subscriptionPlans.maxTitles,
        planName: subscriptionPlans.name,
        planCode: subscriptionPlans.code,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    if (!subRows.length) {
      return { allowed: true, current: 0, limit: 999999 };
    }

    const { customMaxTitles, planMaxTitles, planName, planCode } = subRows[0];
    const isOverridden = customMaxTitles !== null && customMaxTitles !== undefined;
    const limit = isOverridden ? customMaxTitles! : planMaxTitles;

    if (planCode === 'premium' && !isOverridden) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        message: 'Premium subscription requires explicit authority-configured catalogue limits. Please contact MBT Authority.',
      };
    }

    const booksCountRes = await db
      .select({ val: count() })
      .from(books)
      .where(eq(books.tenantId, tenantId));
    const current = Number(booksCountRes[0]?.val || 0);

    const allowed = current + additionalCount <= limit;
    return {
      allowed,
      current,
      limit,
      message: allowed
        ? undefined
        : `Catalogue title limit reached (${current} of ${limit} titles used on ${planName} plan${isOverridden ? ' [Custom Override]' : ''}). Please upgrade subscription or contact authority to increase limit.`,
    };
  } catch (err) {
    console.error('Title quota check error:', err);
    return { allowed: true, current: 0, limit: 999999 };
  }
}

export async function checkServerCopyQuota(tenantId: string, additionalCount = 1): Promise<QuotaCheckResult> {
  try {
    const subRows = await db
      .select({
        customMaxCopies: subscriptions.customMaxCopies,
        planMaxCopies: subscriptionPlans.maxCopies,
        planName: subscriptionPlans.name,
        planCode: subscriptionPlans.code,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    if (!subRows.length) {
      return { allowed: true, current: 0, limit: 999999 };
    }

    const { customMaxCopies, planMaxCopies, planName, planCode } = subRows[0];
    const isOverridden = customMaxCopies !== null && customMaxCopies !== undefined;
    const limit = isOverridden ? customMaxCopies! : planMaxCopies;

    if (planCode === 'premium' && !isOverridden) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        message: 'Premium subscription requires explicit authority-configured physical copy limits. Please contact MBT Authority.',
      };
    }

    const copyCountRes = await db
      .select({ val: count() })
      .from(bookCopies)
      .where(eq(bookCopies.tenantId, tenantId));
    const current = Number(copyCountRes[0]?.val || 0);

    const allowed = current + additionalCount <= limit;
    return {
      allowed,
      current,
      limit,
      message: allowed
        ? undefined
        : `Physical copies limit reached (${current} of ${limit} physical copies registered on ${planName} plan${isOverridden ? ' [Custom Override]' : ''}). Cannot add additional physical copies.`,
    };
  } catch (err) {
    console.error('Copy quota check error:', err);
    return { allowed: true, current: 0, limit: 999999 };
  }
}

export async function checkServerLibrarianQuota(tenantId: string): Promise<QuotaCheckResult> {
  try {
    const subRows = await db
      .select({
        customMax: subscriptions.customMaxLibrarians,
        planMax: subscriptionPlans.maxLibrarians,
        planName: subscriptionPlans.name,
        planCode: subscriptionPlans.code,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    if (!subRows.length) {
      return { allowed: true, current: 0, limit: 999999 };
    }

    const { customMax, planMax, planName, planCode } = subRows[0];
    const isOverridden = customMax !== null && customMax !== undefined;
    const limit = isOverridden ? customMax! : planMax;

    if (planCode === 'premium' && !isOverridden) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        message: 'Premium subscription requires authority-configured librarian limits. Please contact MBT Authority.',
      };
    }

    const staffRes = await db
      .select({ val: count() })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.isActive, true),
          sql`${tenantMemberships.role} IN ('librarian', 'senior_librarian')`
        )
      );
    const current = Number(staffRes[0]?.val || 0);

    const allowed = current < limit;
    return {
      allowed,
      current,
      limit,
      message: allowed
        ? undefined
        : `Librarian accounts limit reached (${current} of ${limit} allowed librarians utilized on ${planName} plan${isOverridden ? ' [Custom Override]' : ''}). Upgrade plan or request limit override.`,
    };
  } catch (err) {
    console.error('Librarian quota check error:', err);
    return { allowed: true, current: 0, limit: 999999 };
  }
}

export async function checkServerStudentQuota(tenantId: string): Promise<QuotaCheckResult> {
  try {
    const subRows = await db
      .select({
        customMax: subscriptions.customMaxStudents,
        planMax: subscriptionPlans.maxStudents,
        planName: subscriptionPlans.name,
        planCode: subscriptionPlans.code,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    if (!subRows.length) {
      return { allowed: true, current: 0, limit: 999999 };
    }

    const { customMax, planMax, planName, planCode } = subRows[0];
    const isOverridden = customMax !== null && customMax !== undefined;
    const limit = isOverridden ? customMax! : planMax;

    if (planCode === 'premium' && !isOverridden) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        message: 'Premium subscription requires authority-configured student quota. Please contact MBT Authority.',
      };
    }

    const studentRes = await db
      .select({ val: count() })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.isActive, true),
          eq(tenantMemberships.role, 'student')
        )
      );
    const current = Number(studentRes[0]?.val || 0);

    const allowed = current < limit;
    return {
      allowed,
      current,
      limit,
      message: allowed
        ? undefined
        : `Student accounts limit reached (${current} of ${limit} allowed students registered on ${planName} plan${isOverridden ? ' [Custom Override]' : ''}). Cannot register additional students.`,
    };
  } catch (err) {
    console.error('Student quota check error:', err);
    return { allowed: true, current: 0, limit: 999999 };
  }
}

export async function checkServerStorageQuota(tenantId: string, incomingSizeMb = 1): Promise<QuotaCheckResult> {
  try {
    const subRows = await db
      .select({
        customMaxStorage: subscriptions.customMaxStorageMb,
        planStorage: subscriptionPlans.storageMb,
        planName: subscriptionPlans.name,
        planCode: subscriptionPlans.code,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

    if (!subRows.length) {
      return { allowed: true, current: 0, limit: 999999 };
    }

    const { customMaxStorage, planStorage, planName, planCode } = subRows[0];
    const isOverridden = customMaxStorage !== null && customMaxStorage !== undefined;
    const limit = isOverridden ? customMaxStorage! : planStorage;

    if (planCode === 'premium' && !isOverridden) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        message: 'Premium subscription requires authority-configured storage allowance. Please contact MBT Authority.',
      };
    }

    // Estimate storage based on catalogue and copy assets (approx 0.1MB per title)
    const booksCountRes = await db.select({ val: count() }).from(books).where(eq(books.tenantId, tenantId));
    const titleCount = Number(booksCountRes[0]?.val || 0);
    const current = Math.round(titleCount * 0.1);

    const allowed = current + incomingSizeMb <= limit;
    return {
      allowed,
      current,
      limit,
      message: allowed
        ? undefined
        : `Storage allowance exceeded (${current} MB of ${limit} MB used on ${planName} plan${isOverridden ? ' [Custom Override]' : ''}). Upload blocked.`,
    };
  } catch (err) {
    console.error('Storage quota check error:', err);
    return { allowed: true, current: 0, limit: 999999 };
  }
}

export async function checkServerBorrowingQuota(tenantId: string, userId: string): Promise<QuotaCheckResult> {
  try {
    const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const maxBooksAllowed = tenantRows[0]?.settings?.maxBooksPerStudent || 5;

    const loanRes = await db
      .select({ val: count() })
      .from(loans)
      .where(
        and(
          eq(loans.tenantId, tenantId),
          eq(loans.userId, userId),
          eq(loans.status, 'active')
        )
      );
    const current = Number(loanRes[0]?.val || 0);

    const allowed = current < maxBooksAllowed;
    return {
      allowed,
      current,
      limit: maxBooksAllowed,
      message: allowed
        ? undefined
        : `Student borrowing limit reached: Member has ${current} active loans (maximum allowed is ${maxBooksAllowed}).`,
    };
  } catch (err) {
    console.error('Borrowing quota check error:', err);
    return { allowed: true, current: 0, limit: 5 };
  }
}
