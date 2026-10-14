/**
 * Real API client for MBT Library
 * Connects directly to backend Express server and Cloud SQL PostgreSQL database.
 * No mock fallbacks: all writes, transactions, and state changes persist to database.
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
}

export const apiClient = {
  // --- HEALTH ---
  async getHealth() {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    return res.json();
  },

  // --- TENANTS & PROVISIONING ---
  async getTenants() {
    const res = await fetch('/api/tenants');
    if (!res.ok) throw new Error(`Failed to load libraries (${res.status})`);
    return res.json();
  },

  async getTenantBySlug(slug: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Tenant "${slug}" not found`);
    }
    return res.json();
  },

  async provisionLibrary(payload: any) {
    const res = await fetch('/api/tenants/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Library provisioning failed on server');
    }
    return data;
  },

  async updateTenantStatus(slug: string, status: string, reason?: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update tenant status');
    }
    return data;
  },

  // --- INVITATIONS & ACCOUNT ACTIVATION ---
  async getInvitation(token: string) {
    const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Invitation not found or invalid');
    }
    return data;
  },

  async acceptInvitation(token: string, password: string) {
    const res = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Account activation failed');
    }
    return data;
  },

  async createInvitation(payload: {
    tenantId: string;
    recipientEmail: string;
    recipientName: string;
    role: string;
    deliveryMethod?: string;
  }) {
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create invitation');
    }
    return data;
  },

  async revokeInvitation(invitationId: string) {
    const res = await fetch(`/api/invitations/${encodeURIComponent(invitationId)}/revoke`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to revoke invitation');
    }
    return data;
  },

  // --- BILLING & INVOICES ---
  async getInvoices() {
    const res = await fetch('/api/invoices');
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  async payInvoice(invoiceId: string, payload: { paymentMethod?: string; transactionReference?: string; notes?: string }) {
    const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to record invoice payment');
    }
    return data;
  },

  // --- CATALOGUE & BOOKS ---
  async getBooks(slug: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/books`);
    if (!res.ok) throw new Error('Failed to fetch books catalogue');
    return res.json();
  },

  async addBook(slug: string, bookData: any) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add book title');
    }
    return data;
  },

  // --- INVENTORY ---
  async getInventory(slug: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  async addCopy(slug: string, bookId: string, copyData: any) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/books/${encodeURIComponent(bookId)}/copies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copyData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create physical copy');
    }
    return data;
  },

  async updateCopy(slug: string, copyId: string, updates: any) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/copies/${encodeURIComponent(copyId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update physical copy');
    }
    return data;
  },

  // --- CIRCULATION & LOANS ---
  async getLoans(slug: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/loans`);
    if (!res.ok) throw new Error('Failed to fetch loans');
    return res.json();
  },

  async issueLoan(slug: string, payload: { bookId: string; userEmailOrId: string; staffName?: string }) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/loans/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to issue loan');
    }
    return data;
  },

  async returnLoan(slug: string, loanId: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/loans/${encodeURIComponent(loanId)}/return`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to process return');
    }
    return data;
  },

  async renewLoan(slug: string, loanId: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/loans/${encodeURIComponent(loanId)}/renew`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to renew loan');
    }
    return data;
  },

  // --- FINES ---
  async getFines(slug: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/fines`);
    if (!res.ok) throw new Error('Failed to fetch fines');
    return res.json();
  },

  async payFine(slug: string, fineId: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/fines/${encodeURIComponent(fineId)}/pay`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to process fine payment');
    }
    return data;
  },

  async waiveFine(slug: string, fineId: string, reason?: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/fines/${encodeURIComponent(fineId)}/waive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to waive fine');
    }
    return data;
  },

  // --- RESERVATIONS ---
  async getReservations(slug: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/reservations`);
    if (!res.ok) throw new Error('Failed to fetch reservations');
    return res.json();
  },

  async createReservation(slug: string, payload: { bookId: string; userId: string }) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reserve title');
    }
    return data;
  },

  async fulfillReservation(slug: string, resId: string, pickupShelf?: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/reservations/${encodeURIComponent(resId)}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupShelf }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fulfill reservation');
    }
    return data;
  },

  async cancelReservation(slug: string, resId: string) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/reservations/${encodeURIComponent(resId)}/cancel`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to cancel reservation');
    }
    return data;
  },

  // --- MEMBERS ---
  async registerMember(slug: string, memberData: { fullName: string; email: string; role: string; phone?: string; idNumber?: string }) {
    const res = await fetch(`/api/tenants/${encodeURIComponent(slug)}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register member');
    }
    return data;
  },

  // --- SUPER ADMIN METRICS ---
  async getSuperAdminMetrics() {
    const res = await fetch('/api/super-admin/metrics');
    if (!res.ok) throw new Error('Failed to fetch platform metrics');
    return res.json();
  },

  async getSuperAdminPlans() {
    const res = await fetch('/api/super-admin/plans');
    if (!res.ok) throw new Error('Failed to fetch plans');
    return res.json();
  },

  // --- UPGRADE REQUESTS & ENQUIRIES ---
  async getSuperAdminEnquiries() {
    const res = await fetch('/api/super-admin/enquiries');
    if (!res.ok) throw new Error('Failed to fetch upgrade enquiries');
    return res.json();
  },

  async submitUpgradeEnquiry(payload: {
    tenantId?: string;
    tenantSlug?: string;
    tenantName: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    requestedPlan?: string;
    estimatedTitles?: number;
    estimatedCopies?: number;
    estimatedLibrarians?: number;
    estimatedStudents?: number;
    estimatedStorageMb?: number;
    message?: string;
  }) {
    const res = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit upgrade enquiry');
    }
    return data;
  },

  async approveUpgradeEnquiry(enquiryId: string, payload?: { notes?: string; commercialTerms?: string }) {
    const res = await fetch(`/api/super-admin/enquiries/${encodeURIComponent(enquiryId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to approve upgrade request');
    }
    return data;
  },

  async rejectUpgradeEnquiry(enquiryId: string, notes?: string) {
    const res = await fetch(`/api/super-admin/enquiries/${encodeURIComponent(enquiryId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reject upgrade request');
    }
    return data;
  },
};
