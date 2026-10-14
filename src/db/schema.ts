import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

// --- TENANTS TABLE ---
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  institutionName: text('institution_name').notNull(),
  institutionType: text('institution_type').notNull(),
  logoUrl: text('logo_url'),
  logoInitials: text('logo_initials').notNull().default('LB'),
  status: text('status').notNull().default('active'), // 'active' | 'trial' | 'suspended' | 'archived'
  settings: jsonb('settings').$type<{
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
    address: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- SUBSCRIPTION PLANS TABLE ---
export const subscriptionPlans = pgTable('subscription_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(), // 'free' | 'basic' | 'standard' | 'premium'
  description: text('description'),
  priceMonthly: integer('price_monthly').notNull().default(0),
  priceAnnual: integer('price_annual').notNull().default(0),
  trialDays: integer('trial_days').notNull().default(0),
  maxTitles: integer('max_titles').notNull().default(25),
  maxCopies: integer('max_copies').notNull().default(50),
  maxLibrarians: integer('max_librarians').notNull().default(1),
  maxStudents: integer('max_students').notNull().default(20),
  storageGb: integer('storage_gb').default(1),
  storageMb: integer('storage_mb').notNull().default(10), // In Megabytes (10 MB Free, 200 MB Basic, 1024 MB Standard, 0 for Premium custom)
  features: jsonb('features').$type<string[]>(),
  isPopular: boolean('is_popular').default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- SUBSCRIPTIONS TABLE ---
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  planId: text('plan_id')
    .references(() => subscriptionPlans.id)
    .notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'trial' | 'past_due' | 'expired' | 'suspended'
  billingCycle: text('billing_cycle').notNull().default('monthly'), // 'monthly' | 'annual'
  startDate: timestamp('start_date').defaultNow(),
  expiryDate: timestamp('expiry_date').notNull(),
  gracePeriodDays: integer('grace_period_days').notNull().default(7),
  autoRenew: boolean('auto_renew').notNull().default(true),
  customMaxTitles: integer('custom_max_titles'),
  customMaxCopies: integer('custom_max_copies'),
  customMaxLibrarians: integer('custom_max_librarians'),
  customMaxStudents: integer('custom_max_students'),
  customMaxStorageMb: integer('custom_max_storage_mb'),
  customOverrideReason: text('custom_override_reason'),
  lastPaymentDate: timestamp('last_payment_date'),
  nextBillingDate: timestamp('next_billing_date'),
  cancelledAt: timestamp('cancelled_at'),
});

// --- SUBSCRIPTION ENQUIRIES TABLE (Premium Contact Authority) ---
export const subscriptionEnquiries = pgTable('subscription_enquiries', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' }),
  tenantSlug: text('tenant_slug'),
  tenantName: text('tenant_name').notNull(),
  contactName: text('contact_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone'),
  requestedPlan: text('requested_plan').notNull().default('premium'),
  estimatedTitles: integer('estimated_titles'),
  estimatedCopies: integer('estimated_copies'),
  estimatedLibrarians: integer('estimated_librarians'),
  estimatedStudents: integer('estimated_students'),
  estimatedStorageMb: integer('estimated_storage_mb'),
  message: text('message'),
  status: text('status').notNull().default('pending'), // 'pending' | 'reviewed' | 'approved' | 'rejected'
  superAdminNotes: text('super_admin_notes'),
  commercialTerms: text('commercial_terms'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- USERS TABLE (Linked to Firebase UID) ---
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  staffId: text('staff_id'),
  studentId: text('student_id'),
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});

// --- TENANT MEMBERSHIPS TABLE (RBAC & Isolation) ---
export const tenantMemberships = pgTable('tenant_memberships', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(), // 'library_admin' | 'senior_librarian' | 'librarian' | 'student' | 'faculty_member'
  joinedAt: timestamp('joined_at').defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
});

// --- BOOKS TABLE (Multi-Tenant with RLS tenantId) ---
export const books = pgTable('books', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  isbn: text('isbn').notNull(),
  authors: jsonb('authors').$type<string[]>().notNull(),
  category: text('category').notNull(),
  publisher: text('publisher').notNull().default('Academic Press'),
  year: integer('year').notNull().default(2024),
  callNumber: text('call_number').notNull(),
  shelfLocation: text('shelf_location').notNull().default('Main Stacks'),
  language: text('language').notNull().default('English'),
  description: text('description'),
  copiesTotal: integer('copies_total').notNull().default(1),
  copiesAvailable: integer('copies_available').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- BOOK COPIES TABLE (Accession numbers & Barcodes) ---
export const bookCopies = pgTable('book_copies', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  bookId: text('book_id')
    .references(() => books.id, { onDelete: 'cascade' })
    .notNull(),
  accessionNumber: text('accession_number').notNull(),
  barcode: text('barcode').notNull(),
  status: text('status').notNull().default('available'), // 'available' | 'loaned' | 'reserved' | 'lost' | 'maintenance'
  condition: text('condition').notNull().default('good'), // 'good' | 'fair' | 'damaged'
  shelfLocation: text('shelf_location').notNull(),
  addedAt: timestamp('added_at').defaultNow(),
});

// --- CIRCULATION LOANS TABLE ---
export const loans = pgTable('loans', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  bookId: text('book_id')
    .references(() => books.id)
    .notNull(),
  bookTitle: text('book_title').notNull(),
  copyId: text('copy_id')
    .references(() => bookCopies.id)
    .notNull(),
  accessionNumber: text('accession_number').notNull(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  userRole: text('user_role').notNull().default('student'),
  issuedAt: timestamp('issued_at').defaultNow(),
  dueDate: timestamp('due_date').notNull(),
  returnedAt: timestamp('returned_at'),
  status: text('status').notNull().default('active'), // 'active' | 'returned' | 'overdue'
  fineAmount: integer('fine_amount').notNull().default(0), // in cents
  finePaid: boolean('fine_paid').notNull().default(false),
  issuedByStaffName: text('issued_by_staff_name').notNull(),
});

// --- RESERVATIONS / HOLDS TABLE ---
export const reservations = pgTable('reservations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  bookId: text('book_id')
    .references(() => books.id)
    .notNull(),
  bookTitle: text('book_title').notNull(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  reservedAt: timestamp('reserved_at').defaultNow(),
  expiryDate: timestamp('expiry_date').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'ready' | 'fulfilled' | 'cancelled'
  pickupShelf: text('pickup_shelf'),
});

// --- FINES TABLE ---
export const fines = pgTable('fines', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  loanId: text('loan_id'),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  userName: text('user_name').notNull(),
  bookTitle: text('book_title').notNull(),
  amount: integer('amount').notNull(), // in INR (₹)
  status: text('status').notNull().default('pending'), // 'pending' | 'paid' | 'waived'
  issuedDate: timestamp('issued_date').defaultNow(),
  paidDate: timestamp('paid_date'),
  notes: text('notes'),
});

// --- INVITATIONS TABLE (Secure single-use token links) ---
export const invitations = pgTable('invitations', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  recipientEmail: text('recipient_email').notNull(),
  recipientName: text('recipient_name').notNull(),
  role: text('role').notNull(),
  deliveryMethod: text('delivery_method').notNull().default('manual_link'),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'expired' | 'revoked'
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  createdBy: text('created_by').notNull(),
});

// --- INVOICES TABLE ---
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  tenantId: text('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  planName: text('plan_name').notNull(),
  billingCycle: text('billing_cycle').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  status: text('status').notNull().default('pending'), // 'paid' | 'pending' | 'overdue' | 'failed'
  issueDate: timestamp('issue_date').defaultNow(),
  dueDate: timestamp('due_date').notNull(),
  paidAt: timestamp('paid_at'),
  paymentMethod: text('payment_method'),
  transactionReference: text('transaction_reference'),
  notes: text('notes'),
});

// --- ACTIVITY LOGS TABLE ---
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  actorId: text('actor_id').notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  category: text('category').notNull(),
  details: text('details').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
});

// --- OTP VERIFICATIONS TABLE (WhatsApp & Gmail OTP) ---
export const otpVerifications = pgTable('otp_verifications', {
  id: text('id').primaryKey(),
  destination: text('destination').notNull(),
  channel: text('channel').notNull(), // 'whatsapp' | 'gmail'
  otpCode: text('otp_code').notNull(),
  tenantSlug: text('tenant_slug'),
  role: text('role'),
  isConsumed: boolean('is_consumed').default(false),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- RELATIONS ---
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  subscriptions: many(subscriptions),
  memberships: many(tenantMemberships),
  books: many(books),
  loans: many(loans),
  invitations: many(invitations),
  invoices: many(invoices),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(tenantMemberships),
  loans: many(loans),
  reservations: many(reservations),
  fines: many(fines),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [books.tenantId],
    references: [tenants.id],
  }),
  copies: many(bookCopies),
  loans: many(loans),
  reservations: many(reservations),
}));

export const bookCopiesRelations = relations(bookCopies, ({ one, many }) => ({
  book: one(books, {
    fields: [bookCopies.bookId],
    references: [books.id],
  }),
  loans: many(loans),
}));
