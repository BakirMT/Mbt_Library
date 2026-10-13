import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  LogOut,
  Bookmark,
  ShieldCheck,
  Building2,
  Lock,
  ArrowRight,
  MapPin,
  ExternalLink,
  CreditCard,
  Barcode,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Share2,
} from 'lucide-react';
import { Tenant, Book, Loan, Reservation, Fine } from '../../types/saas';
import { useRouter } from '../../router/RouterContext';
import { saasStorage } from '../../services/storage';

interface StudentPortalProps {
  tenant: Tenant;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ tenant }) => {
  const { navigate, tenantSession, logoutTenantUser } = useRouter();

  // Guard: Level 4 Student Authorization Check
  if (
    !tenantSession ||
    tenantSession.tenant.id !== tenant.id ||
    (tenantSession.membership.role !== 'student' &&
      tenantSession.membership.role !== 'library_admin' &&
      tenantSession.membership.role !== 'librarian')
  ) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center font-sans">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Student Sign-In Required</h2>
          <p className="text-xs text-slate-400">
            Please log in with your student credentials for{' '}
            <strong className="text-white">{tenant.name}</strong> to view your issued books and holds.
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate(`/l/${tenant.slug}/student/login`)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Sign In to Student Portal
            </button>
            <button
              onClick={() => navigate(`/l/${tenant.slug}`)}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Back to Library Landing Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'my_books' | 'search' | 'reservations' | 'fines' | 'profile'>('my_books');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [reservationFeedback, setReservationFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Real data queries for this student
  const currentUserId = tenantSession.user.id;
  const userLoans = saasStorage.getLoansForUser(tenant.id, currentUserId);
  const activeLoans = userLoans.filter((l) => l.status === 'active');
  const returnedLoans = userLoans.filter((l) => l.status === 'returned');
  const userReservations = saasStorage.getReservationsForUser(tenant.id, currentUserId);
  const userFines = saasStorage.getFinesForUser(tenant.id, currentUserId);
  const allBooks = saasStorage.getBooksForTenant(tenant.id);
  const categories = saasStorage.getCategoriesForTenant(tenant.id);

  const totalOutstandingFines = userFines
    .filter((f) => f.status === 'pending')
    .reduce((sum, f) => sum + f.amount, 0);

  const brandColor = tenant.settings.primaryColor || '#7c3aed';
  const nowTime = new Date().getTime();

  // Handlers
  const handleRenewLoan = async (loanId: string, title: string) => {
    try {
      const serverRes = await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/loans/${encodeURIComponent(loanId)}/renew`, {
        method: 'POST',
      });
      if (!serverRes.ok) {
        const data = await serverRes.json().catch(() => ({}));
        throw new Error(data.error || 'Server rejected renewal request.');
      }

      const res = saasStorage.renewBookLoan(loanId, tenant.settings.defaultLoanPeriodDays || 14);
      if (res.success && res.loan) {
        setFeedbackType('success');
        setReservationFeedback(`Renewed "${title}"! New due date: ${new Date(res.loan.dueDate).toLocaleDateString()}`);
        setNonce((n) => n + 1);
        setTimeout(() => setReservationFeedback(null), 4000);
      } else {
        throw new Error(res.error || 'Failed to renew loan.');
      }
    } catch (err: any) {
      setFeedbackType('error');
      setReservationFeedback(err.message || 'Renewal failed in database.');
      setTimeout(() => setReservationFeedback(null), 4000);
    }
  };

  const handlePlaceReservation = async (book: Book) => {
    try {
      const serverRes = await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          userId: currentUserId,
        }),
      });
      if (!serverRes.ok) {
        const data = await serverRes.json().catch(() => ({}));
        throw new Error(data.error || 'Database rejected hold reservation.');
      }

      const res = saasStorage.placeReservation(tenant.id, book.id, currentUserId);
      if (res.success) {
        setFeedbackType('success');
        setReservationFeedback(`Hold successfully placed on "${book.title}". You will be notified when it is ready for pickup.`);
        setNonce((n) => n + 1);
        setTimeout(() => setReservationFeedback(null), 4000);
      } else {
        throw new Error(res.error || 'Unable to place hold.');
      }
    } catch (err: any) {
      setFeedbackType('error');
      setReservationFeedback(err.message || 'Unable to place hold.');
      setTimeout(() => setReservationFeedback(null), 4000);
    }
  };

  const handleCancelReservation = async (resId: string) => {
    try {
      await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/reservations/${encodeURIComponent(resId)}/cancel`, {
        method: 'POST',
      });
      saasStorage.cancelReservation(resId);
      setFeedbackType('success');
      setReservationFeedback('Hold reservation cancelled.');
      setNonce((n) => n + 1);
      setTimeout(() => setReservationFeedback(null), 3000);
    } catch (err: any) {
      setFeedbackType('error');
      setReservationFeedback(`Cancellation failed: ${err.message}`);
      setTimeout(() => setReservationFeedback(null), 4000);
    }
  };

  const handlePayFine = async (fineId: string) => {
    try {
      await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/fines/${encodeURIComponent(fineId)}/pay`, {
        method: 'POST',
      });
      saasStorage.payFine(fineId);
      setFeedbackType('success');
      setReservationFeedback('Fine payment recorded successfully in database.');
      setNonce((n) => n + 1);
      setTimeout(() => setReservationFeedback(null), 3000);
    } catch (err: any) {
      setFeedbackType('error');
      setReservationFeedback(`Payment rejected by server: ${err.message}`);
      setTimeout(() => setReservationFeedback(null), 4000);
    }
  };

  // Filter books in OPAC
  const filteredBooks = allBooks.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.authors.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.isbn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.callNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || b.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Mobile-First Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs text-xs"
              style={{ backgroundColor: brandColor }}
            >
              {tenant.logoInitials}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-xs">
                {tenant.name}
              </div>
              <p className="text-[11px] text-slate-500">
                Student Member: <strong>{tenantSession.user.fullName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBarcodeModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center space-x-1 cursor-pointer border border-purple-200"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My Library Card</span>
            </button>

            <button
              onClick={() => logoutTenantUser(tenant.slug)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center space-x-2 text-xs border-t border-slate-100 overflow-x-auto">
          {[
            { id: 'my_books', label: `My Issued Books (${activeLoans.length})`, icon: BookOpen },
            { id: 'search', label: 'Catalogue Search (OPAC)', icon: Search },
            { id: 'reservations', label: `Holds Queue (${userReservations.filter((r) => r.status === 'pending' || r.status === 'ready').length})`, icon: Bookmark },
            { id: 'fines', label: `Fines & Fees (${totalOutstandingFines > 0 ? `₹${totalOutstandingFines.toFixed(2)}` : 'None'})`, icon: AlertTriangle },
            { id: 'profile', label: 'My Digital Card & Profile', icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3 font-semibold flex items-center space-x-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isSel
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Global Feedback Banner */}
      {reservationFeedback && (
        <div
          className={`px-6 py-2.5 text-xs flex items-center justify-between ${
            feedbackType === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center space-x-2 max-w-5xl mx-auto w-full">
            {feedbackType === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{reservationFeedback}</span>
          </div>
          <button onClick={() => setReservationFeedback(null)} className="cursor-pointer text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* ================= TAB 1: MY ISSUED BOOKS ================= */}
        {activeTab === 'my_books' && (
          <div className="space-y-6">
            {/* Allowance Card */}
            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-purple-950 text-sm">
                  Active Borrowed Books ({activeLoans.length})
                </h3>
                <p className="text-xs text-purple-800 mt-0.5">
                  Your borrowing quota: <strong>{activeLoans.length} of {tenant.settings.maxBooksPerStudent || 5}</strong> allowed books currently issued.
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                  Standard Loan: {tenant.settings.defaultLoanPeriodDays} Days
                </span>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  + Borrow More
                </button>
              </div>
            </div>

            {/* Active Loans List */}
            {activeLoans.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">No Active Loans</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You do not currently have any books checked out from {tenant.name}. Search our catalogue to place a hold or borrow in person.
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Explore Library Catalogue →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.map((loan) => {
                  const dueDate = new Date(loan.dueDate);
                  const isOverdue = dueDate.getTime() < nowTime;
                  const daysRemaining = Math.ceil((dueDate.getTime() - nowTime) / (1000 * 3600 * 24));

                  return (
                    <div
                      key={loan.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Accession: {loan.accessionNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">· Loan ID: {loan.id.slice(-6)}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base">{loan.bookTitle}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Issued: <strong>{new Date(loan.issuedAt).toLocaleDateString()}</strong></span>
                          <span>Due: <strong className={isOverdue ? 'text-rose-600' : 'text-slate-900'}>{dueDate.toLocaleDateString()}</strong></span>
                          <span>Staff Desk: {loan.issuedByStaffName}</span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 shrink-0">
                        {isOverdue ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            Overdue by {Math.abs(daysRemaining)} days
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              daysRemaining <= 3
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {daysRemaining === 0 ? 'Due Today' : `${daysRemaining} days left`}
                          </span>
                        )}

                        <button
                          onClick={() => handleRenewLoan(loan.id, loan.bookTitle)}
                          className="mt-2 text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center space-x-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Renew (+14 Days)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reading History */}
            {returnedLoans.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Past Reading History & Returned Volumes ({returnedLoans.length})
                </h4>
                <div className="divide-y divide-slate-100 text-xs">
                  {returnedLoans.map((r) => (
                    <div key={r.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{r.bookTitle}</div>
                        <div className="text-[11px] text-slate-400">
                          Returned: {r.returnedAt ? new Date(r.returnedAt).toLocaleDateString() : 'Yes'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        Completed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: OPAC SEARCH ================= */}
        {activeTab === 'search' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Search {tenant.name} Catalogue (OPAC)
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search titles, authors, Islamic topics, ISBN, shelf location..."
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 outline-none focus:border-purple-600 bg-white"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 text-xs rounded-xl border border-slate-300 outline-none focus:border-purple-600 bg-white"
                >
                  <option value="all">All Disciplines & Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Book Results */}
            <div className="space-y-3">
              {filteredBooks.map((book) => {
                const isAvailable = book.copiesAvailable > 0;
                const userAlreadyReserved = userReservations.some(
                  (r) => r.bookId === book.id && (r.status === 'pending' || r.status === 'ready')
                );

                return (
                  <div
                    key={book.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {book.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Shelf: {book.callNumber} · {book.shelfLocation || 'General Stacks'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">{book.title}</h4>
                      <p className="text-xs text-slate-600">By {book.authors.join(', ')} ({book.year})</p>
                      <div className="text-[11px] text-slate-400">
                        Publisher: {book.publisher} · ISBN: {book.isbn}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 shrink-0 space-y-2">
                      {isAvailable ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {book.copiesAvailable} Available Now
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Checked Out (Hold Queue Open)
                        </span>
                      )}

                      {userAlreadyReserved ? (
                        <span className="text-[11px] font-bold text-emerald-700">✓ On Hold for You</span>
                      ) : (
                        <button
                          onClick={() => handlePlaceReservation(book)}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-xs transition-colors"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{isAvailable ? 'Reserve for Pickup' : 'Join Hold Queue'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 3: HOLDS & RESERVATIONS ================= */}
        {activeTab === 'reservations' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">My Active Hold Reservations</h3>
                <p className="text-slate-500 text-[11px]">
                  When your reserved book is returned or prepared by a librarian, its status updates to "Ready for Pickup".
                </p>
              </div>
              <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                {userReservations.length} Total Holds
              </span>
            </div>

            {userReservations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Bookmark className="w-8 h-8 mx-auto text-slate-300" />
                <p>You have no active hold reservations at this time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userReservations.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{r.bookTitle}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Reserved on {new Date(r.reservedAt).toLocaleDateString()} · Hold expires on {new Date(r.expiryDate).toLocaleDateString()}
                      </div>
                      {r.status === 'ready' && (
                        <div className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg inline-block">
                          📍 Ready for Pickup at: {r.pickupShelf || 'Hold Stacks Bay 1'}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          r.status === 'ready'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {r.status === 'ready' ? 'Ready for Pickup' : r.status === 'pending' ? 'In Queue' : r.status}
                      </span>

                      {r.status === 'pending' && (
                        <button
                          onClick={() => handleCancelReservation(r.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border text-slate-600 rounded font-semibold text-xs cursor-pointer"
                        >
                          Cancel Hold
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: FINES & STATEMENTS ================= */}
        {activeTab === 'fines' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Library Fines & Financial Statement</h3>
                <p className="text-slate-500 text-[11px]">
                  Institutional overdue rate: ₹{tenant.settings.finePerDay.toFixed(2)}/day
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Outstanding Balance</span>
                <span className={`text-xl font-black ${totalOutstandingFines > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{totalOutstandingFines.toFixed(2)}
                </span>
              </div>
            </div>

            {userFines.length === 0 ? (
              <div className="text-center py-10 text-emerald-700 space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                <h4 className="font-bold">Zero Outstanding Fines</h4>
                <p className="text-slate-500 text-xs">Your library account is in pristine standing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userFines.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{f.bookTitle}</div>
                      <div className="text-[11px] text-slate-500">
                        {f.notes || 'Overdue item'} · Issued {new Date(f.issuedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <div className="font-black text-slate-900 text-sm">₹{f.amount.toFixed(2)}</div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : f.status === 'waived'
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {f.status.toUpperCase()}
                        </span>
                      </div>
                      {f.status === 'pending' && (
                        <button
                          onClick={() => handlePayFine(f.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                        >
                          Pay Online
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: PROFILE & DIGITAL CARD ================= */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* High-Fidelity Student Digital Library Card */}
            <div
              className="rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${brandColor} 0%, #1e1b4b 100%)`,
                minHeight: '260px',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-white/70">
                    Official Student Library Card
                  </div>
                  <h3 className="font-black text-lg text-white mt-0.5">{tenant.name}</h3>
                  <p className="text-[11px] text-white/80">{tenant.institutionName}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-lg border border-white/30">
                  {tenant.logoInitials}
                </div>
              </div>

              {/* Center Details */}
              <div className="my-4">
                <div className="text-sm font-bold text-white">{tenantSession.user.fullName}</div>
                <div className="text-xs text-white/80">{tenantSession.user.email}</div>
                <div className="text-[11px] font-mono text-white/70 mt-1">
                  Student ID: {tenantSession.user.studentId || `STU-${tenantSession.user.id.slice(-6).toUpperCase()}`}
                </div>
              </div>

              {/* Digital Barcode graphic */}
              <div className="pt-3 border-t border-white/20 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-mono text-[9px] tracking-widest opacity-80">
                    ||||| ||| ||||||| || |||||| ||||
                  </div>
                  <div className="text-[9px] text-white/70 font-mono">
                    BARCODE: 8890-{tenantSession.user.id.slice(-6).toUpperCase()}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-xs border border-white/30 text-white">
                  Active Member
                </span>
              </div>
            </div>

            {/* Profile Information & Privileges */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">Borrowing Privileges & Settings</h4>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Borrowing Quota</span>
                  <div className="text-sm font-bold text-slate-800">
                    {activeLoans.length} of {tenant.settings.maxBooksPerStudent || 5} Books Checked Out
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (activeLoans.length / (tenant.settings.maxBooksPerStudent || 5)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Circulation Term</span>
                  <div className="text-sm font-bold text-slate-800">
                    {tenant.settings.defaultLoanPeriodDays} Days per checkout (+1 renewal allowed)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Institutional Boundary</span>
                  <div className="text-xs text-slate-600">
                    Registered at <strong>{tenant.name}</strong>. Student accounts are securely isolated to this institution.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Barcode Enlarge Modal */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in fade-in">
            <h4 className="font-bold text-slate-900 text-sm">Digital Accession Barcode</h4>
            <p className="text-xs text-slate-500">Scan at library circulation desk for fast check-out.</p>

            <div className="p-6 bg-slate-50 border rounded-2xl space-y-2">
              <div className="font-mono text-2xl tracking-widest text-slate-900 font-bold select-all">
                ||||||||||||||||||||||||||||
              </div>
              <div className="font-mono text-xs text-slate-600">
                8890-{tenantSession.user.id.slice(-6).toUpperCase()}
              </div>
            </div>

            <button
              onClick={() => setShowBarcodeModal(false)}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
