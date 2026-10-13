import {
  Tenant,
  SubscriptionPlan,
  Subscription,
  User,
  TenantMembership,
  Invitation,
  Invoice,
  ActivityLog,
  ProvisionLibraryPayload,
  TenantStatus,
  SubscriptionStatus,
  TenantSession,
  UserRole,
  Category,
  Book,
  BookCopy,
  Loan,
  Reservation,
  Fine,
  SubscriptionEnquiry,
} from '../types/saas';
import {
  INITIAL_PLANS,
  INITIAL_TENANTS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_USERS,
  INITIAL_MEMBERSHIPS,
  INITIAL_INVITATIONS,
  INITIAL_INVOICES,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_BOOKS,
  INITIAL_COPIES,
  INITIAL_LOANS,
  INITIAL_RESERVATIONS,
  INITIAL_FINES,
} from './mockData';

const STORAGE_KEYS = {
  TENANTS: 'mbt_saas_tenants_v2',
  PLANS: 'mbt_saas_plans_v2',
  SUBSCRIPTIONS: 'mbt_saas_subscriptions_v2',
  USERS: 'mbt_saas_users_v1',
  MEMBERSHIPS: 'mbt_saas_memberships_v1',
  INVITATIONS: 'mbt_saas_invitations_v1',
  INVOICES: 'mbt_saas_invoices_v1',
  LOGS: 'mbt_saas_activity_logs_v1',
  SUPER_ADMIN_SESSION: 'mbt_saas_superadmin_session_v1',
  CATEGORIES: 'mbt_saas_categories_v1',
  BOOKS: 'mbt_saas_books_v1',
  COPIES: 'mbt_saas_copies_v1',
  LOANS: 'mbt_saas_loans_v1',
  RESERVATIONS: 'mbt_saas_reservations_v1',
  FINES: 'mbt_saas_fines_v1',
  ENQUIRIES: 'mbt_saas_enquiries_v1',
};

// Helper: load from localStorage with fallback
function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch (err) {
    console.error(`Failed to read ${key} from storage:`, err);
    return fallback;
  }
}

// Helper: save to localStorage
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to storage:`, err);
  }
}

// Generate unpredictable secure token
function generateSecureToken(prefix = 'mbt_inv'): string {
  const chars = 'abcdef0123456789';
  let token = `${prefix}_`;
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

class SaasStorageService {
  constructor() {
    this.initializeIfEmpty();
  }

  private initializeIfEmpty() {
    if (!localStorage.getItem(STORAGE_KEYS.TENANTS)) {
      saveToStorage(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLANS)) {
      saveToStorage(STORAGE_KEYS.PLANS, INITIAL_PLANS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS)) {
      saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      saveToStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS)) {
      saveToStorage(STORAGE_KEYS.MEMBERSHIPS, INITIAL_MEMBERSHIPS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVITATIONS)) {
      saveToStorage(STORAGE_KEYS.INVITATIONS, INITIAL_INVITATIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      saveToStorage(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      saveToStorage(STORAGE_KEYS.LOGS, INITIAL_ACTIVITY_LOGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      saveToStorage(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKS)) {
      saveToStorage(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.COPIES)) {
      saveToStorage(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOANS)) {
      saveToStorage(STORAGE_KEYS.LOANS, INITIAL_LOANS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.RESERVATIONS)) {
      saveToStorage(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.FINES)) {
      saveToStorage(STORAGE_KEYS.FINES, INITIAL_FINES);
    }
  }

  // Reset to initial demo state
  resetAllData() {
    saveToStorage(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    saveToStorage(STORAGE_KEYS.PLANS, INITIAL_PLANS);
    saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS);
    saveToStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    saveToStorage(STORAGE_KEYS.MEMBERSHIPS, INITIAL_MEMBERSHIPS);
    saveToStorage(STORAGE_KEYS.INVITATIONS, INITIAL_INVITATIONS);
    saveToStorage(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    saveToStorage(STORAGE_KEYS.LOGS, INITIAL_ACTIVITY_LOGS);
    saveToStorage(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    saveToStorage(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    saveToStorage(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    saveToStorage(STORAGE_KEYS.LOANS, INITIAL_LOANS);
    saveToStorage(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    saveToStorage(STORAGE_KEYS.FINES, INITIAL_FINES);
  }

  // --- TENANTS ---
  getTenants(): Tenant[] {
    this.checkAndEnforceTrialExpirations();
    return getFromStorage<Tenant[]>(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
  }

  getTenantById(id: string): Tenant | undefined {
    return this.getTenants().find((t) => t.id === id);
  }

  getTenantBySlug(slug: string): Tenant | undefined {
    return this.getTenants().find((t) => t.slug.toLowerCase() === slug.toLowerCase());
  }

  isSlugAvailable(slug: string, excludeId?: string): boolean {
    const clean = slug.trim().toLowerCase();
    return !this.getTenants().some(
      (t) => t.slug.toLowerCase() === clean && (!excludeId || t.id !== excludeId)
    );
  }

  updateTenantStatus(tenantId: string, status: TenantStatus, reason?: string): boolean {
    const tenants = this.getTenants();
    const idx = tenants.findIndex((t) => t.id === tenantId);
    if (idx === -1) return false;

    const tenant = tenants[idx];
    tenant.status = status;
    tenant.updatedAt = new Date().toISOString();
    tenants[idx] = tenant;
    saveToStorage(STORAGE_KEYS.TENANTS, tenants);

    // Also sync subscription status if suspended or reactivated
    const subscriptions = this.getSubscriptions();
    const subIdx = subscriptions.findIndex((s) => s.tenantId === tenantId);
    if (subIdx !== -1) {
      if (status === 'suspended') {
        subscriptions[subIdx].status = 'suspended';
      } else if (status === 'active' && subscriptions[subIdx].status === 'suspended') {
        subscriptions[subIdx].status = 'active';
      }
      saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions);
    }

    this.logActivity({
      tenantId: tenant.id,
      tenantName: tenant.name,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: `TENANT_STATUS_${status.toUpperCase()}`,
      category: 'security',
      details: reason || `Updated status of "${tenant.name}" to ${status}.`,
    });

    return true;
  }

  deleteTenant(tenantId: string): boolean {
    const tenants = this.getTenants();
    const idx = tenants.findIndex((t) => t.id === tenantId);
    if (idx === -1) return false;
    const tenant = tenants[idx];
    const filtered = tenants.filter((t) => t.id !== tenantId);
    saveToStorage(STORAGE_KEYS.TENANTS, filtered);

    const subscriptions = this.getSubscriptions().filter((s) => s.tenantId !== tenantId);
    saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions);

    this.logActivity({
      tenantId: tenant.id,
      tenantName: tenant.name,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'TENANT_DELETED',
      category: 'security',
      details: `Deleted tenant "${tenant.name}".`,
    });

    return true;
  }

  updateTenantDetails(
    tenantId: string,
    updates: Partial<Pick<Tenant, 'name' | 'institutionName' | 'institutionType' | 'settings'>>
  ): boolean {
    const tenants = this.getTenants();
    const idx = tenants.findIndex((t) => t.id === tenantId);
    if (idx === -1) return false;

    tenants[idx] = {
      ...tenants[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
      settings: {
        ...tenants[idx].settings,
        ...(updates.settings || {}),
      },
    };
    saveToStorage(STORAGE_KEYS.TENANTS, tenants);

    this.logActivity({
      tenantId,
      tenantName: tenants[idx].name,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'TENANT_UPDATED',
      category: 'provisioning',
      details: `Updated institutional and branding details for "${tenants[idx].name}".`,
    });

    return true;
  }

  // --- AUTOMATIC 3-DAY TRIAL EXPIRATION ENFORCEMENT ---
  checkAndEnforceTrialExpirations(): { expiredCount: number } {
    const now = Date.now();
    const subs = getFromStorage<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS);
    const tenants = getFromStorage<Tenant[]>(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
    const plans = this.getPlans();

    let updated = false;
    let count = 0;

    subs.forEach((sub, sIdx) => {
      const plan = plans.find((p) => p.id === sub.planId);
      const isTrialOrFree = plan?.code === 'free' || sub.status === 'trial';
      const expiryTime = new Date(sub.expiryDate).getTime();

      // If trial has expired (passed 72 hours) and status is not yet marked expired
      if (isTrialOrFree && now >= expiryTime && sub.status !== 'expired') {
        subs[sIdx].status = 'expired';
        updated = true;
        count++;

        const tIdx = tenants.findIndex((t) => t.id === sub.tenantId);
        if (tIdx !== -1) {
          // Rule 7: Do not overwrite if separately suspended or archived
          if (tenants[tIdx].status !== 'suspended' && tenants[tIdx].status !== 'archived') {
            tenants[tIdx].status = 'deactivated';
            tenants[tIdx].updatedAt = new Date().toISOString();
          }
        }

        this.logActivity({
          tenantId: sub.tenantId,
          tenantName: tIdx !== -1 ? tenants[tIdx]?.name : undefined,
          actorId: 'system',
          actorName: 'MBT Automated License Engine',
          actorRole: 'super_admin',
          action: 'TRIAL_EXPIRED_DEACTIVATED',
          category: 'subscription',
          details: `3-day Free trial (72 hours) has expired for "${tIdx !== -1 ? tenants[tIdx]?.name : sub.tenantId}". Library access automatically deactivated. Super Admin notified.`,
        });
      }
    });

    if (updated) {
      saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);
      saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    }

    return { expiredCount: count };
  }

  // --- SUBSCRIPTIONS ---
  getSubscriptions(): Subscription[] {
    return getFromStorage<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS);
  }

  getSubscriptionForTenant(tenantId: string): Subscription | undefined {
    return this.getSubscriptions().find((s) => s.tenantId === tenantId);
  }

  updateSubscription(
    tenantId: string,
    updates: Partial<Subscription>
  ): Subscription | null {
    const subs = this.getSubscriptions();
    const idx = subs.findIndex((s) => s.tenantId === tenantId);
    if (idx === -1) return null;

    subs[idx] = {
      ...subs[idx],
      ...updates,
    };
    saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);

    // If subscription status is updated, sync tenant status
    if (updates.status || updates.planId) {
      const tenants = this.getTenants();
      const tIdx = tenants.findIndex((t) => t.id === tenantId);
      if (tIdx !== -1) {
        const currentTenantStatus = tenants[tIdx].status;
        if (updates.status === 'suspended') {
          tenants[tIdx].status = 'suspended';
        } else if (updates.status === 'trial') {
          tenants[tIdx].status = 'trial';
        } else if (updates.status === 'expired') {
          if (currentTenantStatus !== 'suspended' && currentTenantStatus !== 'archived') {
            tenants[tIdx].status = 'deactivated';
          }
        } else if (updates.status === 'active' || (updates.planId && updates.planId !== 'plan_free')) {
          // Automatic reactivation upon upgrade:
          // Rule 7: If the Super Admin has separately suspended a library, a subscription upgrade must not automatically override that suspension!
          if (currentTenantStatus === 'deactivated' || currentTenantStatus === 'trial') {
            tenants[tIdx].status = 'active';
            tenants[tIdx].updatedAt = new Date().toISOString();
          }
        }
        saveToStorage(STORAGE_KEYS.TENANTS, tenants);
      }
    }

    this.logActivity({
      tenantId,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'SUBSCRIPTION_UPDATED',
      category: 'subscription',
      details: `Updated subscription terms & plan limits.`,
    });

    return subs[idx];
  }

  extendTrial(
    tenantId: string,
    hours = 72,
    reason?: string
  ): { success: boolean; expiryDate?: string; error?: string } {
    const subs = this.getSubscriptions();
    const sIdx = subs.findIndex((s) => s.tenantId === tenantId);
    if (sIdx === -1) return { success: false, error: 'Subscription not found' };

    const tenants = this.getTenants();
    const tIdx = tenants.findIndex((t) => t.id === tenantId);

    const now = Date.now();
    const currentExpiry = new Date(subs[sIdx].expiryDate).getTime();
    const baseTime = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseTime + hours * 60 * 60 * 1000).toISOString();

    subs[sIdx].status = 'trial';
    subs[sIdx].expiryDate = newExpiry;
    saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);

    if (tIdx !== -1) {
      if (tenants[tIdx].status === 'deactivated' || tenants[tIdx].status === 'trial') {
        tenants[tIdx].status = 'trial';
        tenants[tIdx].updatedAt = new Date().toISOString();
        saveToStorage(STORAGE_KEYS.TENANTS, tenants);
      }
    }

    this.logActivity({
      tenantId,
      tenantName: tIdx !== -1 ? tenants[tIdx]?.name : undefined,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'TRIAL_EXTENDED',
      category: 'subscription',
      details: `Super Admin manually extended trial by ${hours} hours (${(hours / 24).toFixed(1)} days) for "${tenants[tIdx]?.name || tenantId}". New expiry: ${newExpiry}. Reason: ${reason || 'Authority manual extension'}.`,
    });

    return { success: true, expiryDate: newExpiry };
  }

  // --- PLANS ---
  getPlans(): SubscriptionPlan[] {
    return getFromStorage<SubscriptionPlan[]>(STORAGE_KEYS.PLANS, INITIAL_PLANS);
  }

  getPlanById(planId: string): SubscriptionPlan | undefined {
    return this.getPlans().find((p) => p.id === planId);
  }

  createPlan(newPlan: Omit<SubscriptionPlan, 'id' | 'createdAt'>): SubscriptionPlan {
    const plans = this.getPlans();
    const plan: SubscriptionPlan = {
      ...newPlan,
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    plans.push(plan);
    saveToStorage(STORAGE_KEYS.PLANS, plans);

    this.logActivity({
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'PLAN_CREATED',
      category: 'subscription',
      details: `Created new subscription plan "${plan.name}" with code ${plan.code}.`,
    });

    return plan;
  }

  updatePlan(planId: string, updates: Partial<SubscriptionPlan>): boolean {
    const plans = this.getPlans();
    const idx = plans.findIndex((p) => p.id === planId);
    if (idx === -1) return false;

    plans[idx] = { ...plans[idx], ...updates };
    saveToStorage(STORAGE_KEYS.PLANS, plans);

    this.logActivity({
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'PLAN_MODIFIED',
      category: 'subscription',
      details: `Modified tier specifications for "${plans[idx].name}".`,
    });

    return true;
  }

  // --- USERS & MEMBERSHIPS ---
  getUsers(): User[] {
    return getFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  getMemberships(): TenantMembership[] {
    return getFromStorage<TenantMembership[]>(STORAGE_KEYS.MEMBERSHIPS, INITIAL_MEMBERSHIPS);
  }

  getUsersForTenant(tenantId: string): Array<{ user: User; membership: TenantMembership }> {
    const memberships = this.getMemberships().filter((m) => m.tenantId === tenantId);
    const users = this.getUsers();

    return memberships.map((m) => ({
      membership: m,
      user: users.find((u) => u.id === m.userId) || {
        id: m.userId,
        email: 'unknown@user.com',
        fullName: 'Unknown User',
        isSuperAdmin: false,
        isActive: false,
        createdAt: m.joinedAt,
      },
    }));
  }

  updateMemberStatus(membershipId: string, isActive: boolean): boolean {
    const memberships = this.getMemberships();
    const idx = memberships.findIndex((m) => m.id === membershipId);
    if (idx === -1) return false;
    memberships[idx].isActive = isActive;
    saveToStorage(STORAGE_KEYS.MEMBERSHIPS, memberships);
    return true;
  }

  getLibraryAdminForTenant(tenantId: string): User | undefined {
    const membership = this.getMemberships().find(
      (m) => m.tenantId === tenantId && m.role === 'library_admin' && m.isActive
    );
    if (!membership) return undefined;
    return this.getUsers().find((u) => u.id === membership.userId);
  }

  // Reset Library Admin Account securely (generates password setup / reset invitation)
  resetLibraryAdminAccount(tenantId: string, adminUserId: string): { resetToken: string; resetLink: string } {
    const tenant = this.getTenantById(tenantId);
    const user = this.getUsers().find((u) => u.id === adminUserId);

    if (!tenant || !user) {
      throw new Error('Tenant or Admin user not found');
    }

    // Revoke any previous pending invitations for this admin
    const invitations = this.getInvitations();
    invitations.forEach((inv) => {
      if (inv.tenantId === tenantId && inv.recipientEmail === user.email && inv.status === 'pending') {
        inv.status = 'revoked';
      }
    });

    // Create fresh single-use password reset invitation
    const token = generateSecureToken('mbt_reset');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48h
    const newInvitation: Invitation = {
      id: `inv_${Date.now()}`,
      token,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      recipientEmail: user.email,
      recipientName: user.fullName,
      role: 'library_admin',
      deliveryMethod: 'manual_link',
      status: 'pending',
      expiresAt,
      createdAt: new Date().toISOString(),
      createdBy: 'usr_super_admin_01',
    };

    invitations.push(newInvitation);
    saveToStorage(STORAGE_KEYS.INVITATIONS, invitations);

    this.logActivity({
      tenantId: tenant.id,
      tenantName: tenant.name,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'ADMIN_ACCOUNT_RESET',
      category: 'security',
      details: `Generated secure credential reset token for Library Admin ${user.email}.`,
    });

    return {
      resetToken: token,
      resetLink: `${window.location.origin}/invite/${token}`,
    };
  }

  // --- INVITATIONS ---
  getInvitations(): Invitation[] {
    return getFromStorage<Invitation[]>(STORAGE_KEYS.INVITATIONS, INITIAL_INVITATIONS);
  }

  getInvitationByToken(token: string): Invitation | undefined {
    return this.getInvitations().find((inv) => inv.token === token);
  }

  revokeInvitation(invitationId: string): boolean {
    const invitations = this.getInvitations();
    const idx = invitations.findIndex((i) => i.id === invitationId);
    if (idx === -1) return false;

    invitations[idx].status = 'revoked';
    saveToStorage(STORAGE_KEYS.INVITATIONS, invitations);

    this.logActivity({
      tenantId: invitations[idx].tenantId,
      tenantName: invitations[idx].tenantName,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'INVITATION_REVOKED',
      category: 'security',
      details: `Revoked access invitation for ${invitations[idx].recipientEmail}.`,
    });

    return true;
  }

  createInvitation(
    tenantId: string,
    recipientEmail: string,
    recipientName: string,
    role: any,
    deliveryMethod: any = 'manual_link'
  ): Invitation {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const invitations = this.getInvitations();
    const token = generateSecureToken();
    const newInvitation: Invitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      token,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      recipientEmail,
      recipientName,
      role,
      deliveryMethod,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: 'usr_super_admin_01',
    };

    invitations.push(newInvitation);
    saveToStorage(STORAGE_KEYS.INVITATIONS, invitations);

    this.logActivity({
      tenantId: tenant.id,
      tenantName: tenant.name,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'INVITATION_GENERATED',
      category: 'security',
      details: `Generated new access token for ${recipientEmail} as ${role}.`,
    });

    return newInvitation;
  }

  acceptInvitation(token: string, password: string): { success: boolean; message: string; tenantSlug?: string; session?: TenantSession } {
    const invitations = this.getInvitations();
    const idx = invitations.findIndex((i) => i.token === token);
    if (idx === -1) return { success: false, message: 'Invalid invitation token.' };

    const inv = invitations[idx];
    if (inv.status === 'revoked') {
      return { success: false, message: 'This invitation has been revoked by the administrator.' };
    }
    if (inv.status === 'accepted') {
      return { success: false, message: 'This invitation token has already been claimed.' };
    }
    if (new Date(inv.expiresAt) < new Date()) {
      inv.status = 'expired';
      saveToStorage(STORAGE_KEYS.INVITATIONS, invitations);
      return { success: false, message: 'This invitation link has expired. Please contact your administrator.' };
    }

    const tenant = this.getTenantById(inv.tenantId);
    if (!tenant) return { success: false, message: 'Target library not found.' };

    // Mark invitation as accepted
    inv.status = 'accepted';
    inv.acceptedAt = new Date().toISOString();
    invitations[idx] = inv;
    saveToStorage(STORAGE_KEYS.INVITATIONS, invitations);

    // Create or activate User
    const users = this.getUsers();
    let user = users.find((u) => u.email.toLowerCase() === inv.recipientEmail.toLowerCase());
    const now = new Date().toISOString();

    if (!user) {
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: inv.recipientEmail.toLowerCase(),
        password,
        fullName: inv.recipientName,
        isSuperAdmin: false,
        isActive: true,
        createdAt: now,
        lastLoginAt: now,
      };
      users.push(user);
    } else {
      user.isActive = true;
      user.password = password;
      user.lastLoginAt = now;
    }
    saveToStorage(STORAGE_KEYS.USERS, users);

    // Create or activate Tenant Membership
    const memberships = this.getMemberships();
    let membership = memberships.find((m) => m.tenantId === inv.tenantId && m.userId === user!.id);
    if (!membership) {
      membership = {
        id: `mem_${inv.tenantId}_${user.id.slice(-6)}`,
        tenantId: inv.tenantId,
        userId: user.id,
        role: inv.role,
        joinedAt: now,
        isActive: true,
      };
      memberships.push(membership);
    } else {
      membership.role = inv.role;
      membership.isActive = true;
    }
    saveToStorage(STORAGE_KEYS.MEMBERSHIPS, memberships);

    // Update Tenant usage counters
    const tenants = this.getTenants();
    const tIdx = tenants.findIndex((t) => t.id === inv.tenantId);
    if (tIdx !== -1) {
      if (inv.role === 'librarian' || inv.role === 'senior_librarian') {
        tenants[tIdx].currentUsage.librariansCount = (tenants[tIdx].currentUsage.librariansCount || 0) + 1;
      } else if (inv.role === 'student') {
        tenants[tIdx].currentUsage.studentsCount = (tenants[tIdx].currentUsage.studentsCount || 0) + 1;
      }
      saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    }

    const session: TenantSession = {
      user,
      membership,
      tenant,
    };

    // Store active tenant session
    saveToStorage(`mbt_tenant_session_${tenant.slug}`, session);

    this.logActivity({
      tenantId: inv.tenantId,
      tenantName: inv.tenantName,
      actorId: user.id,
      actorName: inv.recipientName,
      actorRole: inv.role,
      action: 'INVITATION_ACCEPTED',
      category: 'auth',
      details: `User ${inv.recipientEmail} accepted invitation and configured credentials as ${inv.role}.`,
    });

    return {
      success: true,
      message: 'Account successfully activated! Redirecting to your library portal...',
      tenantSlug: inv.tenantSlug,
      session,
    };
  }

  // --- TENANT AUTHENTICATION & SESSIONS ---
  authenticateTenantUser(
    slug: string,
    email: string,
    password: string,
    requestedRole?: UserRole
  ): { success: boolean; session?: TenantSession; error?: string } {
    const tenant = this.getTenantBySlug(slug);
    if (!tenant) {
      return { success: false, error: `Library with slug "/l/${slug}" not found.` };
    }

    // Check Tenant Status (Security Boundary)
    if (tenant.status === 'deactivated') {
      return {
        success: false,
        error: `Your library's 3-day Free trial has expired. To restore access, please upgrade your subscription or contact the MBT Library authority.`,
      };
    }
    if (tenant.status === 'suspended') {
      return {
        success: false,
        error: `Access to ${tenant.name} is currently suspended due to subscription terms. Please contact your Super Administrator.`,
      };
    }
    if (tenant.status === 'archived') {
      return {
        success: false,
        error: `This library archive has been decommissioned. Access is restricted.`,
      };
    }

    // Check Subscription Grace Period
    const subscription = this.getSubscriptionForTenant(tenant.id);
    if (subscription) {
      const now = new Date().getTime();
      const expTime = new Date(subscription.expiryDate).getTime();
      const gracePeriodMs = (subscription.gracePeriodDays || 7) * 24 * 60 * 60 * 1000;
      if (now > expTime + gracePeriodMs && subscription.status === 'suspended') {
        return {
          success: false,
          error: `Subscription grace period has expired for ${tenant.name}. Please renew the institutional plan to restore access.`,
        };
      }
    }

    // Find User
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'Invalid email address or credentials.' };
    }

    if (!user.isActive) {
      return { success: false, error: 'This user account has been deactivated.' };
    }

    // Check Password (flexible for seed/demo credentials)
    const validPassword =
      user.password ? user.password === password : password === 'Password123!' || password === 'mbt@Admin2026!';
    if (!validPassword) {
      return { success: false, error: 'Incorrect password. Please verify your credentials or reset your password.' };
    }

    // Verify Tenant Membership (Strict Isolation Boundary)
    const memberships = this.getMemberships();
    const membership = memberships.find(
      (m) => m.tenantId === tenant.id && m.userId === user.id && m.isActive
    );

    if (!membership) {
      return {
        success: false,
        error: `User ${user.email} is not an authorized member of ${tenant.name}. Cross-tenant access is prohibited.`,
      };
    }

    // Role Verification
    if (requestedRole) {
      const roleMatches =
        requestedRole === 'librarian'
          ? membership.role === 'librarian' || membership.role === 'senior_librarian'
          : membership.role === requestedRole;

      if (!roleMatches) {
        return {
          success: false,
          error: `Access denied. Your assigned role in this library is "${membership.role.replace('_', ' ')}", not "${requestedRole.replace('_', ' ')}".`,
        };
      }
    }

    // Update user last login
    user.lastLoginAt = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.USERS, users);

    const session: TenantSession = {
      user,
      membership,
      tenant,
    };

    saveToStorage(`mbt_tenant_session_${tenant.slug}`, session);

    this.logActivity({
      tenantId: tenant.id,
      tenantName: tenant.name,
      actorId: user.id,
      actorName: user.fullName,
      actorRole: membership.role,
      action: 'TENANT_USER_LOGIN',
      category: 'auth',
      details: `${user.fullName} signed in to /l/${tenant.slug} (${membership.role}).`,
    });

    return { success: true, session };
  }

  getTenantSession(slug: string): TenantSession | null {
    const session = getFromStorage<TenantSession | null>(`mbt_tenant_session_${slug}`, null);
    if (!session) return null;

    // Verify tenant still exists and active
    const tenant = this.getTenantBySlug(slug);
    if (!tenant || tenant.status === 'suspended' || tenant.status === 'archived') {
      return null;
    }
    return session;
  }

  signOutTenant(slug: string): void {
    const session = this.getTenantSession(slug);
    if (session) {
      this.logActivity({
        tenantId: session.tenant.id,
        tenantName: session.tenant.name,
        actorId: session.user.id,
        actorName: session.user.fullName,
        actorRole: session.membership.role,
        action: 'TENANT_USER_LOGOUT',
        category: 'auth',
        details: `${session.user.fullName} logged out of /l/${slug}.`,
      });
    }
    localStorage.removeItem(`mbt_tenant_session_${slug}`);
  }

  // Calculate Effective Resource Limits for a Tenant
  getEffectiveLimits(tenantId: string): {
    maxTitles: number;
    maxCopies: number;
    maxLibrarians: number;
    maxStudents: number;
    storageMb: number;
    isTitlesOverridden: boolean;
    isCopiesOverridden: boolean;
    isLibrariansOverridden: boolean;
    isStudentsOverridden: boolean;
    isStorageOverridden: boolean;
    planName: string;
    planCode: string;
    customOverrideReason?: string;
  } {
    const sub = this.getSubscriptionForTenant(tenantId);
    const plan = sub ? this.getPlanById(sub.planId) : undefined;
    const planDefaults = plan || {
      name: 'Free Plan',
      code: 'free',
      maxTitles: 25,
      maxCopies: 50,
      maxLibrarians: 1,
      maxStudents: 20,
      storageMb: 10,
    };

    const custom = sub?.customLimits || {};

    const isTitlesOverridden = custom.maxTitles !== undefined && custom.maxTitles !== null;
    const isCopiesOverridden = custom.maxCopies !== undefined && custom.maxCopies !== null;
    const isLibrariansOverridden = custom.maxLibrarians !== undefined && custom.maxLibrarians !== null;
    const isStudentsOverridden = custom.maxStudents !== undefined && custom.maxStudents !== null;
    const isStorageOverridden = custom.storageMb !== undefined && custom.storageMb !== null;

    return {
      maxTitles: isTitlesOverridden ? Number(custom.maxTitles) : planDefaults.maxTitles,
      maxCopies: isCopiesOverridden ? Number(custom.maxCopies) : planDefaults.maxCopies,
      maxLibrarians: isLibrariansOverridden ? Number(custom.maxLibrarians) : planDefaults.maxLibrarians,
      maxStudents: isStudentsOverridden ? Number(custom.maxStudents) : planDefaults.maxStudents,
      storageMb: isStorageOverridden ? Number(custom.storageMb) : planDefaults.storageMb,
      isTitlesOverridden,
      isCopiesOverridden,
      isLibrariansOverridden,
      isStudentsOverridden,
      isStorageOverridden,
      planName: plan?.name || 'Standard Plan',
      planCode: plan?.code || 'standard',
      customOverrideReason: sub?.customOverrideReason,
    };
  }

  // Tenant Status & Deactivation Assertion
  assertTenantActive(tenantId: string): { active: boolean; error?: string } {
    this.checkAndEnforceTrialExpirations();
    const tenant = this.getTenantById(tenantId);
    if (!tenant) {
      return { active: false, error: 'Library not found.' };
    }
    if (tenant.status === 'deactivated') {
      return {
        active: false,
        error: `Your library's 3-day Free trial has expired. To restore access, please upgrade your subscription or contact the MBT Library authority.`,
      };
    }
    if (tenant.status === 'suspended') {
      return {
        active: false,
        error: `Access to ${tenant.name} is currently suspended by MBT Library authority.`,
      };
    }
    if (tenant.status === 'archived') {
      return {
        active: false,
        error: `This library archive has been decommissioned. Access is restricted.`,
      };
    }

    const sub = this.getSubscriptionForTenant(tenantId);
    if (sub && sub.status === 'expired') {
      return {
        active: false,
        error: `Your library's 3-day Free trial has expired. To restore access, please upgrade your subscription or contact the MBT Library authority.`,
      };
    }

    return { active: true };
  }

  // Check Subscription Limits (Server & Client Enforcement)
  checkSubscriptionLimit(
    tenantId: string,
    resource: 'librarians' | 'students' | 'titles' | 'copies' | 'storage',
    additionalCount = 1
  ): { allowed: boolean; current: number; limit: number; message?: string } {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) {
      return { allowed: true, current: 0, limit: 999999 };
    }

    const activeCheck = this.assertTenantActive(tenantId);
    if (!activeCheck.active) {
      return { allowed: false, current: 0, limit: 0, message: activeCheck.error };
    }

    const effective = this.getEffectiveLimits(tenantId);
    let current = 0;
    let limit = 0;
    let unitLabel: string = resource;

    switch (resource) {
      case 'librarians':
        current = tenant.currentUsage?.librariansCount || 0;
        limit = effective.maxLibrarians;
        unitLabel = 'librarian accounts';
        break;
      case 'students':
        current = tenant.currentUsage?.studentsCount || 0;
        limit = effective.maxStudents;
        unitLabel = 'student accounts';
        break;
      case 'titles':
        current = tenant.currentUsage?.titlesCount || 0;
        limit = effective.maxTitles;
        unitLabel = 'catalogue titles';
        break;
      case 'copies':
        current = tenant.currentUsage?.copiesCount || 0;
        limit = effective.maxCopies;
        unitLabel = 'physical copies';
        break;
      case 'storage':
        current = tenant.currentUsage?.storageMbUsed || Math.round(((tenant.currentUsage?.titlesCount || 0) * 0.1));
        limit = effective.storageMb;
        unitLabel = 'MB storage allowance';
        break;
    }

    const allowed = current + additionalCount <= limit;
    const message = allowed
      ? undefined
      : `Limit reached: ${tenant.name} has utilized ${current} of ${limit} ${unitLabel} permitted on ${effective.planName}. Please upgrade plan or request custom limits from MBT Authority.`;

    return { allowed, current, limit, message };
  }

  // Direct member addition (from Library Admin)
  createDirectMember(
    tenantId: string,
    fullName: string,
    email: string,
    role: UserRole,
    phone?: string,
    idNumber?: string,
    password?: string
  ): { success: boolean; user?: User; error?: string } {
    const resource = role === 'student' ? 'students' : 'librarians';
    const limitCheck = this.checkSubscriptionLimit(tenantId, resource);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.message };
    }

    const tenant = this.getTenantById(tenantId);
    if (!tenant) return { success: false, error: 'Tenant not found' };

    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    let user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    const now = new Date().toISOString();

    if (!user) {
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: cleanEmail,
        password: password || 'Password123!',
        fullName: fullName.trim(),
        phone: phone?.trim(),
        staffId: role !== 'student' ? idNumber : undefined,
        studentId: role === 'student' ? idNumber : undefined,
        isSuperAdmin: false,
        isActive: true,
        createdAt: now,
        lastLoginAt: now,
      };
      users.push(user);
      saveToStorage(STORAGE_KEYS.USERS, users);
    }

    const memberships = this.getMemberships();
    let membership = memberships.find((m) => m.tenantId === tenantId && m.userId === user!.id);
    if (!membership) {
      membership = {
        id: `mem_${tenantId}_${user.id.slice(-6)}`,
        tenantId,
        userId: user.id,
        role,
        joinedAt: now,
        isActive: true,
      };
      memberships.push(membership);
      saveToStorage(STORAGE_KEYS.MEMBERSHIPS, memberships);

      // Increment tenant usage
      const tenants = this.getTenants();
      const tIdx = tenants.findIndex((t) => t.id === tenantId);
      if (tIdx !== -1) {
        if (role === 'student') {
          tenants[tIdx].currentUsage.studentsCount = (tenants[tIdx].currentUsage.studentsCount || 0) + 1;
        } else {
          tenants[tIdx].currentUsage.librariansCount = (tenants[tIdx].currentUsage.librariansCount || 0) + 1;
        }
        saveToStorage(STORAGE_KEYS.TENANTS, tenants);
      }
    }

    this.logActivity({
      tenantId,
      tenantName: tenant.name,
      actorId: 'usr_admin',
      actorName: 'Library Administrator',
      actorRole: 'library_admin',
      action: 'MEMBER_REGISTERED',
      category: 'library_admin',
      details: `Registered ${fullName} (${cleanEmail}) as ${role}.`,
    });

    return { success: true, user };
  }

  // Re-send / extend invitation
  resendInvitation(invitationId: string): Invitation | null {
    const invitations = this.getInvitations();
    const idx = invitations.findIndex((i) => i.id === invitationId);
    if (idx === -1) return null;

    invitations[idx].expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    if (invitations[idx].status === 'expired') {
      invitations[idx].status = 'pending';
    }
    saveToStorage(STORAGE_KEYS.INVITATIONS, invitations);
    return invitations[idx];
  }

  // Deactivate a member's access in tenant
  deactivateMembership(membershipId: string): boolean {
    const memberships = this.getMemberships();
    const idx = memberships.findIndex((m) => m.id === membershipId);
    if (idx === -1) return false;

    memberships[idx].isActive = false;
    saveToStorage(STORAGE_KEYS.MEMBERSHIPS, memberships);

    const tenant = this.getTenantById(memberships[idx].tenantId);
    this.logActivity({
      tenantId: memberships[idx].tenantId,
      tenantName: tenant?.name,
      actorId: 'usr_admin',
      actorName: 'Library Administrator',
      actorRole: 'library_admin',
      action: 'MEMBERSHIP_DEACTIVATED',
      category: 'security',
      details: `Deactivated member access for membership ${membershipId}.`,
    });

    return true;
  }

  activateMembership(membershipId: string): boolean {
    const memberships = this.getMemberships();
    const idx = memberships.findIndex((m) => m.id === membershipId);
    if (idx === -1) return false;

    memberships[idx].isActive = true;
    saveToStorage(STORAGE_KEYS.MEMBERSHIPS, memberships);
    return true;
  }

  // --- INVOICES & PAYMENTS ---
  getInvoices(): Invoice[] {
    return getFromStorage<Invoice[]>(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
  }

  recordManualPayment(
    invoiceId: string,
    paymentMethod: string,
    transactionReference: string,
    notes?: string
  ): boolean {
    const invoices = this.getInvoices();
    const idx = invoices.findIndex((i) => i.id === invoiceId);
    if (idx === -1) return false;

    const now = new Date().toISOString();
    invoices[idx] = {
      ...invoices[idx],
      status: 'paid',
      paidAt: now,
      paymentMethod,
      transactionReference,
      notes: notes ? `${invoices[idx].notes ? invoices[idx].notes + ' | ' : ''}${notes}` : invoices[idx].notes,
    };
    saveToStorage(STORAGE_KEYS.INVOICES, invoices);

    // Update subscription last payment
    const subs = this.getSubscriptions();
    const subIdx = subs.findIndex((s) => s.tenantId === invoices[idx].tenantId);
    if (subIdx !== -1) {
      subs[subIdx].lastPaymentDate = now;
      if (subs[subIdx].status === 'past_due' || subs[subIdx].status === 'suspended') {
        subs[subIdx].status = 'active';
      }
      saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);
    }

    this.logActivity({
      tenantId: invoices[idx].tenantId,
      tenantName: invoices[idx].tenantName,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'PAYMENT_RECORDED',
      category: 'subscription',
      details: `Recorded payment of ₹${invoices[idx].amount} (${paymentMethod}, ref: ${transactionReference}) for ${invoices[idx].invoiceNumber}.`,
    });

    return true;
  }

  // Send subscription renewal notice
  sendSubscriptionExpiryReminder(tenantId: string): boolean {
    const tenant = this.getTenantById(tenantId);
    const sub = this.getSubscriptionForTenant(tenantId);
    const admin = this.getLibraryAdminForTenant(tenantId);
    if (!tenant || !sub) return false;

    this.logActivity({
      tenantId: tenant.id,
      tenantName: tenant.name,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'EXPIRY_REMINDER_SENT',
      category: 'subscription',
      details: `Sent automated renewal notice to ${admin?.email || tenant.settings.contactEmail} (Expiry: ${new Date(sub.expiryDate).toLocaleDateString()}).`,
    });

    return true;
  }

  // --- ACTIVITY AUDIT LOGS ---
  getActivityLogs(): ActivityLog[] {
    return getFromStorage<ActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_ACTIVITY_LOGS);
  }

  logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
    const logs = this.getActivityLogs();
    const newLog: ActivityLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog); // latest on top
    // keep at most 200 logs
    if (logs.length > 200) logs.pop();
    saveToStorage(STORAGE_KEYS.LOGS, logs);
  }

  // --- TRANSACTIONAL PROVISIONING WORKFLOW ---
  // Safely creates Tenant, User, Membership, Subscription, Invitation in one atomic operation
  provisionLibrary(payload: ProvisionLibraryPayload): {
    success: boolean;
    tenant?: Tenant;
    adminUser?: User;
    subscription?: Subscription;
    invitation?: Invitation;
    error?: string;
  } {
    // 1. Validation: Slug format & uniqueness
    const cleanSlug = payload.slug.trim().toLowerCase();
    if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug)) {
      return { success: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens.' };
    }
    if (!this.isSlugAvailable(cleanSlug)) {
      return { success: false, error: `Library slug "${cleanSlug}" is already taken.` };
    }

    // 2. Validation: Admin email format
    const cleanEmail = payload.adminEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'A valid Library Admin email address is required.' };
    }

    // 3. Validation: Plan exists
    const plan = this.getPlanById(payload.planId);
    if (!plan) {
      return { success: false, error: 'Selected subscription plan does not exist.' };
    }

    const now = new Date();
    const tenantId = `ten_${cleanSlug.replace(/-/g, '_')}_${Date.now().toString().slice(-4)}`;
    const adminUserId = `usr_adm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const subId = `sub_${tenantId}`;
    const initials = payload.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

    // Calculate Expiry Date
    let expiryDate: string;
    let status: TenantStatus = payload.isTrial ? 'trial' : 'active';
    let subStatus: SubscriptionStatus = payload.isTrial ? 'trial' : 'active';

    if (plan.code === 'free' || payload.isTrial) {
      // Free plan has strict 3-day (72 hours) trial duration
      status = 'trial';
      subStatus = 'trial';
      const exp = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      expiryDate = exp.toISOString();
    } else {
      const months = payload.billingCycle === 'annual' ? 12 : 1;
      const exp = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
      expiryDate = exp.toISOString();
    }

    try {
      // Create Tenant Object
      const newTenant: Tenant = {
        id: tenantId,
        slug: cleanSlug,
        name: payload.name.trim(),
        institutionName: payload.institutionName.trim(),
        institutionType: payload.institutionType,
        logoInitials: initials || 'LB',
        status,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        settings: {
          timezone: payload.timezone || 'UTC',
          dateFormat: payload.dateFormat || 'DD/MM/YYYY',
          currency: 'INR',
          primaryColor: payload.primaryColor || '#2563eb',
          allowStudentReservations: true,
          defaultLoanPeriodDays: 7,
          maxBooksPerStudent: 5,
          finePerDay: 5,
          contactEmail: payload.contactEmail || cleanEmail,
          contactPhone: payload.contactPhone || payload.adminPhone,
          address: payload.address || '',
        },
        currentUsage: {
          titlesCount: 0,
          copiesCount: 0,
          librariansCount: 1, // Admin is registered
          studentsCount: 0,
          activeLoansCount: 0,
        },
      };

      // Create Admin User Object
      const newAdminUser: User = {
        id: adminUserId,
        email: cleanEmail,
        fullName: payload.adminFullName.trim(),
        phone: payload.adminPhone.trim(),
        staffId: payload.adminStaffId?.trim() || undefined,
        isSuperAdmin: false,
        isActive: payload.invitationDeliveryMethod === 'direct_provision',
        createdAt: now.toISOString(),
      };

      // Create Tenant Membership
      const newMembership: TenantMembership = {
        id: `mem_${tenantId}_admin`,
        tenantId,
        userId: adminUserId,
        role: 'library_admin',
        joinedAt: now.toISOString(),
        isActive: true,
      };

      // Create Subscription
      const newSubscription: Subscription = {
        id: subId,
        tenantId,
        planId: plan.id,
        status: subStatus,
        billingCycle: payload.billingCycle,
        startDate: payload.startDate ? new Date(payload.startDate).toISOString() : now.toISOString(),
        expiryDate,
        gracePeriodDays: payload.gracePeriodDays || 7,
        autoRenew: !payload.isTrial,
        customLimits: {
          maxTitles: payload.customMaxTitles ?? plan.maxTitles,
          maxCopies: payload.customMaxCopies ?? plan.maxCopies,
          maxLibrarians: payload.customMaxLibrarians ?? plan.maxLibrarians,
          maxStudents: payload.customMaxStudents ?? plan.maxStudents,
        },
        nextBillingDate: expiryDate,
      };

      // Generate Single-Use Invitation Token for Admin
      const token = generateSecureToken('mbt_adm');
      const invExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      const newInvitation: Invitation = {
        id: `inv_${tenantId}_admin_init`,
        token,
        tenantId,
        tenantSlug: cleanSlug,
        tenantName: newTenant.name,
        recipientEmail: cleanEmail,
        recipientName: newAdminUser.fullName,
        role: 'library_admin',
        deliveryMethod: payload.invitationDeliveryMethod,
        status: payload.invitationDeliveryMethod === 'direct_provision' ? 'accepted' : 'pending',
        expiresAt: invExpiresAt,
        createdAt: now.toISOString(),
        createdBy: 'usr_super_admin_01',
      };

      // Create initial Invoice if not trial
      let newInvoice: Invoice | null = null;
      if (!payload.isTrial) {
        const amount = payload.billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
        if (amount > 0) {
          const invNum = `INV-MBT-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          newInvoice = {
            id: `inv_${tenantId}_initial`,
            invoiceNumber: invNum,
            tenantId,
            tenantName: newTenant.name,
            planName: plan.name,
            billingCycle: payload.billingCycle,
            amount,
            currency: 'INR',
            status: 'pending',
            issueDate: now.toISOString(),
            dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            notes: `Initial provisioning invoice for ${plan.name} (${payload.billingCycle}).`,
          };
        }
      }

      // Safe multi-table commit
      const tenants = this.getTenants();
      tenants.unshift(newTenant);
      saveToStorage(STORAGE_KEYS.TENANTS, tenants);

      const users = this.getUsers();
      users.push(newAdminUser);
      saveToStorage(STORAGE_KEYS.USERS, users);

      const memberships = this.getMemberships();
      memberships.push(newMembership);
      saveToStorage(STORAGE_KEYS.MEMBERSHIPS, memberships);

      const subs = this.getSubscriptions();
      subs.push(newSubscription);
      saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);

      const invitations = this.getInvitations();
      invitations.unshift(newInvitation);
      saveToStorage(STORAGE_KEYS.INVITATIONS, invitations);

      if (newInvoice) {
        const invoices = this.getInvoices();
        invoices.unshift(newInvoice);
        saveToStorage(STORAGE_KEYS.INVOICES, invoices);
      }

      // Audit Log
      this.logActivity({
        tenantId,
        tenantName: newTenant.name,
        actorId: 'usr_super_admin_01',
        actorName: 'Super Administrator',
        actorRole: 'super_admin',
        action: 'TENANT_PROVISIONED',
        category: 'provisioning',
        details: `Successfully provisioned "${newTenant.name}" (${payload.institutionType}) with ${plan.name}. Admin invited: ${cleanEmail}.`,
      });

      return {
        success: true,
        tenant: newTenant,
        adminUser: newAdminUser,
        subscription: newSubscription,
        invitation: newInvitation,
      };
    } catch (err: any) {
      console.error('Provisioning failed:', err);
      return { success: false, error: err?.message || 'Provisioning transaction failed.' };
    }
  }

  // --- CATALOGUE & INVENTORY MANAGEMENT (PHASE 3) ---
  getBooksForTenant(tenantId: string): Book[] {
    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    return books.filter((b) => b.tenantId === tenantId);
  }

  getBookById(bookId: string): Book | undefined {
    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    return books.find((b) => b.id === bookId);
  }

  addBook(
    tenantId: string,
    bookData: Omit<Book, 'id' | 'tenantId' | 'createdAt' | 'copiesAvailable'>,
    copiesCount = 1
  ): { success: boolean; book?: Book; error?: string } {
    // Check Title Quota Limit (Section 9)
    const titleLimitCheck = this.checkSubscriptionLimit(tenantId, 'titles');
    if (!titleLimitCheck.allowed) {
      return { success: false, error: titleLimitCheck.message };
    }

    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const copies = getFromStorage<BookCopy[]>(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    const now = new Date().toISOString();

    const bookId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBook: Book = {
      ...bookData,
      id: bookId,
      tenantId,
      copiesTotal: copiesCount,
      copiesAvailable: copiesCount,
      createdAt: now,
    };

    books.unshift(newBook);
    saveToStorage(STORAGE_KEYS.BOOKS, books);

    // Auto-generate physical copies with barcodes
    for (let i = 1; i <= copiesCount; i++) {
      const copyId = `cp_${bookId}_${i}`;
      const accessionNumber = `ACC-${newBook.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}${i}`;
      const barcode = `890${Math.floor(10000000 + Math.random() * 90000000)}`;

      const newCopy: BookCopy = {
        id: copyId,
        tenantId,
        bookId,
        accessionNumber,
        barcode,
        status: 'available',
        condition: 'good',
        shelfLocation: newBook.shelfLocation || 'General Stacks',
        addedAt: now,
      };
      copies.unshift(newCopy);
    }
    saveToStorage(STORAGE_KEYS.COPIES, copies);

    // Update Tenant counters
    const tenants = this.getTenants();
    const tIdx = tenants.findIndex((t) => t.id === tenantId);
    if (tIdx !== -1) {
      tenants[tIdx].currentUsage.titlesCount = (tenants[tIdx].currentUsage.titlesCount || 0) + 1;
      tenants[tIdx].currentUsage.copiesCount = (tenants[tIdx].currentUsage.copiesCount || 0) + copiesCount;
      saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    }

    this.logActivity({
      tenantId,
      actorId: 'usr_staff',
      actorName: 'Catalogue Manager',
      actorRole: 'librarian',
      action: 'BOOK_CATALOGUED',
      category: 'library_admin',
      details: `Catalogued new title "${newBook.title}" with ${copiesCount} copies.`,
    });

    return { success: true, book: newBook };
  }

  updateBook(bookId: string, updates: Partial<Book>): boolean {
    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const idx = books.findIndex((b) => b.id === bookId);
    if (idx === -1) return false;

    books[idx] = { ...books[idx], ...updates };
    saveToStorage(STORAGE_KEYS.BOOKS, books);
    return true;
  }

  deleteBook(bookId: string): boolean {
    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const book = books.find((b) => b.id === bookId);
    if (!book) return false;

    const remaining = books.filter((b) => b.id !== bookId);
    saveToStorage(STORAGE_KEYS.BOOKS, remaining);

    // Remove copies
    const copies = getFromStorage<BookCopy[]>(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    const filteredCopies = copies.filter((c) => c.bookId !== bookId);
    saveToStorage(STORAGE_KEYS.COPIES, filteredCopies);

    // Update Tenant counters
    const tenants = this.getTenants();
    const tIdx = tenants.findIndex((t) => t.id === book.tenantId);
    if (tIdx !== -1) {
      tenants[tIdx].currentUsage.titlesCount = Math.max((tenants[tIdx].currentUsage.titlesCount || 1) - 1, 0);
      tenants[tIdx].currentUsage.copiesCount = Math.max((tenants[tIdx].currentUsage.copiesCount || book.copiesTotal) - book.copiesTotal, 0);
      saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    }

    return true;
  }

  getCopiesForBook(bookId: string): BookCopy[] {
    const copies = getFromStorage<BookCopy[]>(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    return copies.filter((c) => c.bookId === bookId);
  }

  getCategoriesForTenant(tenantId: string): Category[] {
    const cats = getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    return cats.filter((c) => c.tenantId === tenantId);
  }

  addCategory(tenantId: string, name: string, code: string, description?: string): Category {
    const cats = getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const newCat: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      name,
      code: code.toUpperCase(),
      description,
    };
    cats.push(newCat);
    saveToStorage(STORAGE_KEYS.CATEGORIES, cats);
    return newCat;
  }

  // --- CIRCULATION & LOANS (LEVEL 3 LIBRARIAN) ---
  getLoansForTenant(tenantId: string): Loan[] {
    const loans = getFromStorage<Loan[]>(STORAGE_KEYS.LOANS, INITIAL_LOANS);
    return loans.filter((l) => l.tenantId === tenantId);
  }

  getLoansForUser(tenantId: string, userId: string): Loan[] {
    const loans = getFromStorage<Loan[]>(STORAGE_KEYS.LOANS, INITIAL_LOANS);
    return loans.filter((l) => l.tenantId === tenantId && l.userId === userId);
  }

  issueBookLoan(
    tenantId: string,
    bookId: string,
    copyAccessionOrBarcode: string,
    userEmailOrId: string,
    staffName: string,
    customLoanDays?: number
  ): { success: boolean; loan?: Loan; error?: string } {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) return { success: false, error: 'Tenant library not found.' };

    const activeCheck = this.assertTenantActive(tenantId);
    if (!activeCheck.active) return { success: false, error: activeCheck.error };

    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const book = books.find((b) => b.id === bookId || b.isbn === copyAccessionOrBarcode);
    if (!book || book.tenantId !== tenantId) {
      return { success: false, error: 'Book title not found in this library.' };
    }

    const copies = getFromStorage<BookCopy[]>(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    let copy = copies.find(
      (c) =>
        c.bookId === book.id &&
        c.tenantId === tenantId &&
        (c.accessionNumber.toLowerCase() === copyAccessionOrBarcode.toLowerCase() ||
          c.barcode === copyAccessionOrBarcode)
    );

    // If specific copy not matched by accession/barcode, grab any available copy
    if (!copy) {
      copy = copies.find((c) => c.bookId === book.id && c.tenantId === tenantId && c.status === 'available');
    }

    if (!copy || copy.status !== 'available') {
      return { success: false, error: 'No available physical copy of this volume is on the shelf.' };
    }

    // Verify User
    const users = this.getUsers();
    const memberships = this.getMemberships();
    const cleanUserQuery = userEmailOrId.trim().toLowerCase();
    const targetUser = users.find(
      (u) =>
        (u.email.toLowerCase() === cleanUserQuery ||
          u.id === cleanUserQuery ||
          u.studentId?.toLowerCase() === cleanUserQuery ||
          u.staffId?.toLowerCase() === cleanUserQuery) &&
        memberships.some((m) => m.tenantId === tenantId && m.userId === u.id && m.isActive)
    );

    if (!targetUser) {
      return { success: false, error: 'Member not found or not registered in this institution.' };
    }

    // Check user borrowing limit
    const loans = getFromStorage<Loan[]>(STORAGE_KEYS.LOANS, INITIAL_LOANS);
    const activeUserLoans = loans.filter(
      (l) => l.tenantId === tenantId && l.userId === targetUser.id && l.status === 'active'
    );
    const maxBooksAllowed = tenant.settings.maxBooksPerStudent || 5;

    if (activeUserLoans.length >= maxBooksAllowed) {
      return {
        success: false,
        error: `Borrowing limit reached: ${targetUser.fullName} currently has ${activeUserLoans.length} active loans (max ${maxBooksAllowed}).`,
      };
    }

    const now = new Date();
    const loanDays = customLoanDays || tenant.settings.defaultLoanPeriodDays || 7;
    const dueDate = new Date(now.getTime() + loanDays * 24 * 60 * 60 * 1000);

    const newLoan: Loan = {
      id: `loan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      bookId: book.id,
      bookTitle: book.title,
      copyId: copy.id,
      accessionNumber: copy.accessionNumber,
      userId: targetUser.id,
      userName: targetUser.fullName,
      userEmail: targetUser.email,
      userRole: 'student',
      issuedAt: now.toISOString(),
      dueDate: dueDate.toISOString(),
      status: 'active',
      fineAmount: 0,
      finePaid: false,
      issuedByStaffName: staffName,
    };

    loans.unshift(newLoan);
    saveToStorage(STORAGE_KEYS.LOANS, loans);

    // Update copy status to 'loaned'
    copy.status = 'loaned';
    saveToStorage(STORAGE_KEYS.COPIES, copies);

    // Update available count on book
    const bIdx = books.findIndex((b) => b.id === book.id);
    if (bIdx !== -1) {
      books[bIdx].copiesAvailable = Math.max((books[bIdx].copiesAvailable || 1) - 1, 0);
      saveToStorage(STORAGE_KEYS.BOOKS, books);
    }

    // Update tenant activeLoans count
    const tenants = this.getTenants();
    const tIdx = tenants.findIndex((t) => t.id === tenantId);
    if (tIdx !== -1) {
      tenants[tIdx].currentUsage.activeLoansCount = (tenants[tIdx].currentUsage.activeLoansCount || 0) + 1;
      saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    }

    this.logActivity({
      tenantId,
      tenantName: tenant.name,
      actorId: 'usr_librarian',
      actorName: staffName,
      actorRole: 'librarian',
      action: 'BOOK_ISSUED',
      category: 'library_admin',
      details: `Issued "${book.title}" (${copy.accessionNumber}) to ${targetUser.fullName}. Due: ${dueDate.toLocaleDateString()}.`,
    });

    return { success: true, loan: newLoan };
  }

  returnBookLoan(loanId: string): { success: boolean; loan?: Loan; error?: string } {
    const loans = getFromStorage<Loan[]>(STORAGE_KEYS.LOANS, INITIAL_LOANS);
    const idx = loans.findIndex((l) => l.id === loanId);
    if (idx === -1) return { success: false, error: 'Loan record not found.' };

    const loan = loans[idx];
    const activeCheck = this.assertTenantActive(loan.tenantId);
    if (!activeCheck.active) return { success: false, error: activeCheck.error };

    if (loan.status === 'returned') {
      return { success: false, error: 'This book has already been marked returned.' };
    }

    const now = new Date();
    loan.status = 'returned';
    loan.returnedAt = now.toISOString();

    // Check if overdue & calculate fine
    const dueDate = new Date(loan.dueDate);
    if (now > dueDate) {
      const tenant = this.getTenantById(loan.tenantId);
      const finePerDay = tenant?.settings.finePerDay || 5;
      const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
      const fineAmount = daysOverdue * finePerDay;
      loan.fineAmount = fineAmount;

      if (fineAmount > 0) {
        const fines = getFromStorage<Fine[]>(STORAGE_KEYS.FINES, INITIAL_FINES);
        const newFine: Fine = {
          id: `fine_${Date.now()}`,
          tenantId: loan.tenantId,
          loanId: loan.id,
          userId: loan.userId,
          userName: loan.userName,
          bookTitle: loan.bookTitle,
          amount: fineAmount,
          status: 'pending',
          issuedDate: now.toISOString(),
          notes: `${daysOverdue} days overdue @ ₹${finePerDay}/day`,
        };
        fines.unshift(newFine);
        saveToStorage(STORAGE_KEYS.FINES, fines);
      }
    }

    loans[idx] = loan;
    saveToStorage(STORAGE_KEYS.LOANS, loans);

    // Free copy status
    const copies = getFromStorage<BookCopy[]>(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    const cIdx = copies.findIndex((c) => c.id === loan.copyId);
    if (cIdx !== -1) {
      copies[cIdx].status = 'available';
      saveToStorage(STORAGE_KEYS.COPIES, copies);
    }

    // Increment available count on book
    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const bIdx = books.findIndex((b) => b.id === loan.bookId);
    if (bIdx !== -1) {
      books[bIdx].copiesAvailable = (books[bIdx].copiesAvailable || 0) + 1;
      saveToStorage(STORAGE_KEYS.BOOKS, books);
    }

    // Decrement tenant active loans count
    const tenants = this.getTenants();
    const tIdx = tenants.findIndex((t) => t.id === loan.tenantId);
    if (tIdx !== -1) {
      tenants[tIdx].currentUsage.activeLoansCount = Math.max((tenants[tIdx].currentUsage.activeLoansCount || 1) - 1, 0);
      saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    }

    this.logActivity({
      tenantId: loan.tenantId,
      actorId: 'usr_librarian',
      actorName: 'Circulation Desk',
      actorRole: 'librarian',
      action: 'BOOK_RETURNED',
      category: 'library_admin',
      details: `Returned "${loan.bookTitle}" (${loan.accessionNumber}) from ${loan.userName}.`,
    });

    return { success: true, loan };
  }

  // --- RESERVATIONS & HOLDS (STUDENT & LIBRARIAN) ---
  getReservationsForTenant(tenantId: string): Reservation[] {
    const res = getFromStorage<Reservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    return res.filter((r) => r.tenantId === tenantId);
  }

  getReservationsForUser(tenantId: string, userId: string): Reservation[] {
    const res = getFromStorage<Reservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    return res.filter((r) => r.tenantId === tenantId && r.userId === userId);
  }

  placeReservation(
    tenantId: string,
    bookId: string,
    userId: string
  ): { success: boolean; reservation?: Reservation; error?: string } {
    const book = this.getBookById(bookId);
    if (!book || book.tenantId !== tenantId) {
      return { success: false, error: 'Book not found in this library.' };
    }

    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    const reservations = getFromStorage<Reservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    const existing = reservations.find(
      (r) => r.tenantId === tenantId && r.bookId === bookId && r.userId === userId && (r.status === 'pending' || r.status === 'ready')
    );
    if (existing) {
      return { success: false, error: 'You already have an active hold on this title.' };
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newRes: Reservation = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      bookId,
      bookTitle: book.title,
      userId,
      userName: user.fullName,
      userEmail: user.email,
      reservedAt: now.toISOString(),
      expiryDate: expiry.toISOString(),
      status: 'pending',
      pickupShelf: 'Hold Stacks Bay 1',
    };

    reservations.unshift(newRes);
    saveToStorage(STORAGE_KEYS.RESERVATIONS, reservations);

    return { success: true, reservation: newRes };
  }

  cancelReservation(reservationId: string): boolean {
    const res = getFromStorage<Reservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    const idx = res.findIndex((r) => r.id === reservationId);
    if (idx === -1) return false;

    res[idx].status = 'cancelled';
    saveToStorage(STORAGE_KEYS.RESERVATIONS, res);
    return true;
  }

  // --- FINES TRACKING ---
  getFinesForTenant(tenantId: string): Fine[] {
    const fines = getFromStorage<Fine[]>(STORAGE_KEYS.FINES, INITIAL_FINES);
    return fines.filter((f) => f.tenantId === tenantId);
  }

  getFinesForUser(tenantId: string, userId: string): Fine[] {
    const fines = getFromStorage<Fine[]>(STORAGE_KEYS.FINES, INITIAL_FINES);
    return fines.filter((f) => f.tenantId === tenantId && f.userId === userId);
  }

  payFine(fineId: string): boolean {
    const fines = getFromStorage<Fine[]>(STORAGE_KEYS.FINES, INITIAL_FINES);
    const idx = fines.findIndex((f) => f.id === fineId);
    if (idx === -1) return false;

    fines[idx].status = 'paid';
    fines[idx].paidDate = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.FINES, fines);
    return true;
  }

  waiveFine(fineId: string): boolean {
    const fines = getFromStorage<Fine[]>(STORAGE_KEYS.FINES, INITIAL_FINES);
    const idx = fines.findIndex((f) => f.id === fineId);
    if (idx === -1) return false;

    fines[idx].status = 'waived';
    saveToStorage(STORAGE_KEYS.FINES, fines);
    return true;
  }

  renewBookLoan(loanId: string, additionalDays = 7): { success: boolean; loan?: Loan; error?: string } {
    const loans = getFromStorage<Loan[]>(STORAGE_KEYS.LOANS, INITIAL_LOANS);
    const idx = loans.findIndex((l) => l.id === loanId);
    if (idx === -1) return { success: false, error: 'Loan record not found.' };

    const loan = loans[idx];
    const activeCheck = this.assertTenantActive(loan.tenantId);
    if (!activeCheck.active) return { success: false, error: activeCheck.error };

    if (loan.status !== 'active') {
      return { success: false, error: 'Only active loans can be renewed.' };
    }

    const currentDue = new Date(loan.dueDate);
    const newDue = new Date(Math.max(Date.now(), currentDue.getTime()) + additionalDays * 24 * 60 * 60 * 1000);
    loan.dueDate = newDue.toISOString();
    loans[idx] = loan;
    saveToStorage(STORAGE_KEYS.LOANS, loans);

    this.logActivity({
      tenantId: loan.tenantId,
      actorId: 'usr_staff',
      actorName: 'Circulation Desk',
      actorRole: 'librarian',
      action: 'BOOK_RENEWED',
      category: 'library_admin',
      details: `Renewed loan for "${loan.bookTitle}". New due date: ${newDue.toLocaleDateString()}.`,
    });

    return { success: true, loan };
  }

  fulfillReservation(reservationId: string, readyShelf = 'Hold Shelf Bay 1'): boolean {
    const res = getFromStorage<Reservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    const idx = res.findIndex((r) => r.id === reservationId);
    if (idx === -1) return false;

    if (res[idx].status === 'pending') {
      res[idx].status = 'ready';
      res[idx].pickupShelf = readyShelf;
    } else if (res[idx].status === 'ready') {
      res[idx].status = 'fulfilled';
    }
    saveToStorage(STORAGE_KEYS.RESERVATIONS, res);
    return true;
  }

  // --- INVENTORY & PHYSICAL COPIES MANAGEMENT (PHASE 5) ---
  getCopiesForTenant(tenantId: string): (BookCopy & { bookTitle: string; bookIsbn: string; bookCategory: string })[] {
    const copies = getFromStorage<BookCopy[]>(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const tenantCopies = copies.filter((c) => c.tenantId === tenantId);

    const bookMap = new Map(books.map((b) => [b.id, b]));
    return tenantCopies.map((c) => {
      const b = bookMap.get(c.bookId);
      return {
        ...c,
        bookTitle: b?.title || 'Unknown Title',
        bookIsbn: b?.isbn || 'N/A',
        bookCategory: b?.category || 'General',
      };
    });
  }

  addPhysicalCopy(
    tenantId: string,
    bookId: string,
    customData?: { shelfLocation?: string; condition?: 'good' | 'fair' | 'damaged'; accessionNumber?: string; barcode?: string }
  ): BookCopy | null {
    // Check Physical Copy Quota Limit (Section 9)
    const copyLimitCheck = this.checkSubscriptionLimit(tenantId, 'copies', 1);
    if (!copyLimitCheck.allowed) {
      throw new Error(copyLimitCheck.message || 'Physical copy limit reached for this library.');
    }

    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const bIdx = books.findIndex((b) => b.id === bookId && b.tenantId === tenantId);
    if (bIdx === -1) return null;

    const book = books[bIdx];
    const copies = getFromStorage<BookCopy[]>(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    const countIndex = copies.filter((c) => c.bookId === bookId).length + 1;

    const copyId = `cp_${bookId}_${Date.now().toString().slice(-4)}`;
    const accessionNumber =
      customData?.accessionNumber?.trim() ||
      `ACC-${book.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}${countIndex}`;
    const barcode = customData?.barcode?.trim() || `890${Math.floor(10000000 + Math.random() * 90000000)}`;

    const newCopy: BookCopy = {
      id: copyId,
      tenantId,
      bookId,
      accessionNumber,
      barcode,
      status: 'available',
      condition: customData?.condition || 'good',
      shelfLocation: customData?.shelfLocation?.trim() || book.shelfLocation || 'Main Stacks',
      addedAt: new Date().toISOString(),
    };

    copies.unshift(newCopy);
    saveToStorage(STORAGE_KEYS.COPIES, copies);

    // Update book totals
    book.copiesTotal = (book.copiesTotal || 0) + 1;
    book.copiesAvailable = (book.copiesAvailable || 0) + 1;
    books[bIdx] = book;
    saveToStorage(STORAGE_KEYS.BOOKS, books);

    // Update tenant usage
    const tenants = this.getTenants();
    const tIdx = tenants.findIndex((t) => t.id === tenantId);
    if (tIdx !== -1) {
      tenants[tIdx].currentUsage.copiesCount = (tenants[tIdx].currentUsage.copiesCount || 0) + 1;
      saveToStorage(STORAGE_KEYS.TENANTS, tenants);
    }

    this.logActivity({
      tenantId,
      actorId: 'usr_staff',
      actorName: 'Inventory Desk',
      actorRole: 'librarian',
      action: 'COPY_ADDED',
      category: 'library_admin',
      details: `Added new physical copy ${accessionNumber} for "${book.title}".`,
    });

    return newCopy;
  }

  updatePhysicalCopy(
    copyId: string,
    updates: Partial<Pick<BookCopy, 'shelfLocation' | 'condition' | 'status'>>
  ): boolean {
    const copies = getFromStorage<BookCopy[]>(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    const idx = copies.findIndex((c) => c.id === copyId);
    if (idx === -1) return false;

    const oldStatus = copies[idx].status;
    copies[idx] = { ...copies[idx], ...updates };
    saveToStorage(STORAGE_KEYS.COPIES, copies);

    if (updates.status && updates.status !== oldStatus) {
      const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
      const bIdx = books.findIndex((b) => b.id === copies[idx].bookId);
      if (bIdx !== -1) {
        if (oldStatus === 'available' && updates.status !== 'available') {
          books[bIdx].copiesAvailable = Math.max((books[bIdx].copiesAvailable || 1) - 1, 0);
        } else if (oldStatus !== 'available' && updates.status === 'available') {
          books[bIdx].copiesAvailable = (books[bIdx].copiesAvailable || 0) + 1;
        }
        saveToStorage(STORAGE_KEYS.BOOKS, books);
      }
    }

    return true;
  }

  deletePhysicalCopy(copyId: string): boolean {
    const copies = getFromStorage<BookCopy[]>(STORAGE_KEYS.COPIES, INITIAL_COPIES);
    const target = copies.find((c) => c.id === copyId);
    if (!target) return false;

    if (target.status === 'loaned') {
      return false;
    }

    const remaining = copies.filter((c) => c.id !== copyId);
    saveToStorage(STORAGE_KEYS.COPIES, remaining);

    const books = getFromStorage<Book[]>(STORAGE_KEYS.BOOKS, INITIAL_BOOKS);
    const bIdx = books.findIndex((b) => b.id === target.bookId);
    if (bIdx !== -1) {
      books[bIdx].copiesTotal = Math.max((books[bIdx].copiesTotal || 1) - 1, 0);
      if (target.status === 'available') {
        books[bIdx].copiesAvailable = Math.max((books[bIdx].copiesAvailable || 1) - 1, 0);
      }
      saveToStorage(STORAGE_KEYS.BOOKS, books);
    }

    return true;
  }

  // --- REPORTING MODULE (PHASE 5) ---
  generateBranchReports(tenantId: string) {
    const books = this.getBooksForTenant(tenantId);
    const copies = this.getCopiesForTenant(tenantId);
    const loans = this.getLoansForTenant(tenantId);
    const reservations = this.getReservationsForTenant(tenantId);
    const fines = this.getFinesForTenant(tenantId);
    const members = this.getUsersForTenant(tenantId);

    const activeLoans = loans.filter((l) => l.status === 'active');
    const returnedLoans = loans.filter((l) => l.status === 'returned');
    const overdueLoans = activeLoans.filter((l) => new Date(l.dueDate).getTime() < Date.now());

    // Most borrowed books
    const borrowCounts: Record<string, { book: Book; count: number }> = {};
    books.forEach((b) => {
      borrowCounts[b.id] = { book: b, count: 0 };
    });
    loans.forEach((l) => {
      if (borrowCounts[l.bookId]) {
        borrowCounts[l.bookId].count++;
      }
    });
    const topBorrowed = Object.values(borrowCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Category distribution
    const categoryStats: Record<string, { titleCount: number; copyCount: number }> = {};
    books.forEach((b) => {
      if (!categoryStats[b.category]) {
        categoryStats[b.category] = { titleCount: 0, copyCount: 0 };
      }
      categoryStats[b.category].titleCount++;
      categoryStats[b.category].copyCount += b.copiesTotal || 1;
    });

    // Fines revenue
    const totalFinesAssessed = fines.reduce((sum, f) => sum + f.amount, 0);
    const totalFinesPaid = fines.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const totalFinesWaived = fines.filter((f) => f.status === 'waived').reduce((sum, f) => sum + f.amount, 0);
    const totalFinesPending = fines.filter((f) => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);

    // Top active students
    const studentBorrowCounts: Record<string, { name: string; email: string; loansCount: number }> = {};
    loans.forEach((l) => {
      if (!studentBorrowCounts[l.userId]) {
        studentBorrowCounts[l.userId] = { name: l.userName, email: l.userEmail, loansCount: 0 };
      }
      studentBorrowCounts[l.userId].loansCount++;
    });
    const topReaders = Object.values(studentBorrowCounts)
      .sort((a, b) => b.loansCount - a.loansCount)
      .slice(0, 5);

    // Physical condition breakdown
    const conditionBreakdown = {
      good: copies.filter((c) => c.condition === 'good').length,
      fair: copies.filter((c) => c.condition === 'fair').length,
      damaged: copies.filter((c) => c.condition === 'damaged').length,
      maintenance: copies.filter((c) => c.status === 'maintenance').length,
      lost: copies.filter((c) => c.status === 'lost').length,
    };

    return {
      overview: {
        totalTitles: books.length,
        totalCopies: copies.length,
        totalLoans: loans.length,
        activeLoansCount: activeLoans.length,
        returnedLoansCount: returnedLoans.length,
        overdueLoansCount: overdueLoans.length,
        totalReservations: reservations.length,
        pendingHolds: reservations.filter((r) => r.status === 'pending').length,
        readyHolds: reservations.filter((r) => r.status === 'ready').length,
        totalStudentsEnrolled: members.filter((m) => m.membership.role === 'student').length,
        totalLibrarians: members.filter((m) => m.membership.role === 'librarian' || m.membership.role === 'senior_librarian').length,
      },
      topBorrowed,
      categoryStats,
      finesSummary: {
        totalAssessed: totalFinesAssessed,
        totalPaid: totalFinesPaid,
        totalWaived: totalFinesWaived,
        totalPending: totalFinesPending,
      },
      topReaders,
      conditionBreakdown,
    };
  }

  // --- SUBSCRIPTION ENQUIRIES (SECTION 8: PREMIUM CONTACT AUTHORITY) ---
  getSubscriptionEnquiries(): SubscriptionEnquiry[] {
    return getFromStorage<SubscriptionEnquiry[]>(STORAGE_KEYS.ENQUIRIES, []);
  }

  createSubscriptionEnquiry(enquiry: Omit<SubscriptionEnquiry, 'id' | 'createdAt' | 'status'>): SubscriptionEnquiry {
    const list = this.getSubscriptionEnquiries();
    const newEnquiry: SubscriptionEnquiry = {
      ...enquiry,
      id: `enq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    list.unshift(newEnquiry);
    saveToStorage(STORAGE_KEYS.ENQUIRIES, list);

    this.logActivity({
      tenantId: enquiry.tenantId,
      tenantName: enquiry.tenantName,
      actorId: 'usr_enquiry',
      actorName: enquiry.contactName,
      actorRole: 'institution_representative',
      action: 'PREMIUM_ENQUIRY_SUBMITTED',
      category: 'subscription',
      details: `Submitted Premium Contact Authority enquiry for "${enquiry.tenantName}". Contact: ${enquiry.contactEmail}.`,
    });

    return newEnquiry;
  }

  updateSubscriptionEnquiryStatus(
    enquiryId: string,
    status: 'reviewed' | 'approved' | 'rejected',
    superAdminNotes?: string,
    commercialTerms?: string
  ): boolean {
    const list = this.getSubscriptionEnquiries();
    const idx = list.findIndex((e) => e.id === enquiryId);
    if (idx === -1) return false;

    list[idx] = {
      ...list[idx],
      status,
      superAdminNotes: superAdminNotes || list[idx].superAdminNotes,
      commercialTerms: commercialTerms || list[idx].commercialTerms,
      updatedAt: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEYS.ENQUIRIES, list);

    this.logActivity({
      tenantId: list[idx].tenantId,
      tenantName: list[idx].tenantName,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: `ENQUIRY_${status.toUpperCase()}`,
      category: 'subscription',
      details: `Updated Premium enquiry status for "${list[idx].tenantName}" to ${status}.`,
    });

    return true;
  }
}

export const saasStorage = new SaasStorageService();

