import React, { useState } from 'react';
import {
  Building2,
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  Mail,
  Plus,
  ShieldCheck,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Search,
  ExternalLink,
  Edit,
  Save,
  Layers,
  Sparkles,
  Lock,
  ArrowRight,
  TrendingUp,
  FileClock,
  Settings,
  Trash2,
  Bookmark,
  Receipt,
  ScanBarcode,
  BarChart3,
  DollarSign,
  Printer,
  Download,
  Filter,
  Tag,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  Tenant,
  UserRole,
  User,
  TenantMembership,
  Invitation,
  Book,
  BookCopy,
  Category,
  Loan,
  Reservation,
  Fine,
  TenantSession,
} from '../../types/saas';
import { useRouter } from '../../router/RouterContext';
import { saasStorage } from '../../services/storage';

interface LibraryAdminPortalProps {
  tenant: Tenant;
}

const LibraryAdminAccessDenied: React.FC<{ tenant: Tenant }> = ({ tenant }) => {
  const { navigate } = useRouter();
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center font-sans">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Library Admin Authorization Required</h2>
        <p className="text-xs text-slate-400">
          You must be authenticated as the authorized Library Administrator for{' '}
          <strong className="text-white">{tenant.name}</strong> to access this portal.
        </p>
        <div className="space-y-2 pt-2">
          <button
            onClick={() => navigate(`/l/${tenant.slug}/admin/login`)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Sign In to Admin Portal
          </button>
          <button
            onClick={() => navigate(`/l/${tenant.slug}`)}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Return to Library Landing Page
          </button>
        </div>
      </div>
    </div>
  );
};

const LibraryAdminPortalContent: React.FC<{ tenant: Tenant; session: TenantSession }> = ({ tenant, session }) => {
  const { navigate, logoutTenantUser } = useRouter();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'catalogue'
    | 'inventory'
    | 'circulation'
    | 'holds'
    | 'fines'
    | 'reports'
    | 'librarians'
    | 'students'
    | 'invitations'
    | 'settings'
    | 'subscription'
    | 'logs'
  >('overview');

  // Search & filter states
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [bookSearch, setBookSearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryConditionFilter, setInventoryConditionFilter] = useState<'all' | 'good' | 'fair' | 'damaged'>('all');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'available' | 'loaned' | 'reserved' | 'maintenance' | 'lost'>('all');

  // Add Book Modal state
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookAuthors, setBookAuthors] = useState('');
  const [bookCategory, setBookCategory] = useState('');
  const [bookPublisher, setBookPublisher] = useState('');
  const [bookYear, setBookYear] = useState<number>(2024);
  const [bookCallNumber, setBookCallNumber] = useState('');
  const [bookShelf, setBookShelf] = useState('');
  const [bookCopiesCount, setBookCopiesCount] = useState<number>(2);
  const [bookError, setBookError] = useState<string | null>(null);

  // Add Physical Copy Modal state
  const [addCopyModalOpen, setAddCopyModalOpen] = useState(false);
  const [targetBookForNewCopy, setTargetBookForNewCopy] = useState<string>('');
  const [newCopyShelf, setNewCopyShelf] = useState('');
  const [newCopyCondition, setNewCopyCondition] = useState<'good' | 'fair' | 'damaged'>('good');
  const [barcodeModalCopy, setBarcodeModalCopy] = useState<BookCopy | null>(null);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<UserRole>('librarian');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Direct Add Modal state
  const [directAddModalOpen, setDirectAddModalOpen] = useState(false);
  const [directFullName, setDirectFullName] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directIdNumber, setDirectIdNumber] = useState('');
  const [directRole, setDirectRole] = useState<UserRole>('librarian');
  const [directError, setDirectError] = useState<string | null>(null);

  // Add Category Modal state
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');

  // Upgrade Request Dialog
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeRequested, setUpgradeRequested] = useState(false);

  // Editable Library Settings
  const [contactEmail, setContactEmail] = useState(tenant.settings.contactEmail);
  const [contactPhone, setContactPhone] = useState(tenant.settings.contactPhone);
  const [address, setAddress] = useState(tenant.settings.address);
  const [defaultLoanDays, setDefaultLoanDays] = useState(tenant.settings.defaultLoanPeriodDays);
  const [maxBooksPerStudent, setMaxBooksPerStudent] = useState(tenant.settings.maxBooksPerStudent);
  const [finePerDay, setFinePerDay] = useState(tenant.settings.finePerDay);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Fines Desk Modal State
  const [waiveModalOpen, setWaiveModalOpen] = useState<{ fineId: string; studentName: string; amount: number } | null>(null);
  const [waiveReason, setWaiveReason] = useState('First offense waiver approved by administrator');
  const [paymentReceipt, setPaymentReceipt] = useState<{ id: string; student: string; amount: number; title: string; date: string } | null>(null);

  // Refresh trigger
  const [nonce, setNonce] = useState(0);
  const [deleteBookConfirmId, setDeleteBookConfirmId] = useState<string | null>(null);
  const [deleteCopyConfirmId, setDeleteCopyConfirmId] = useState<string | null>(null);

  // Data queries
  const subscription = saasStorage.getSubscriptionForTenant(tenant.id);
  const currentPlan = subscription ? saasStorage.getPlanById(subscription.planId) : null;
  const allTenantUsers = saasStorage.getUsersForTenant(tenant.id);
  const tenantInvitations = saasStorage.getInvitations().filter((i) => i.tenantId === tenant.id);
  const tenantLogs = saasStorage.getActivityLogs().filter((l) => l.tenantId === tenant.id);
  const tenantBooks = saasStorage.getBooksForTenant(tenant.id);
  const tenantCopies = saasStorage.getCopiesForTenant(tenant.id);
  const tenantCategories = saasStorage.getCategoriesForTenant(tenant.id);
  const tenantLoans = saasStorage.getLoansForTenant(tenant.id);
  const tenantReservations = saasStorage.getReservationsForTenant(tenant.id);
  const tenantFines = saasStorage.getFinesForTenant(tenant.id);
  const branchReports = saasStorage.generateBranchReports(tenant.id);

  // Quotas & limits
  const maxLibrariansLimit = subscription?.customLimits?.maxLibrarians ?? currentPlan?.maxLibrarians ?? 5;
  const maxStudentsLimit = subscription?.customLimits?.maxStudents ?? currentPlan?.maxStudents ?? 2500;
  const maxTitlesLimit = subscription?.customLimits?.maxTitles ?? currentPlan?.maxTitles ?? 15000;

  const currentLibrariansCount = allTenantUsers.filter(
    (u) => u.membership.role === 'librarian' || u.membership.role === 'senior_librarian'
  ).length;
  const currentStudentsCount = allTenantUsers.filter((u) => u.membership.role === 'student').length;

  const librariansList = allTenantUsers.filter(
    (u) => u.membership.role === 'librarian' || u.membership.role === 'senior_librarian'
  );
  const studentsList = allTenantUsers.filter((u) => u.membership.role === 'student');

  const filteredBooks = tenantBooks.filter(
    (b) =>
      b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.authors.some((a) => a.toLowerCase().includes(bookSearch.toLowerCase())) ||
      b.isbn.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.category.toLowerCase().includes(bookSearch.toLowerCase())
  );

  const filteredCopies = tenantCopies.filter((c) => {
    const matchesSearch =
      c.accessionNumber.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      c.barcode.includes(inventorySearch) ||
      c.bookTitle.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      c.shelfLocation.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesCondition = inventoryConditionFilter === 'all' || c.condition === inventoryConditionFilter;
    const matchesStatus = inventoryStatusFilter === 'all' || c.status === inventoryStatusFilter;
    return matchesSearch && matchesCondition && matchesStatus;
  });

  // Handlers
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const newInv = saasStorage.createInvitation(
        tenant.id,
        inviteEmail.trim().toLowerCase(),
        inviteName.trim(),
        inviteRole,
        'manual_link'
      );

      setInviteSuccess(newInv.token);
      setInviteEmail('');
      setInviteName('');
      setNonce((n) => n + 1);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to create invitation');
    }
  };

  const handleDirectAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setDirectError(null);

    const res = saasStorage.createDirectMember(
      tenant.id,
      directFullName.trim(),
      directEmail.trim(),
      directRole,
      directPhone.trim(),
      directIdNumber.trim(),
      'Password123!'
    );

    if (res.success) {
      setDirectAddModalOpen(false);
      setDirectFullName('');
      setDirectEmail('');
      setDirectPhone('');
      setDirectIdNumber('');
      setNonce((n) => n + 1);
    } else {
      setDirectError(res.error || 'Failed to register member.');
    }
  };

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    setBookError(null);

    const res = saasStorage.addBook(
      tenant.id,
      {
        title: bookTitle.trim(),
        isbn: bookIsbn.trim() || `ISBN-978-${Math.floor(100000000 + Math.random() * 900000000)}`,
        authors: bookAuthors.split(',').map((a) => a.trim()).filter(Boolean),
        category: bookCategory || tenantCategories[0]?.name || 'General Literature',
        publisher: bookPublisher.trim() || 'Academic Press',
        year: bookYear,
        callNumber: bookCallNumber.trim() || `GEN-${Date.now().toString().slice(-4)}`,
        shelfLocation: bookShelf.trim() || 'Bay 1, Shelf 2',
        language: 'English',
        copiesTotal: bookCopiesCount,
      },
      bookCopiesCount
    );

    if (res.success) {
      setAddBookModalOpen(false);
      setBookTitle('');
      setBookIsbn('');
      setBookAuthors('');
      setBookCallNumber('');
      setBookShelf('');
      setNonce((n) => n + 1);
    } else {
      setBookError(res.error || 'Failed to catalogue book.');
    }
  };

  const handleAddPhysicalCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBookForNewCopy) return;
    saasStorage.addPhysicalCopy(tenant.id, targetBookForNewCopy, {
      shelfLocation: newCopyShelf.trim() || undefined,
      condition: newCopyCondition,
    });
    setAddCopyModalOpen(false);
    setTargetBookForNewCopy('');
    setNewCopyShelf('');
    setNonce((n) => n + 1);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catCode.trim()) return;
    saasStorage.addCategory(tenant.id, catName.trim(), catCode.trim());
    setAddCategoryModalOpen(false);
    setCatName('');
    setCatCode('');
    setNonce((n) => n + 1);
  };

  const handleSaveSettings = () => {
    saasStorage.updateTenantDetails(tenant.id, {
      settings: {
        ...tenant.settings,
        contactEmail,
        contactPhone,
        address,
        defaultLoanPeriodDays: defaultLoanDays,
        maxBooksPerStudent,
        finePerDay,
      },
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const handleCollectFine = (fine: Fine) => {
    saasStorage.payFine(fine.id);
    setPaymentReceipt({
      id: `RCP-${Date.now().toString().slice(-6)}`,
      student: fine.userName,
      amount: fine.amount,
      title: fine.bookTitle,
      date: new Date().toLocaleDateString(),
    });
    setNonce((n) => n + 1);
  };

  const handleConfirmWaiveFine = () => {
    if (!waiveModalOpen) return;
    saasStorage.waiveFine(waiveModalOpen.fineId);
    saasStorage.logActivity({
      tenantId: tenant.id,
      actorId: session.user.id,
      actorName: session.user.fullName,
      actorRole: 'library_admin',
      action: 'FINE_WAIVED',
      category: 'library_admin',
      details: `Waived ₹${waiveModalOpen.amount.toFixed(2)} fine for ${waiveModalOpen.studentName}. Reason: ${waiveReason}`,
    });
    setWaiveModalOpen(null);
    setNonce((n) => n + 1);
  };

  const handleExportCirculationCSV = () => {
    const headers = 'Loan ID,Book Title,Accession,Borrower Name,Borrower Email,Issued Date,Due Date,Status,Fine\n';
    const rows = tenantLoans
      .map(
        (l) =>
          `"${l.id}","${l.bookTitle}","${l.accessionNumber}","${l.userName}","${l.userEmail}","${new Date(l.issuedAt).toLocaleDateString()}","${new Date(l.dueDate).toLocaleDateString()}","${l.status}","${l.fineAmount}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenant.slug}_circulation_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportInventoryCSV = () => {
    const headers = 'Copy ID,Accession Number,Barcode,Title,ISBN,Category,Shelf Location,Condition,Status\n';
    const rows = tenantCopies
      .map(
        (c) =>
          `"${c.id}","${c.accessionNumber}","${c.barcode}","${c.bookTitle}","${c.bookIsbn}","${c.bookCategory}","${c.shelfLocation}","${c.condition}","${c.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenant.slug}_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleMemberStatus = (membershipId: string, currentStatus: boolean) => {
    saasStorage.updateMemberStatus(membershipId, !currentStatus);
    setNonce((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
              style={{ backgroundColor: tenant.settings.primaryColor || '#2563eb' }}
            >
              {tenant.logoInitials}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight text-white">{tenant.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  ADMIN PORTAL (LEVEL 2)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Administrator: <strong>{session.user.fullName}</strong> ({session.user.email})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => navigate(`/l/${tenant.slug}`)}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
            >
              <span>Library Public Page</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            <button
              onClick={() => logoutTenantUser(tenant.slug)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-900/60 font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex items-center space-x-1 border-t border-slate-800/80 text-xs overflow-x-auto">
          {[
            { id: 'overview', label: 'Branch Dashboard', icon: Building2 },
            { id: 'catalogue', label: `Catalogue Titles (${tenantBooks.length})`, icon: BookOpen },
            { id: 'inventory', label: `Physical Copies (${tenantCopies.length})`, icon: Layers },
            { id: 'circulation', label: `Circulation & Loans (${tenantLoans.length})`, icon: ScanBarcode },
            { id: 'holds', label: `Reservations (${tenantReservations.length})`, icon: Bookmark },
            { id: 'fines', label: `Fines & Billing (${tenantFines.length})`, icon: DollarSign },
            { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
            { id: 'librarians', label: `Staff Librarians (${librariansList.length})`, icon: ShieldCheck },
            { id: 'students', label: `Enrolled Students (${studentsList.length})`, icon: Users },
            { id: 'invitations', label: `Invitations (${tenantInvitations.length})`, icon: Mail },
            { id: 'settings', label: 'Policies & Settings', icon: Settings },
            { id: 'subscription', label: 'Subscription & Limits', icon: CreditCard },
            { id: 'logs', label: 'Branch Audit Trail', icon: FileClock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3.5 font-semibold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-400 text-blue-400 bg-slate-800/70'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1 text-xs">
        {/* ================= TAB 1: OVERVIEW DASHBOARD ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Titles in Catalogue</span>
                <div className="mt-2 text-2xl font-black text-slate-900">{tenantBooks.length}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Quota: {maxTitlesLimit.toLocaleString()}</span>
                  <button onClick={() => setActiveTab('catalogue')} className="text-blue-600 font-semibold cursor-pointer">
                    Manage →
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Physical Copies</span>
                <div className="mt-2 text-2xl font-black text-emerald-700">{tenantCopies.length}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Active Shelf Inventory</span>
                  <button onClick={() => setActiveTab('inventory')} className="text-emerald-600 font-semibold cursor-pointer">
                    Inspect →
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Librarians</span>
                <div className="mt-2 text-2xl font-black text-blue-700">{currentLibrariansCount}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Quota: {maxLibrariansLimit} staff</span>
                  <button onClick={() => setActiveTab('librarians')} className="text-blue-600 font-semibold cursor-pointer">
                    Manage →
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled Students</span>
                <div className="mt-2 text-2xl font-black text-purple-700">{currentStudentsCount}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Quota: {maxStudentsLimit.toLocaleString()}</span>
                  <button onClick={() => setActiveTab('students')} className="text-purple-600 font-semibold cursor-pointer">
                    Manage →
                  </button>
                </div>
              </div>
            </div>

            {/* Quota Progress */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Tenant Subscription Usage</h3>
                  <p className="text-xs text-slate-500">
                    Plan: <strong className="text-slate-900">{currentPlan?.name || 'Academic Institution Plan'}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('subscription')}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  View Details & Limits
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Librarians</span>
                    <span className="font-bold text-slate-900">
                      {currentLibrariansCount} / {maxLibrariansLimit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${Math.min(Math.round((currentLibrariansCount / maxLibrariansLimit) * 100), 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Students</span>
                    <span className="font-bold text-slate-900">
                      {currentStudentsCount} / {maxStudentsLimit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{ width: `${Math.min(Math.round((currentStudentsCount / maxStudentsLimit) * 100), 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Catalogued Titles</span>
                    <span className="font-bold text-slate-900">
                      {tenantBooks.length} / {maxTitlesLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.min(Math.round((tenantBooks.length / maxTitlesLimit) * 100), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: CATALOGUE ================= */}
        {activeTab === 'catalogue' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Search catalogue by title, author, ISBN, category..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAddCategoryModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  + Add Category
                </button>
                <button
                  onClick={() => setAddBookModalOpen(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catalogue Book</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Book Title & Author</th>
                    <th className="px-5 py-3">ISBN & Category</th>
                    <th className="px-5 py-3">Call # & Location</th>
                    <th className="px-5 py-3">Physical Copies</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBooks.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{b.title}</div>
                        <div className="text-[11px] text-slate-500">{b.authors.join(', ')}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-slate-700 text-[11px]">{b.isbn}</span>
                        <div className="text-[10px] text-blue-600 font-semibold">{b.category}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <div className="font-mono font-semibold">{b.callNumber}</div>
                        <div className="text-[10px] text-slate-400">{b.shelfLocation}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900">{b.copiesAvailable}</span>
                        <span className="text-slate-400"> / {b.copiesTotal} available</span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {deleteBookConfirmId === b.id ? (
                          <div className="inline-flex items-center space-x-1.5 bg-rose-50 p-1 rounded border border-rose-200">
                            <span className="text-[10px] text-rose-700 font-bold px-1">Delete?</span>
                            <button
                              type="button"
                              onClick={() => {
                                saasStorage.deleteBook(b.id);
                                setDeleteBookConfirmId(null);
                                setNonce((n) => n + 1);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteBookConfirmId(null)}
                              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteBookConfirmId(b.id)}
                            className="text-rose-600 hover:text-rose-800 cursor-pointer font-semibold text-xs"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PHYSICAL COPIES & INVENTORY ================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Physical Copy Inventory & Barcodes ({tenantCopies.length})</h3>
                <p className="text-slate-500 text-[11px]">Track physical copies, barcode tags, condition audits, and shelf relocations</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportInventoryCSV}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => setAddCopyModalOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Physical Copy</span>
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Filter by accession, barcode, title, shelf..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Condition:</span>
                <select
                  value={inventoryConditionFilter}
                  onChange={(e) => setInventoryConditionFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="all">All Conditions</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Status:</span>
                <select
                  value={inventoryStatusFilter}
                  onChange={(e) => setInventoryStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="loaned">Loaned</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Accession #</th>
                    <th className="px-5 py-3">Barcode</th>
                    <th className="px-5 py-3">Associated Title</th>
                    <th className="px-5 py-3">Shelf Location</th>
                    <th className="px-5 py-3">Condition</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCopies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{c.accessionNumber}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">{c.barcode}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{c.bookTitle}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.shelfLocation}</td>
                      <td className="px-5 py-3.5">
                        <select
                          value={c.condition}
                          onChange={(e) => {
                            saasStorage.updatePhysicalCopy(c.id, { condition: e.target.value as any });
                            setNonce((n) => n + 1);
                          }}
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] cursor-pointer ${
                            c.condition === 'good'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.condition === 'fair'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="damaged">Damaged</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.status === 'available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'loaned'
                              ? 'bg-blue-100 text-blue-800'
                              : c.status === 'reserved'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setBarcodeModalCopy(c)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[10px] cursor-pointer"
                        >
                          Spine Label
                        </button>
                        {c.status !== 'loaned' && (
                          deleteCopyConfirmId === c.id ? (
                            <div className="inline-flex items-center space-x-1.5 bg-rose-50 p-1 rounded border border-rose-200">
                              <span className="text-[10px] text-rose-700 font-bold px-1">Delete?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  saasStorage.deletePhysicalCopy(c.id);
                                  setDeleteCopyConfirmId(null);
                                  setNonce((n) => n + 1);
                                }}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteCopyConfirmId(null)}
                                className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteCopyConfirmId(c.id)}
                              className="px-2 py-1 text-rose-600 hover:bg-rose-50 font-semibold rounded text-[10px] cursor-pointer"
                            >
                              Delete
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: CIRCULATION & LOANS ================= */}
        {activeTab === 'circulation' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Circulation History & Active Loans ({tenantLoans.length})</h3>
                <p className="text-xs text-slate-500">Real-time transaction log of check-outs, returns, renewals, and overdue items</p>
              </div>
              <button
                onClick={handleExportCirculationCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Book Title & Accession</th>
                    <th className="px-5 py-3">Borrower Member</th>
                    <th className="px-5 py-3">Issued Date</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{loan.bookTitle}</div>
                        <div className="text-[11px] font-mono text-slate-500">{loan.accessionNumber}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{loan.userName}</div>
                        <div className="text-[11px] text-slate-500">{loan.userEmail}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{new Date(loan.issuedAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 text-slate-600">{new Date(loan.dueDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            loan.status === 'returned'
                              ? 'bg-slate-100 text-slate-700'
                              : loan.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {loan.status === 'active' && (
                          <>
                            <button
                              onClick={() => {
                                saasStorage.renewBookLoan(loan.id, tenant.settings.defaultLoanPeriodDays || 14);
                                setNonce((n) => n + 1);
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold cursor-pointer"
                            >
                              Renew (+14d)
                            </button>
                            <button
                              onClick={() => {
                                saasStorage.returnBookLoan(loan.id);
                                setNonce((n) => n + 1);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                            >
                              Mark Returned
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 5: HOLDS & RESERVATIONS ================= */}
        {activeTab === 'holds' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hold & Reservation Queues ({tenantReservations.length})</h3>
                <p className="text-slate-500 text-[11px]">Manage student reservations, pickup shelf allocation, and fulfillments.</p>
              </div>
            </div>

            {tenantReservations.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No hold reservations currently placed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Title Requested</th>
                      <th className="py-2.5 px-3">Borrower Student</th>
                      <th className="py-2.5 px-3">Reserved At</th>
                      <th className="py-2.5 px-3">Pickup Shelf</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-bold text-slate-900">{res.bookTitle}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{res.userName}</div>
                          <div className="text-[10px] text-slate-400">{res.userEmail}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{new Date(res.reservedAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-mono text-emerald-700">{res.pickupShelf || 'Bay 1'}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              res.status === 'ready'
                                ? 'bg-amber-100 text-amber-800'
                                : res.status === 'fulfilled'
                                ? 'bg-emerald-100 text-emerald-800'
                                : res.status === 'cancelled'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {res.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          {res.status === 'pending' && (
                            <button
                              onClick={() => {
                                saasStorage.fulfillReservation(res.id, 'Hold Shelf Bay 1');
                                setNonce((n) => n + 1);
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px] cursor-pointer"
                            >
                              Mark Ready
                            </button>
                          )}
                          {res.status === 'ready' && (
                            <button
                              onClick={() => {
                                saasStorage.fulfillReservation(res.id);
                                setNonce((n) => n + 1);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] cursor-pointer"
                            >
                              Fulfill
                            </button>
                          )}
                          {res.status !== 'cancelled' && res.status !== 'fulfilled' && (
                            <button
                              onClick={() => {
                                saasStorage.cancelReservation(res.id);
                                setNonce((n) => n + 1);
                              }}
                              className="px-2 py-1 text-rose-600 hover:bg-rose-50 font-semibold rounded text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 6: FINES & BILLING ================= */}
        {activeTab === 'fines' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Assessed</span>
                <div className="text-xl font-black text-slate-900 mt-1">${branchReports.finesSummary.totalAssessed.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase">Collected / Paid</span>
                <div className="text-xl font-black text-emerald-700 mt-1">${branchReports.finesSummary.totalPaid.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-rose-600 uppercase">Outstanding Pending</span>
                <div className="text-xl font-black text-rose-700 mt-1">${branchReports.finesSummary.totalPending.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Waived By Staff</span>
                <div className="text-xl font-black text-slate-600 mt-1">${branchReports.finesSummary.totalWaived.toFixed(2)}</div>
              </div>
            </div>

            {paymentReceipt && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-emerald-900">Fine Payment Receipt Generated (#{paymentReceipt.id})</div>
                  <div className="text-emerald-700 text-[11px]">
                    Collected ${paymentReceipt.amount.toFixed(2)} from {paymentReceipt.student} for overdue "{paymentReceipt.title}".
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs cursor-pointer flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Fines & Penalties Register ({tenantFines.length})</h3>
                  <p className="text-slate-500 text-[11px]">Record fine payments, print receipts, or submit administrative waivers.</p>
                </div>
              </div>

              {tenantFines.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No overdue fines recorded for this branch.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Overdue Book Title</th>
                        <th className="py-2.5 px-3">Fine Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Date Assessed</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenantFines.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-semibold text-slate-800">{f.userName}</td>
                          <td className="py-3 px-3 text-slate-700">{f.bookTitle}</td>
                          <td className="py-3 px-3 font-bold text-slate-900">₹{f.amount.toFixed(2)}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                f.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : f.status === 'waived'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {f.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">{new Date(f.issuedDate).toLocaleDateString()}</td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            {f.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleCollectFine(f)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded cursor-pointer"
                                >
                                  Collect ₹{f.amount.toFixed(2)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setWaiveModalOpen({
                                      fineId: f.id,
                                      studentName: f.userName,
                                      amount: f.amount,
                                    })
                                  }
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded cursor-pointer"
                                >
                                  Waive
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 7: REPORTS & ANALYTICS ================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Comprehensive Branch Analytics & Reports</h3>
                <p className="text-[11px] text-slate-500">Collection velocity, top borrowed titles, condition breakdown, and reader rankings</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Executive Report</span>
              </button>
            </div>

            {/* Overview KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Total Circulations</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{branchReports.overview.totalLoans}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase">Active Borrowings</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">{branchReports.overview.activeLoansCount}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-rose-600 uppercase">Overdue Items</span>
                <div className="text-2xl font-black text-rose-700 mt-1">{branchReports.overview.overdueLoansCount}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-purple-600 uppercase">Hold Reservations</span>
                <div className="text-2xl font-black text-purple-700 mt-1">{branchReports.overview.totalReservations}</div>
              </div>
            </div>

            {/* Visual Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Borrowed Titles */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Top Circulated Book Titles</h4>
                {branchReports.topBorrowed.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No loans recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {branchReports.topBorrowed.map((item, idx) => (
                      <div key={item.book.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900">{item.book.title}</div>
                            <div className="text-[10px] text-slate-500">{item.book.category}</div>
                          </div>
                        </div>
                        <span className="font-bold text-slate-800">{item.count} borrows</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Physical Condition Breakdown */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Physical Copy Condition Health</h4>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Good Condition</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">{branchReports.conditionBreakdown.good}</div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Fair Wear</span>
                    <div className="text-xl font-black text-amber-900 mt-1">{branchReports.conditionBreakdown.fair}</div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
                    <span className="text-[10px] font-bold text-rose-800 uppercase">Damaged</span>
                    <div className="text-xl font-black text-rose-900 mt-1">{branchReports.conditionBreakdown.damaged}</div>
                  </div>
                </div>
              </div>

              {/* Active Readers Ranking */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Top Active Student Readers</h4>
                {branchReports.topReaders.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No student loan history available yet.</p>
                ) : (
                  <div className="space-y-2">
                    {branchReports.topReaders.map((reader, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900">{reader.name}</div>
                            <div className="text-[10px] text-slate-500">{reader.email}</div>
                          </div>
                        </div>
                        <span className="font-bold text-purple-700">{reader.loansCount} loans</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Collection Breakdown */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Collection by Category</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(branchReports.categoryStats).map(([cat, stats]) => (
                    <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-semibold text-slate-800">{cat}</span>
                      <span className="text-slate-500 font-mono">
                        {stats.titleCount} titles / {stats.copyCount} copies
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 8: STAFF LIBRARIANS ================= */}
        {activeTab === 'librarians' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Staff Librarians (Level 3 Access)</h3>
                <p className="text-xs text-slate-500">Authorized circulation officers and senior cataloguers for this branch</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setInviteRole('librarian');
                    setInviteModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Invite Librarian</span>
                </button>
                <button
                  onClick={() => {
                    setDirectRole('librarian');
                    setDirectAddModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Direct Add</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Librarian Name</th>
                    <th className="px-5 py-3">Staff ID & Phone</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Joined At</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {librariansList.map((m) => (
                    <tr key={m.membership.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{m.user.fullName}</div>
                        <div className="text-[11px] text-slate-500">{m.user.email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <div>{m.user.staffId || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400">{m.user.phone || 'N/A'}</div>
                      </td>
                      <td className="px-5 py-3.5 capitalize font-medium text-slate-700">{m.membership.role.replace('_', ' ')}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.membership.isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {m.membership.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{new Date(m.membership.joinedAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleToggleMemberStatus(m.membership.id, m.membership.isActive)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                            m.membership.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {m.membership.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 9: ENROLLED STUDENTS ================= */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Enrolled Students & Members (Level 4 Access)</h3>
                <p className="text-xs text-slate-500">
                  {studentsList.length} registered students (Subscription Quota: {maxStudentsLimit.toLocaleString()})
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setInviteRole('student');
                    setInviteModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Invite Student</span>
                </button>
                <button
                  onClick={() => {
                    setDirectRole('student');
                    setDirectAddModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Student</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Student ID & Contact</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Enrolled</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsList.map((m) => (
                    <tr key={m.membership.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{m.user.fullName}</div>
                        <div className="text-[11px] text-slate-500">{m.user.email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <div>{m.user.studentId || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400">{m.user.phone || 'N/A'}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.membership.isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {m.membership.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{new Date(m.membership.joinedAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleToggleMemberStatus(m.membership.id, m.membership.isActive)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                            m.membership.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {m.membership.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 10: INVITATIONS ================= */}
        {activeTab === 'invitations' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Branch Invitation Tokens ({tenantInvitations.length})</h3>
                <p className="text-xs text-slate-500">Expiring, single-use authentication setup links issued for this library</p>
              </div>

              <button
                onClick={() => {
                  setInviteRole('librarian');
                  setInviteModalOpen(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Invitation</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Recipient</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Expires</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{inv.recipientName}</div>
                        <div className="text-[11px] text-slate-500">{inv.recipientEmail}</div>
                      </td>
                      <td className="px-5 py-3.5 capitalize font-medium text-slate-700">{inv.role.replace('_', ' ')}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'expired'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => handleCopy(`${window.location.origin}/invite/${inv.token}`, inv.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer inline-flex items-center space-x-1"
                          >
                            {copiedLink === inv.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedLink === inv.id ? 'Copied' : 'Copy Link'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 11: POLICIES & SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6 max-w-2xl">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Library Policies & Circulation Rules</h3>
              <p className="text-xs text-slate-500">Configure default borrowing windows, fine rates, and contact info</p>
            </div>

            {settingsSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Policies updated and applied across all active desks!</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Loan Window</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={defaultLoanDays}
                      onChange={(e) => setDefaultLoanDays(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                    />
                    <span className="text-slate-500 text-xs">days</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Books / Student</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxBooksPerStudent}
                    onChange={(e) => setMaxBooksPerStudent(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Overdue Fine / Day</label>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500 text-xs">₹</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={finePerDay}
                      onChange={(e) => setFinePerDay(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Policy Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 12: SUBSCRIPTION & LIMITS ================= */}
        {activeTab === 'subscription' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6 max-w-2xl">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Institutional Subscription & Limits</h3>
              <p className="text-xs text-slate-500">Tier limits enforced server-side via Row Level Security & subscription quotas</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Current Plan:</span>
                <span className="font-bold text-blue-700 text-sm">{currentPlan?.name || 'Custom Plan'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Billing Cycle:</span>
                <span className="capitalize text-slate-800">{subscription?.billingCycle || 'Annual'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Expiry / Renewal Date:</span>
                <span className="font-mono text-slate-800">
                  {subscription ? new Date(subscription.expiryDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-xs">Active Quota Entitlements</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Max Catalogued Titles</span>
                  <div className="text-base font-black text-slate-900 mt-1">{maxTitlesLimit.toLocaleString()} titles</div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Max Staff Librarians</span>
                  <div className="text-base font-black text-slate-900 mt-1">{maxLibrariansLimit} officers</div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Max Students Enrolled</span>
                  <div className="text-base font-black text-slate-900 mt-1">{maxStudentsLimit.toLocaleString()} members</div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setUpgradeModalOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
              >
                Request Plan Upgrade or Custom Quota
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 13: BRANCH AUDIT TRAIL ================= */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Branch Security & Operational Audit Log</h3>
                <p className="text-xs text-slate-500">Immutable trace of all actions within this tenant</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {tenantLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-start justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 capitalize">
                        {log.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-600">{log.details}</p>
                    <div className="text-[10px] text-slate-400">
                      Actor: <strong>{log.actorName}</strong> ({log.actorRole})
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: ADD CATALOGUE BOOK ================= */}
      {addBookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Catalogue New Book Title</h3>
            <p className="text-xs text-slate-500">Add book metadata and physical copies will be auto-generated with barcodes.</p>

            {bookError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold">
                {bookError}
              </div>
            )}

            <form onSubmit={handleAddBook} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="e.g. Introduction to Algorithms, 4th Edition"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Author(s) *</label>
                  <input
                    type="text"
                    value={bookAuthors}
                    onChange={(e) => setBookAuthors(e.target.value)}
                    placeholder="e.g. Thomas H. Cormen, Charles E. Leiserson"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ISBN</label>
                  <input
                    type="text"
                    value={bookIsbn}
                    onChange={(e) => setBookIsbn(e.target.value)}
                    placeholder="978-0262046305"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category / Discipline</label>
                  <select
                    value={bookCategory}
                    onChange={(e) => setBookCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-blue-500"
                  >
                    {tenantCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Publisher</label>
                  <input
                    type="text"
                    value={bookPublisher}
                    onChange={(e) => setBookPublisher(e.target.value)}
                    placeholder="MIT Press"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dewey Call #</label>
                  <input
                    type="text"
                    value={bookCallNumber}
                    onChange={(e) => setBookCallNumber(e.target.value)}
                    placeholder="QA76.6 .C662"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={bookShelf}
                    onChange={(e) => setBookShelf(e.target.value)}
                    placeholder="Bay 3, Tier 2"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Copies</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={bookCopiesCount}
                    onChange={(e) => setBookCopiesCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddBookModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Catalogue Book & Copies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PHYSICAL COPY ================= */}
      {addCopyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Add New Physical Copy</h3>
            <p className="text-xs text-slate-500">Generate accession number and barcode for an existing title:</p>

            <form onSubmit={handleAddPhysicalCopy} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Book Title *</label>
                <select
                  value={targetBookForNewCopy}
                  onChange={(e) => setTargetBookForNewCopy(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Choose Book Title --</option>
                  {tenantBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} (Currently {b.copiesTotal} copies)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf Location</label>
                <input
                  type="text"
                  value={newCopyShelf}
                  onChange={(e) => setNewCopyShelf(e.target.value)}
                  placeholder="e.g. Main Stacks Bay 3, Shelf 2"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Condition</label>
                <select
                  value={newCopyCondition}
                  onChange={(e) => setNewCopyCondition(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-emerald-500"
                >
                  <option value="good">Good (New / Intact)</option>
                  <option value="fair">Fair (Normal Shelf Wear)</option>
                  <option value="damaged">Damaged (Needs repair)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddCopyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Generate Physical Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE SPINE LABEL ================= */}
      {barcodeModalCopy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <h3 className="font-bold text-slate-900 text-base">Printable Spine & Barcode Label</h3>

            <div className="p-5 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tenant.name}</div>
              <div className="font-black text-slate-900 text-xs line-clamp-1">{barcodeModalCopy.shelfLocation}</div>
              <div className="font-mono text-base font-black tracking-widest text-slate-800">
                {barcodeModalCopy.accessionNumber}
              </div>

              <div className="h-12 bg-white border border-slate-200 rounded flex items-center justify-center px-4">
                <div className="font-mono font-bold tracking-widest text-slate-900 text-sm">
                  ||||| {barcodeModalCopy.barcode} |||||
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setBarcodeModalCopy(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Label</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: WAIVE FINE ================= */}
      {waiveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Authorize Fine Waiver</h3>
            <p className="text-xs text-slate-500">
              Waive ₹{waiveModalOpen.amount.toFixed(2)} fine for <strong>{waiveModalOpen.studentName}</strong>:
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Waiver Justification Reason:</label>
              <input
                type="text"
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setWaiveModalOpen(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWaiveFine}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Confirm Waiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: INVITE USER ================= */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Generate Branch Invitation Token</h3>

            {inviteSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Invitation Link Generated!</span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/invite/${inviteSuccess}`}
                  className="w-full p-2 bg-white rounded border border-emerald-300 font-mono text-[11px]"
                />
                <button
                  onClick={() => handleCopy(`${window.location.origin}/invite/${inviteSuccess}`, 'modal_inv')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs cursor-pointer"
                >
                  {copiedLink === 'modal_inv' ? 'Copied to Clipboard!' : 'Copy Invitation Link'}
                </button>
                <button
                  onClick={() => {
                    setInviteSuccess(null);
                    setInviteModalOpen(false);
                  }}
                  className="w-full py-1 text-slate-500 text-xs hover:underline cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-3">
                {inviteError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs font-semibold">
                    {inviteError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Full Name *</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-blue-500"
                  >
                    <option value="librarian">Librarian (Level 3 Circulation Desk)</option>
                    <option value="senior_librarian">Senior Librarian</option>
                    <option value="student">Student / Member (Level 4 OPAC & Card)</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Generate Single-Use Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: DIRECT ADD MEMBER ================= */}
      {directAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Direct Member Registration</h3>
            <p className="text-xs text-slate-500">Register a staff librarian or student directly into this branch.</p>

            {directError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs font-semibold">
                {directError}
              </div>
            )}

            <form onSubmit={handleDirectAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={directFullName}
                  onChange={(e) => setDirectFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student / Staff ID</label>
                  <input
                    type="text"
                    value={directIdNumber}
                    onChange={(e) => setDirectIdNumber(e.target.value)}
                    placeholder="e.g. STU-2024-001"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={directRole}
                  onChange={(e) => setDirectRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-blue-500"
                >
                  <option value="librarian">Librarian</option>
                  <option value="student">Student / Member</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDirectAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD CATEGORY ================= */}
      {addCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Add Subject Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Computer Science & AI"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Classification Code *</label>
                <input
                  type="text"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  placeholder="e.g. CS"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500 uppercase"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddCategoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: UPGRADE REQUEST ================= */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Request Plan Quota Upgrade</h3>
            <p className="text-xs text-slate-500">
              Submit an upgrade request to the MBT Library Platform Super Administrator to expand staff, student, or title allowances.
            </p>

            {upgradeRequested ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-emerald-900 text-xs">Upgrade Ticket Dispatched</div>
                <p className="text-[11px] text-emerald-700">
                  Your request has been routed to the Super Admin desk. You will receive an invoice update once approved.
                </p>
                <button
                  onClick={() => {
                    setUpgradeRequested(false);
                    setUpgradeModalOpen(false);
                  }}
                  className="mt-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div><strong>Branch:</strong> {tenant.name} ({tenant.slug})</div>
                  <div><strong>Current Plan:</strong> {currentPlan?.name || 'Academic Institution Plan'}</div>
                  <div><strong>Admin:</strong> {session.user.fullName} ({session.user.email})</div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setUpgradeModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      saasStorage.logActivity({
                        tenantId: tenant.id,
                        actorId: session.user.id,
                        actorName: session.user.fullName,
                        actorRole: 'library_admin',
                        action: 'UPGRADE_REQUESTED',
                        category: 'subscription',
                        details: `Requested tier upgrade for branch "${tenant.name}".`,
                      });
                      setUpgradeRequested(true);
                      setNonce((n) => n + 1);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const LibraryAdminPortal: React.FC<LibraryAdminPortalProps> = ({ tenant }) => {
  const { tenantSession } = useRouter();

  // Guard: Level 2 Library Admin Authorization Check
  if (
    !tenantSession ||
    tenantSession.tenant.id !== tenant.id ||
    (tenantSession.membership.role !== 'library_admin' && !tenantSession.user.isSuperAdmin)
  ) {
    return <LibraryAdminAccessDenied tenant={tenant} />;
  }

  return <LibraryAdminPortalContent tenant={tenant} session={tenantSession} />;
};
