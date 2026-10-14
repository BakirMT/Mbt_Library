export type InstitutionType = 
  | 'islamic_institution'
  | 'school'
  | 'college'
  | 'university'
  | 'public_library'
  | 'research_center';

export type SubscriptionStatus = 
  | 'active'
  | 'trial'
  | 'past_due'
  | 'expired'
  | 'suspended'
  | 'cancelled';

export type TenantStatus = 
  | 'active'
  | 'trial'
  | 'deactivated'
  | 'suspended'
  | 'archived'
  | 'pending_setup';

export type UserRole = 
  | 'super_admin'
  | 'library_admin'
  | 'librarian'
  | 'senior_librarian'
  | 'student'
  | 'faculty';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export type DeliveryMethod = 'email' | 'manual_link' | 'direct_provision';

export type BillingCycle = 'monthly' | 'annual';

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'failed' | 'cancelled';

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: 'free' | 'basic' | 'standard' | 'premium' | 'trial' | 'enterprise';
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  trialDays: number;
  maxTitles: number;
  maxCopies: number;
  maxLibrarians: number;
  maxStudents: number;
  storageMb: number;
  storageGb?: number;
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  currency: string;
  primaryColor: string;
  allowStudentReservations: boolean;
  defaultLoanPeriodDays: number;
  maxBooksPerStudent: number;
  finePerDay: number;
  contactEmail: string;
  contactPhone: string;
  contactName?: string;
  address: string;
  websiteUrl?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  institutionName: string;
  institutionType: InstitutionType;
  logoUrl?: string;
  logoInitials: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  settings: TenantSettings;
  // Denormalized counts for fast dashboard aggregation
  currentUsage: {
    titlesCount: number;
    copiesCount: number;
    librariansCount: number;
    studentsCount: number;
    activeLoansCount: number;
    storageMbUsed?: number;
  };
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startDate: string;
  expiryDate: string;
  gracePeriodDays: number;
  autoRenew: boolean;
  // Overridable limits for custom arrangements
  customLimits?: {
    maxTitles?: number;
    maxCopies?: number;
    maxLibrarians?: number;
    maxStudents?: number;
    storageMb?: number;
  };
  customOverrideReason?: string;
  lastPaymentDate?: string;
  nextBillingDate?: string;
  cancelledAt?: string;
}

export interface SubscriptionEnquiry {
  id: string;
  tenantId?: string;
  tenantSlug?: string;
  tenantName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  requestedPlan: string;
  estimatedTitles?: number;
  estimatedCopies?: number;
  estimatedLibrarians?: number;
  estimatedStudents?: number;
  estimatedStorageMb?: number;
  message?: string;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  superAdminNotes?: string;
  commercialTerms?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  staffId?: string;
  studentId?: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface TenantMembership {
  id: string;
  tenantId: string;
  userId: string;
  role: UserRole;
  permissions?: string[];
  joinedAt: string;
  isActive: boolean;
}

export interface TenantSession {
  user: User;
  membership: TenantMembership;
  tenant: Tenant;
}

export interface Invitation {
  id: string;
  token: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  recipientEmail: string;
  recipientName: string;
  role: UserRole;
  deliveryMethod: DeliveryMethod;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
  createdBy: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  planName: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  transactionReference?: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  tenantId?: string;
  tenantName?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  category: 'auth' | 'provisioning' | 'subscription' | 'library_admin' | 'security' | 'system';
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface ProvisionLibraryPayload {
  // Step 1: Details
  name: string;
  slug: string;
  institutionName: string;
  institutionType: InstitutionType;
  address: string;
  contactEmail: string;
  contactPhone: string;
  timezone: string;
  dateFormat: string;
  primaryColor?: string;

  // Step 2: Admin
  adminFullName: string;
  adminEmail: string;
  adminPhone: string;
  adminStaffId?: string;
  invitationDeliveryMethod: DeliveryMethod;

  // Step 3: Subscription
  planId: string;
  billingCycle: BillingCycle;
  isTrial: boolean;
  trialDays: number;
  startDate: string;
  gracePeriodDays: number;
  customMaxStudents?: number;
  customMaxLibrarians?: number;
  customMaxTitles?: number;
  customMaxCopies?: number;
  customMaxStorageMb?: number;
  customOverrideReason?: string;
}

// --- LIBRARY MANAGEMENT & CIRCULATION MODULE TYPES (PHASE 3) ---

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
}

export interface Author {
  id: string;
  tenantId: string;
  name: string;
  biography?: string;
}

export interface Publisher {
  id: string;
  tenantId: string;
  name: string;
  country?: string;
}

export interface Book {
  id: string;
  tenantId: string;
  title: string;
  subtitle?: string;
  isbn: string;
  authors: string[];
  category: string;
  publisher: string;
  year: number;
  edition?: string;
  callNumber: string;
  shelfLocation: string;
  language: string;
  description?: string;
  copiesTotal: number;
  copiesAvailable: number;
  createdAt: string;
}

export interface BookCopy {
  id: string;
  tenantId: string;
  bookId: string;
  accessionNumber: string;
  barcode: string;
  status: 'available' | 'loaned' | 'reserved' | 'lost' | 'maintenance';
  condition: 'good' | 'fair' | 'damaged';
  shelfLocation: string;
  addedAt: string;
}

export interface Loan {
  id: string;
  tenantId: string;
  bookId: string;
  bookTitle: string;
  copyId: string;
  accessionNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  issuedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: 'active' | 'returned' | 'overdue';
  fineAmount: number;
  finePaid: boolean;
  issuedByStaffName: string;
}

export interface Reservation {
  id: string;
  tenantId: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  reservedAt: string;
  expiryDate: string;
  status: 'pending' | 'ready' | 'fulfilled' | 'cancelled';
  pickupShelf?: string;
}

export interface Fine {
  id: string;
  tenantId: string;
  loanId: string;
  userId: string;
  userName: string;
  bookTitle: string;
  amount: number;
  status: 'pending' | 'paid' | 'waived';
  issuedDate: string;
  paidDate?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: 'due_reminder' | 'overdue' | 'hold_ready' | 'system';
  createdAt: string;
  isRead: boolean;
}

