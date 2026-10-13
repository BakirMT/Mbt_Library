import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ScanBarcode,
  ArrowRight,
  LogOut,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Users,
  Building2,
  ExternalLink,
  ShieldCheck,
  Lock,
  Check,
  X,
  FileText,
  DollarSign,
  Tag,
  RefreshCw,
  Printer,
  Sparkles,
  BarChart3,
  Layers,
  Bookmark,
  Plus,
  Trash2,
  Edit,
  Download,
  Filter,
} from 'lucide-react';
import { Tenant, Book, BookCopy, Loan, Reservation, Fine, User } from '../../types/saas';
import { useRouter } from '../../router/RouterContext';
import { saasStorage } from '../../services/storage';

interface LibrarianPortalProps {
  tenant: Tenant;
}

export const LibrarianPortal: React.FC<LibrarianPortalProps> = ({ tenant }) => {
  const { navigate, tenantSession, logoutTenantUser } = useRouter();

  // Guard: Level 3 Librarian Authorization Check
  if (
    !tenantSession ||
    tenantSession.tenant.id !== tenant.id ||
    (tenantSession.membership.role !== 'librarian' &&
      tenantSession.membership.role !== 'senior_librarian' &&
      tenantSession.membership.role !== 'library_admin')
  ) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center font-sans">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Librarian Authorization Required</h2>
          <p className="text-xs text-slate-400">
            Please sign in as an authorized circulation librarian for{' '}
            <strong className="text-white">{tenant.name}</strong>.
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate(`/l/${tenant.slug}/librarian/login`)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Sign In to Librarian Desk
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

  const [activeTab, setActiveTab] = useState<
    'circulation' | 'catalogue' | 'inventory' | 'holds' | 'fines' | 'overdue' | 'reports'
  >('circulation');
  const [nonce, setNonce] = useState(0);

  // Issue Book State
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [manualAccession, setManualAccession] = useState('');
  const [customLoanDays, setCustomLoanDays] = useState(7);
  const [circulationFeedback, setCirculationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [issuedReceipt, setIssuedReceipt] = useState<Loan | null>(null);

  // Return Book Condition Check State
  const [returnConditionModal, setReturnConditionModal] = useState<{ loanId: string; title: string; copyId: string } | null>(null);
  const [returnCondition, setReturnCondition] = useState<'good' | 'fair' | 'damaged'>('good');

  // Catalogue Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookForCopies, setSelectedBookForCopies] = useState<Book | null>(null);

  // Physical Inventory Copies State
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryConditionFilter, setInventoryConditionFilter] = useState<'all' | 'good' | 'fair' | 'damaged'>('all');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'available' | 'loaned' | 'reserved' | 'maintenance' | 'lost'>('all');
  const [addCopyModalOpen, setAddCopyModalOpen] = useState(false);
  const [targetBookForNewCopy, setTargetBookForNewCopy] = useState<string>('');
  const [newCopyShelf, setNewCopyShelf] = useState('');
  const [newCopyCondition, setNewCopyCondition] = useState<'good' | 'fair' | 'damaged'>('good');
  const [barcodeModalCopy, setBarcodeModalCopy] = useState<BookCopy | null>(null);

  // Holds State
  const [holdShelfInput, setHoldShelfInput] = useState('Hold Shelf Bay 1');
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(null);
  const [holdSuccessMsg, setHoldSuccessMsg] = useState<string | null>(null);

  // Fines Modal State
  const [waiveModalOpen, setWaiveModalOpen] = useState<{ fineId: string; studentName: string; amount: number } | null>(null);
  const [waiveReason, setWaiveReason] = useState('First offense waiver approved by librarian');
  const [paymentReceipt, setPaymentReceipt] = useState<{ id: string; student: string; amount: number; title: string; date: string } | null>(null);

  // Notice feedback
  const [noticeToast, setNoticeToast] = useState<string | null>(null);
  const [deleteCopyConfirmId, setDeleteCopyConfirmId] = useState<string | null>(null);

  // Data fetching from storage
  const books = saasStorage.getBooksForTenant(tenant.id);
  const copies = saasStorage.getCopiesForTenant(tenant.id);
  const loans = saasStorage.getLoansForTenant(tenant.id);
  const activeLoans = loans.filter((l) => l.status === 'active');
  const reservations = saasStorage.getReservationsForTenant(tenant.id);
  const fines = saasStorage.getFinesForTenant(tenant.id);
  const members = saasStorage.getUsersForTenant(tenant.id);
  const reports = saasStorage.generateBranchReports(tenant.id);

  // Overdue calculations
  const nowTime = new Date().getTime();
  const overdueLoans = activeLoans.filter((l) => new Date(l.dueDate).getTime() < nowTime);

  // Circulation issue handler
  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setCirculationFeedback(null);
    setIssuedReceipt(null);

    const targetBook = books.find((b) => b.id === selectedBookId);
    if (!targetBook) {
      setCirculationFeedback({ type: 'error', message: 'Please select a catalogued book to issue.' });
      return;
    }

    if (targetBook.copiesAvailable <= 0) {
      setCirculationFeedback({ type: 'error', message: 'No physical copies of this title are currently available on shelves.' });
      return;
    }

    const memberEntry = members.find((m) => m.user.id === selectedMemberId);
    if (!memberEntry) {
      setCirculationFeedback({ type: 'error', message: 'Please select a registered student or faculty member.' });
      return;
    }

    try {
      // 1. Post to real database endpoint
      const serverRes = await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/loans/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: targetBook.id,
          bookTitle: targetBook.title,
          isbn: targetBook.isbn,
          userEmailOrId: memberEntry.user.email,
          memberId: memberEntry.user.id,
          memberName: memberEntry.user.fullName,
          staffName: tenantSession.user.fullName,
          customLoanDays,
        }),
      });

      const serverData = await serverRes.json();
      if (!serverRes.ok) {
        throw new Error(serverData.error || 'Server rejected loan issuance.');
      }

      // 2. Sync to local state
      const res = saasStorage.issueBookLoan(
        tenant.id,
        targetBook.id,
        manualAccession.trim() || targetBook.isbn,
        memberEntry.user.email,
        tenantSession.user.fullName,
        customLoanDays
      );

      if (res.success && res.loan) {
        setIssuedReceipt(res.loan);
        setCirculationFeedback({
          type: 'success',
          message: `Book "${res.loan.bookTitle}" (Accession: ${res.loan.accessionNumber}) successfully issued to ${res.loan.userName}! Due date: ${new Date(res.loan.dueDate).toLocaleDateString()}.`,
        });
        setSelectedBookId('');
        setSelectedMemberId('');
        setManualAccession('');
        setNonce((n) => n + 1);
      } else {
        throw new Error(res.error || 'Failed to complete loan registration.');
      }
    } catch (err: any) {
      setCirculationFeedback({ type: 'error', message: err.message || 'Failed to issue book. Database rejected request.' });
    }
  };

  // Return book handler
  const handleConfirmReturn = async (loanId: string) => {
    try {
      // 1. Post to real database endpoint
      const serverRes = await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/loans/${encodeURIComponent(loanId)}/return`, {
        method: 'POST',
      });
      if (!serverRes.ok) {
        const data = await serverRes.json().catch(() => ({}));
        throw new Error(data.error || 'Server rejected book return.');
      }

      // 2. Sync local state
      const res = saasStorage.returnBookLoan(loanId);
      if (res.success && res.loan) {
        if (returnConditionModal && returnCondition !== 'good') {
          saasStorage.updatePhysicalCopy(returnConditionModal.copyId, { condition: returnCondition });
        }
        setCirculationFeedback({
          type: 'success',
          message: `Book "${res.loan.bookTitle}" returned successfully! Copy condition logged as "${returnCondition}".${
            res.loan.fineAmount > 0 ? ` Overdue fine of ₹${res.loan.fineAmount.toFixed(2)} assessed.` : ''
          }`,
        });
        setReturnConditionModal(null);
        setNonce((n) => n + 1);
      } else {
        throw new Error(res.error || 'Failed to update local loan record.');
      }
    } catch (err: any) {
      setCirculationFeedback({ type: 'error', message: err.message || 'Failed to process return in database.' });
    }
  };

  // Renew book handler
  const handleRenewBook = async (loanId: string) => {
    try {
      // 1. Post to backend endpoint
      const serverRes = await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/loans/${encodeURIComponent(loanId)}/renew`, {
        method: 'POST',
      });
      if (!serverRes.ok) {
        const data = await serverRes.json().catch(() => ({}));
        throw new Error(data.error || 'Server rejected loan renewal.');
      }

      // 2. Sync local state
      const res = saasStorage.renewBookLoan(loanId, tenant.settings.defaultLoanPeriodDays || 14);
      if (res.success && res.loan) {
        setCirculationFeedback({
          type: 'success',
          message: `Loan for "${res.loan.bookTitle}" extended! New due date: ${new Date(res.loan.dueDate).toLocaleDateString()}.`,
        });
        setNonce((n) => n + 1);
      } else {
        throw new Error(res.error || 'Renewal failed.');
      }
    } catch (err: any) {
      setCirculationFeedback({ type: 'error', message: err.message || 'Renewal failed in database.' });
    }
  };

  // Hold fulfillment
  const handleFulfillHold = async (resId: string, shelf: string) => {
    try {
      await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/reservations/${encodeURIComponent(resId)}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupShelf: shelf }),
      });
      saasStorage.fulfillReservation(resId, shelf);
      setHoldSuccessMsg(`Hold updated: Book marked Ready for Pickup on ${shelf}! Student notified.`);
      setSelectedHoldId(null);
      setNonce((n) => n + 1);
      setTimeout(() => setHoldSuccessMsg(null), 4000);
    } catch (err: any) {
      setNoticeToast(`Failed to fulfill hold in database: ${err.message}`);
    }
  };

  // Collect fine
  const handleCollectFine = async (fine: Fine) => {
    try {
      await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/fines/${encodeURIComponent(fine.id)}/pay`, {
        method: 'POST',
      });
      saasStorage.payFine(fine.id);
      setPaymentReceipt({
        id: `RCP-${Date.now().toString().slice(-6)}`,
        student: fine.userName,
        amount: fine.amount,
        title: fine.bookTitle,
        date: new Date().toLocaleDateString(),
      });
      setNonce((n) => n + 1);
    } catch (err: any) {
      setNoticeToast(`Failed to record fine payment in database: ${err.message}`);
    }
  };

  // Waive fine
  const handleConfirmWaiveFine = async () => {
    if (!waiveModalOpen) return;
    try {
      await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/fines/${encodeURIComponent(waiveModalOpen.fineId)}/waive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: waiveReason }),
      });
      saasStorage.waiveFine(waiveModalOpen.fineId);
      saasStorage.logActivity({
        tenantId: tenant.id,
        actorId: tenantSession.user.id,
        actorName: tenantSession.user.fullName,
        actorRole: 'librarian',
        action: 'FINE_WAIVED',
        category: 'library_admin',
        details: `Waived ₹${waiveModalOpen.amount.toFixed(2)} fine for ${waiveModalOpen.studentName}. Reason: ${waiveReason}`,
      });
      setWaiveModalOpen(null);
      setNonce((n) => n + 1);
    } catch (err: any) {
      setNoticeToast(`Failed to waive fine in database: ${err.message}`);
    }
  };

  // Add physical copy
  const handleAddPhysicalCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBookForNewCopy) return;
    try {
      await fetch(`/api/tenants/${encodeURIComponent(tenant.slug)}/books/${encodeURIComponent(targetBookForNewCopy)}/copies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shelfLocation: newCopyShelf.trim() || undefined,
          condition: newCopyCondition,
        }),
      });
      saasStorage.addPhysicalCopy(tenant.id, targetBookForNewCopy, {
        shelfLocation: newCopyShelf.trim() || undefined,
        condition: newCopyCondition,
      });
      setAddCopyModalOpen(false);
      setTargetBookForNewCopy('');
      setNewCopyShelf('');
      setNonce((n) => n + 1);
    } catch (err: any) {
      setNoticeToast(`Failed to create physical copy in database: ${err.message}`);
    }
  };

  // Overdue notice toast
  const handleSendReminder = (email: string, title: string) => {
    setNoticeToast(`Simulated Overdue Notice & Fine Calculation sent to ${email} for "${title}".`);
    setTimeout(() => setNoticeToast(null), 4000);
  };

  // Filtered physical copies
  const filteredCopies = copies.filter((c) => {
    const matchesSearch =
      c.accessionNumber.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      c.barcode.includes(inventorySearch) ||
      c.bookTitle.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      c.shelfLocation.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesCondition = inventoryConditionFilter === 'all' || c.condition === inventoryConditionFilter;
    const matchesStatus = inventoryStatusFilter === 'all' || c.status === inventoryStatusFilter;
    return matchesSearch && matchesCondition && matchesStatus;
  });

  // Export circulation CSV
  const handleExportCirculationCSV = () => {
    const headers = 'Loan ID,Book Title,Accession,Borrower Name,Borrower Email,Issued Date,Due Date,Status,Fine Assessed\n';
    const rows = loans
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Header */}
      <header className="bg-emerald-950 text-white border-b border-emerald-900 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight text-white">{tenant.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIBRARIAN DESK (LEVEL 3)
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/80">
                Staff Officer: <strong>{tenantSession.user.fullName}</strong> ({tenantSession.user.email})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => navigate(`/l/${tenant.slug}`)}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 font-medium transition-colors cursor-pointer"
            >
              <span>Library Home</span>
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

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6 flex items-center space-x-1 border-t border-emerald-900/60 text-xs overflow-x-auto">
          {[
            { id: 'circulation', label: `Circulation Desk (${activeLoans.length})`, icon: ScanBarcode },
            { id: 'catalogue', label: `Catalogue Titles (${books.length})`, icon: BookOpen },
            { id: 'inventory', label: `Physical Copies (${copies.length})`, icon: Layers },
            { id: 'holds', label: `Holds & Reservations (${reservations.filter((r) => r.status === 'pending' || r.status === 'ready').length})`, icon: Bookmark },
            { id: 'fines', label: `Fines & Cashier (${fines.filter((f) => f.status === 'pending').length})`, icon: DollarSign },
            { id: 'overdue', label: `Overdue Queue (${overdueLoans.length})`, icon: AlertTriangle },
            { id: 'reports', label: 'Shift Reports', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3.5 font-semibold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-900/50'
                    : 'border-transparent text-emerald-200/70 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1 text-xs">
        {/* Global Alert Toast */}
        {noticeToast && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 flex items-center space-x-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">{noticeToast}</span>
          </div>
        )}

        {/* Global Feedback */}
        {circulationFeedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs shadow-xs ${
              circulationFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {circulationFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span className="font-semibold">{circulationFeedback.message}</span>
            </div>
            <button onClick={() => setCirculationFeedback(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================= TAB 1: CIRCULATION DESK ================= */}
        {activeTab === 'circulation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Check-Out Form */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs lg:col-span-1 space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <ScanBarcode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Issue Book Check-Out</h3>
                    <p className="text-[11px] text-slate-400">Scan accession number or choose title & student</p>
                  </div>
                </div>

                <form onSubmit={handleIssueBook} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Select Catalogue Title <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedBookId}
                      onChange={(e) => setSelectedBookId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 bg-white"
                      required
                    >
                      <option value="">-- Choose Book from Catalogue --</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id} disabled={b.copiesAvailable <= 0}>
                          {b.title} ({b.copiesAvailable}/{b.copiesTotal} available)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Borrower Student / Member <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 bg-white"
                      required
                    >
                      <option value="">-- Choose Enrolled Student --</option>
                      {members.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.fullName} ({m.user.studentId || m.user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Physical Copy Accession / Barcode (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={manualAccession}
                        onChange={(e) => setManualAccession(e.target.value)}
                        placeholder="e.g. ACC-GEN-0012 or Barcode Scan"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 font-mono"
                      />
                      <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">If blank, any available physical copy will be automatically assigned.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Loan Duration Override
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={customLoanDays}
                        onChange={(e) => setCustomLoanDays(Number(e.target.value))}
                        className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 font-bold"
                      />
                      <span className="text-slate-500 text-[11px]">days (Default: 7)</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Check-Out</span>
                  </button>
                </form>

                {/* Printable Receipt Preview */}
                {issuedReceipt && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px]">Circulation Receipt</span>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center space-x-1 text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>
                    </div>
                    <div className="text-[11px] space-y-1 font-mono text-slate-600">
                      <div><strong>Item:</strong> {issuedReceipt.bookTitle}</div>
                      <div><strong>Accession:</strong> {issuedReceipt.accessionNumber}</div>
                      <div><strong>Borrower:</strong> {issuedReceipt.userName}</div>
                      <div><strong>Due Date:</strong> {new Date(issuedReceipt.dueDate).toLocaleDateString()}</div>
                      <div><strong>Issuer:</strong> {issuedReceipt.issuedByStaffName}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Loans Table */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Active Branch Circulation ({activeLoans.length})</h3>
                    <p className="text-[11px] text-slate-400">High-speed return, 1-click renewal, and overdue assessment</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleExportCirculationCSV}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {activeLoans.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p>No books currently checked out. Ready for issues!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">Title & Accession</th>
                          <th className="py-2.5 px-3">Borrower Member</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeLoans.map((loan) => {
                          const isOverdue = new Date(loan.dueDate).getTime() < nowTime;
                          return (
                            <tr key={loan.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">{loan.bookTitle}</div>
                                <div className="font-mono text-[10px] text-slate-500">{loan.accessionNumber}</div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-medium text-slate-800">{loan.userName}</div>
                                <div className="text-[10px] text-slate-400">{loan.userEmail}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span className={isOverdue ? 'font-bold text-rose-600' : 'text-slate-700'}>
                                  {new Date(loan.dueDate).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isOverdue ? 'OVERDUE' : 'ACTIVE'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleRenewBook(loan.id)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded text-[11px] cursor-pointer"
                                  title="Extend loan by 14 days"
                                >
                                  Renew (+14d)
                                </button>
                                <button
                                  onClick={() =>
                                    setReturnConditionModal({
                                      loanId: loan.id,
                                      title: loan.bookTitle,
                                      copyId: loan.copyId,
                                    })
                                  }
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] cursor-pointer"
                                >
                                  Return Book
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: CATALOGUE TITLES ================= */}
        {activeTab === 'catalogue' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Library Title Catalogue ({books.length})</h3>
                <p className="text-slate-500 text-[11px]">Inspect book metadata, shelf placements, and copy availability.</p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalogue..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Title & Author</th>
                    <th className="py-2.5 px-3">Category & ISBN</th>
                    <th className="py-2.5 px-3">Call # & Location</th>
                    <th className="py-2.5 px-3">Physical Copies</th>
                    <th className="py-2.5 px-3 text-right">Inspect Copies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {books
                    .filter((b) =>
                      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      b.authors.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
                      b.category.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{b.title}</div>
                          <div className="text-[11px] text-slate-500">{b.authors.join(', ')}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                            {b.category}
                          </span>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">{b.isbn}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div className="font-mono font-semibold">{b.callNumber}</div>
                          <div className="text-[10px] text-slate-400">{b.shelfLocation}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900">{b.copiesAvailable}</span>
                          <span className="text-slate-400"> / {b.copiesTotal} available</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedBookForCopies(b)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] cursor-pointer"
                          >
                            View Copies →
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PHYSICAL INVENTORY & COPIES ================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Physical Copy Inventory ({copies.length})</h3>
                <p className="text-[11px] text-slate-500">Accession numbers, barcodes, copy conditions, and shelf tracking</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAddCopyModalOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Physical Copy</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Filter by accession, barcode, title, shelf..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500"
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

            {/* Copies Inventory Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Accession #</th>
                    <th className="py-3 px-4">Barcode</th>
                    <th className="py-3 px-4">Associated Title</th>
                    <th className="py-3 px-4">Shelf Location</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCopies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.accessionNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.barcode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{c.bookTitle}</td>
                      <td className="py-3 px-4 text-slate-600">{c.shelfLocation}</td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setBarcodeModalCopy(c)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[10px] cursor-pointer"
                        >
                          Barcode Label
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
                                  setNoticeToast(`Physical copy ${c.accessionNumber} deleted.`);
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

        {/* ================= TAB 4: HOLDS & RESERVATIONS ================= */}
        {activeTab === 'holds' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hold & Reservation Queues ({reservations.length})</h3>
                <p className="text-slate-500 text-[11px]">Manage student requests, mark items ready for pickup, or assign hold shelves.</p>
              </div>
            </div>

            {holdSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
                {holdSuccessMsg}
              </div>
            )}

            {reservations.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No hold reservations currently placed.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Title Requested</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Reserved At</th>
                      <th className="py-2.5 px-3">Pickup Shelf</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Hold Desk Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-bold text-slate-900">{res.bookTitle}</td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{res.userName}</div>
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
                              onClick={() => setSelectedHoldId(res.id)}
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
                              Fulfill on Pickup
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
                              Cancel Hold
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

        {/* ================= TAB 5: FINES & CASHIER ================= */}
        {activeTab === 'fines' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Assessed</span>
                <div className="text-xl font-black text-slate-900 mt-1">₹{reports.finesSummary.totalAssessed.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase">Collected / Paid</span>
                <div className="text-xl font-black text-emerald-700 mt-1">₹{reports.finesSummary.totalPaid.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-rose-600 uppercase">Outstanding Pending</span>
                <div className="text-xl font-black text-rose-700 mt-1">₹{reports.finesSummary.totalPending.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Waived By Staff</span>
                <div className="text-xl font-black text-slate-600 mt-1">₹{reports.finesSummary.totalWaived.toFixed(2)}</div>
              </div>
            </div>

            {/* Payment Receipt Banner */}
            {paymentReceipt && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-emerald-900">Fine Payment Receipt Generated (#{paymentReceipt.id})</div>
                  <div className="text-emerald-700 text-[11px]">
                    Collected ₹{paymentReceipt.amount.toFixed(2)} from {paymentReceipt.student} for overdue "{paymentReceipt.title}".
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

            {/* Fines Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Fines & Penalties Register ({fines.length})</h3>
                  <p className="text-slate-500 text-[11px]">Record cash payments, print receipts, or submit authorized waivers.</p>
                </div>
              </div>

              {fines.length === 0 ? (
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
                        <th className="py-2.5 px-3 text-right">Cashier Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fines.map((f) => (
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
                                  onClick={() => handleCollectFine(f)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded cursor-pointer"
                                >
                                  Collect ₹{f.amount.toFixed(2)}
                                </button>
                                <button
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

        {/* ================= TAB 6: OVERDUE QUEUE ================= */}
        {activeTab === 'overdue' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Overdue Loan Queue ({overdueLoans.length})</h3>
                <p className="text-slate-500 text-[11px]">
                  Daily rate: <strong>₹{tenant.settings.finePerDay.toFixed(2)}/day</strong> past due date.
                </p>
              </div>
            </div>

            {overdueLoans.length === 0 ? (
              <div className="text-center py-8 text-emerald-700 font-semibold space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600" />
                <p>All active loans in {tenant.name} are in good standing! No overdue items.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Title & Accession</th>
                      <th className="py-2.5 px-3">Borrower Details</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Days Past</th>
                      <th className="py-2.5 px-3">Accrued Fine</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overdueLoans.map((loan) => {
                      const daysPast = Math.ceil(
                        (nowTime - new Date(loan.dueDate).getTime()) / (1000 * 3600 * 24)
                      );
                      const fineAccrued = daysPast * (tenant.settings.finePerDay || 0.5);
                      return (
                        <tr key={loan.id} className="hover:bg-rose-50/40">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{loan.bookTitle}</div>
                            <span className="font-mono text-[10px] text-slate-400">{loan.accessionNumber}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{loan.userName}</div>
                            <div className="text-slate-400 text-[10px]">{loan.userEmail}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-rose-600">
                            {new Date(loan.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 font-bold text-rose-700">+{daysPast} days</td>
                          <td className="py-3 px-3 font-bold text-slate-900">₹{fineAccrued.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleSendReminder(loan.userEmail, loan.bookTitle)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold cursor-pointer"
                            >
                              Notice Alert
                            </button>
                            <button
                              onClick={() =>
                                setReturnConditionModal({
                                  loanId: loan.id,
                                  title: loan.bookTitle,
                                  copyId: loan.copyId,
                                })
                              }
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer"
                            >
                              Collect & Return
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 7: SHIFT REPORTS & ANALYTICS ================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Circulation Shift Overview & Analytics</h3>
                <p className="text-[11px] text-slate-500">Live transaction velocities, top borrowed titles, and copy conditions</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Shift Summary</span>
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Total Circulations</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{reports.overview.totalLoans}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase">Active Loans</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">{reports.overview.activeLoansCount}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-rose-600 uppercase">Overdue Items</span>
                <div className="text-2xl font-black text-rose-700 mt-1">{reports.overview.overdueLoansCount}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-purple-600 uppercase">Hold Reservations</span>
                <div className="text-2xl font-black text-purple-700 mt-1">{reports.overview.totalReservations}</div>
              </div>
            </div>

            {/* Top Borrowed Titles & Physical Condition Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Top Circulated Titles</h4>
                {reports.topBorrowed.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No loans recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {reports.topBorrowed.map((item, idx) => (
                      <div key={item.book.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
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

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Physical Copy Health & Conditions</h4>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Good Condition</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">{reports.conditionBreakdown.good}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Fair Wear</span>
                    <div className="text-xl font-black text-amber-900 mt-1">{reports.conditionBreakdown.fair}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-center">
                    <span className="text-[10px] font-bold text-rose-800 uppercase">Damaged / Repair</span>
                    <div className="text-xl font-black text-rose-900 mt-1">{reports.conditionBreakdown.damaged}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: RETURN CONDITION CHECK ================= */}
      {returnConditionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Return Physical Copy Inspection</h3>
            <p className="text-xs text-slate-500">
              Returning "{returnConditionModal.title}". Inspect physical condition before placing back in circulation:
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Physical Condition Assessment:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['good', 'fair', 'damaged'] as const).map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setReturnCondition(cond)}
                    className={`py-2 text-xs font-bold rounded-lg border capitalize cursor-pointer transition-colors ${
                      returnCondition === cond
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setReturnConditionModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmReturn(returnConditionModal.loanId)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Complete Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MARK HOLD READY ================= */}
      {selectedHoldId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Assign Hold Pickup Shelf</h3>
            <p className="text-xs text-slate-500">Specify where the student can find their reserved copy:</p>
            <input
              type="text"
              value={holdShelfInput}
              onChange={(e) => setHoldShelfInput(e.target.value)}
              placeholder="e.g. Hold Shelf Bay 1, Tier 2"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedHoldId(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFulfillHold(selectedHoldId, holdShelfInput)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Confirm & Notify Student
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500"
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
                  {books.map((b) => (
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

      {/* ================= MODAL: BARCODE & SPINE LABEL ================= */}
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

              {/* Visual simulated barcode */}
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
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Label</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW COPIES FOR BOOK ================= */}
      {selectedBookForCopies && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedBookForCopies.title}</h3>
                <p className="text-xs text-slate-500">Physical Copies Inventory ({selectedBookForCopies.copiesTotal} total)</p>
              </div>
              <button onClick={() => setSelectedBookForCopies(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {copies.filter((c) => c.bookId === selectedBookForCopies.id).map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-800">{c.accessionNumber}</span>
                    <span className="text-slate-400 text-[10px] ml-2">Barcode: {c.barcode}</span>
                    <div className="text-[11px] text-slate-500">{c.shelfLocation}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {c.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium capitalize">
                      {c.condition}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBookForCopies(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
