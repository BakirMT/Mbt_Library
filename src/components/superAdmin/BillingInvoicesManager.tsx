import React, { useState, useEffect } from 'react';
import {
  Receipt,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  X,
  CreditCard,
  Building2,
  FileText,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Download,
} from 'lucide-react';
import { Invoice, Tenant } from '../../types/saas';
import { saasStorage } from '../../services/storage';

export const BillingInvoicesManager: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(() => saasStorage.getInvoices());
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<Invoice | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');

  // Manual payment modal state
  const [paymentMethod, setPaymentMethod] = useState('Bank Wire / ACH');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [reminderStatus, setReminderStatus] = useState<Record<string, string>>({});

  // Issue Invoice modal state
  const tenants = saasStorage.getTenants();
  const [issueTenantId, setIssueTenantId] = useState(tenants[0]?.id || '');
  const [issuePlanName, setIssuePlanName] = useState('Standard Campus Plan');
  const [issueBillingCycle, setIssueBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [issueAmount, setIssueAmount] = useState(49990);
  const [issueDueDate, setIssueDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [issueNotes, setIssueNotes] = useState('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const refreshInvoices = () => {
    saasStorage
      .syncInvoicesFromApi()
      .then((invList) => setInvoices(invList))
      .catch(() => setInvoices(saasStorage.getInvoices()));
  };

  useEffect(() => {
    refreshInvoices();
    const handleUpdate = () => setInvoices(saasStorage.getInvoices());
    window.addEventListener('mbt_invoices_updated', handleUpdate);
    return () => window.removeEventListener('mbt_invoices_updated', handleUpdate);
  }, []);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleRecordPayment = async () => {
    if (!selectedInvoiceForPayment) return;
    setIsProcessingPayment(true);
    setPaymentError(null);

    const ref = transactionRef || `MANUAL-${Date.now().toString().slice(-6)}`;

    try {
      // 1. Post to real Cloud SQL backend
      const res = await fetch(`/api/invoices/${encodeURIComponent(selectedInvoiceForPayment.id)}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          transactionReference: ref,
          notes: paymentNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to record payment in database.');
      }

      // 2. Sync to local state
      saasStorage.recordManualPayment(
        selectedInvoiceForPayment.id,
        paymentMethod,
        ref,
        paymentNotes
      );

      showToast(`Payment recorded for ${selectedInvoiceForPayment.invoiceNumber} in Cloud SQL!`);
      setSelectedInvoiceForPayment(null);
      setTransactionRef('');
      setPaymentNotes('');
      refreshInvoices();
    } catch (err: any) {
      setPaymentError(err.message || 'Payment write rejected by server.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTenantId || !issueAmount || !issueDueDate) {
      showToast('Please provide tenant, amount, and due date.');
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: issueTenantId,
          planName: issuePlanName,
          billingCycle: issueBillingCycle,
          amount: Number(issueAmount),
          currency: 'INR',
          dueDate: issueDueDate,
          notes: issueNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate institutional invoice.');
      }

      const resData = await res.json();
      saasStorage.createInvoice({
        tenantId: issueTenantId,
        planName: issuePlanName,
        billingCycle: issueBillingCycle,
        amount: Number(issueAmount),
        dueDate: issueDueDate,
        notes: issueNotes,
      });

      showToast(`Invoice ${resData.invoice?.invoiceNumber || ''} generated & saved to database.`);
      setIsGeneratingInvoice(false);
      setIssueNotes('');
      refreshInvoices();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleSendReminder = (tenantId: string) => {
    const success = saasStorage.sendSubscriptionExpiryReminder(tenantId);
    if (success) {
      setReminderStatus((prev) => ({ ...prev, [tenantId]: 'Dispatched' }));
      showToast('Renewal notice dispatched and audit event logged.');
      setTimeout(() => {
        setReminderStatus((prev) => {
          const next = { ...prev };
          delete next[tenantId];
          return next;
        });
      }, 3000);
    }
  };

  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + i.amount, 0);

  const totalPending = invoices
    .filter((i) => i.status === 'pending')
    .reduce((acc, i) => acc + i.amount, 0);

  const totalOverdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((acc, i) => acc + i.amount, 0);

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.tenantName.toLowerCase().includes(q) ||
      inv.planName.toLowerCase().includes(q) ||
      (inv.transactionReference && inv.transactionReference.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Platform Invoices & Subscription Billing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage institutional licensing invoices, record reconciled bank wire transfers, and issue payment notices.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={refreshInvoices}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Cloud SQL</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGeneratingInvoice(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Invoice</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Revenue Collected
          </span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            ₹{totalPaid.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            Paid invoices across all institutions
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pending Collections
          </span>
          <div className="mt-2 text-2xl font-black text-blue-700">
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting annual/monthly wire transfer</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Overdue Balance
          </span>
          <div className="mt-2 text-2xl font-black text-rose-600">
            ₹{totalOverdue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-rose-500 mt-1">Subject to grace period suspension</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, institution, plan, or reference..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 overflow-x-auto w-full sm:w-auto">
          {(
            [
              { id: 'all', label: 'All Invoices', count: invoices.length },
              { id: 'paid', label: 'Paid', count: invoices.filter((i) => i.status === 'paid').length },
              { id: 'pending', label: 'Pending', count: invoices.filter((i) => i.status === 'pending').length },
              { id: 'overdue', label: 'Overdue', count: invoices.filter((i) => i.status === 'overdue').length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Issued Institutional Invoices ({filteredInvoices.length})
            </h3>
            <p className="text-xs text-slate-400">
              Live records persisted in Cloud SQL PostgreSQL with audit trail
            </p>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Invoice Number</th>
                <th className="px-5 py-3 font-semibold">Tenant Institution</th>
                <th className="px-5 py-3 font-semibold">Plan & Period</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Due Date</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No platform invoices found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceForReceipt(inv)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{inv.invoiceNumber}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{inv.tenantName}</div>
                      <div className="text-[10px] text-slate-400">ID: {inv.tenantId}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-700">{inv.planName}</span>
                      <span className="block text-[10px] text-slate-400 capitalize">
                        {inv.billingCycle}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      ₹{inv.amount.toLocaleString('en-IN')} {inv.currency}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : inv.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForReceipt(inv)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer flex items-center space-x-1"
                          title="View / Print Institutional Receipt"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>

                        {inv.status !== 'paid' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs cursor-pointer shadow-2xs"
                          >
                            Record Payment
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center px-1">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
                            {inv.paymentMethod || 'Paid'}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSendReminder(inv.tenantId)}
                          disabled={!!reminderStatus[inv.tenantId]}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium cursor-pointer disabled:opacity-50"
                        >
                          {reminderStatus[inv.tenantId] || 'Send Reminder'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Record Manual Payment: {selectedInvoiceForPayment.invoiceNumber}
              </h3>
              <button
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Institution:</div>
                <div className="font-bold text-slate-900">
                  {selectedInvoiceForPayment.tenantName}
                </div>
                <div className="text-base font-black text-slate-900 mt-1">
                  ₹{selectedInvoiceForPayment.amount.toLocaleString('en-IN')} INR
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="Bank Wire / ACH">Bank Wire / ACH Transfer</option>
                  <option value="Direct Institutional Check">Direct Institutional Check</option>
                  <option value="Cash / Receipt Voucher">Cash / Receipt Voucher</option>
                  <option value="Credit Card (Stripe Terminal)">Credit Card (Stripe Terminal)</option>
                  <option value="UPI Institutional Transfer">UPI Institutional Transfer</option>
                  <option value="Government Educational Grant">Government Educational Grant</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transaction Reference / Cheque #
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. WIRE-89210-BOA or UPI-9982104"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {paymentError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes & Reconciliation Notes
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional notes regarding the recorded payment..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t flex justify-end space-x-2">
              <button
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={isProcessingPayment}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {isProcessingPayment ? 'Recording in Cloud SQL...' : 'Confirm Payment Received'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ISSUE NEW INVOICE ================= */}
      {isGeneratingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150 my-8">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm">Issue New Institutional Invoice</h3>
              </div>
              <button onClick={() => setIsGeneratingInvoice(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Institution *</label>
                <select
                  value={issueTenantId}
                  onChange={(e) => setIssueTenantId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                  required
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan & Tier Name</label>
                <input
                  type="text"
                  value={issuePlanName}
                  onChange={(e) => setIssuePlanName(e.target.value)}
                  placeholder="e.g. Standard Campus Plan"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={issueBillingCycle}
                    onChange={(e) => setIssueBillingCycle(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹ INR) *</label>
                  <input
                    type="number"
                    value={issueAmount}
                    onChange={(e) => setIssueAmount(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 border rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={issueDueDate}
                  onChange={(e) => setIssueDueDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Invoice Remarks & Terms</label>
                <textarea
                  rows={2}
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="e.g. Annual licensing renewal for next academic cycle..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="bg-slate-50 -mx-5 -mb-5 px-5 py-3 border-t flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsGeneratingInvoice(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingInvoice}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isCreatingInvoice ? 'Issuing in Cloud SQL...' : 'Generate & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW / PRINT INVOICE RECEIPT ================= */}
      {selectedInvoiceForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Institutional Invoice Receipt</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedInvoiceForReceipt.invoiceNumber}</p>
                </div>
              </div>
              <button onClick={() => setSelectedInvoiceForReceipt(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <div className="font-black text-slate-900 text-base">MBT Library SaaS</div>
                  <div className="text-[11px] text-slate-500">Centralized Cloud Library System</div>
                  <div className="text-[10px] text-slate-400 mt-1">Tax ID / GST: 32AABCM9012K1ZT</div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      selectedInvoiceForReceipt.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : selectedInvoiceForReceipt.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {selectedInvoiceForReceipt.status}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Issued: {new Date(selectedInvoiceForReceipt.issueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Billed Institution</div>
                <div className="font-bold text-slate-900 text-sm">{selectedInvoiceForReceipt.tenantName}</div>
                <div className="text-slate-600">Tenant Account ID: <span className="font-mono">{selectedInvoiceForReceipt.tenantId}</span></div>
                <div className="text-slate-600">Due Date: <strong>{new Date(selectedInvoiceForReceipt.dueDate).toLocaleDateString()}</strong></div>
              </div>

              {/* Line items table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Cycle</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-800">{selectedInvoiceForReceipt.planName}</div>
                      <div className="text-[10px] text-slate-400">Multi-tenant cloud core platform license</div>
                    </td>
                    <td className="py-2.5 text-right capitalize text-slate-600">{selectedInvoiceForReceipt.billingCycle}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      ₹{selectedInvoiceForReceipt.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-800">
                    <th colSpan={2} className="py-2.5 font-bold text-slate-800 text-right">Total Net Amount:</th>
                    <th className="py-2.5 font-black text-slate-900 text-right text-sm">
                      ₹{selectedInvoiceForReceipt.amount.toLocaleString('en-IN')} INR
                    </th>
                  </tr>
                </tfoot>
              </table>

              {selectedInvoiceForReceipt.status === 'paid' && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 space-y-0.5">
                  <div className="font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Payment Received & Reconciled</span>
                  </div>
                  <div>Method: {selectedInvoiceForReceipt.paymentMethod || 'Manual Transfer'}</div>
                  {selectedInvoiceForReceipt.transactionReference && (
                    <div className="font-mono text-[10px]">Reference: {selectedInvoiceForReceipt.transactionReference}</div>
                  )}
                  {selectedInvoiceForReceipt.paidAt && (
                    <div className="text-[10px]">Date: {new Date(selectedInvoiceForReceipt.paidAt).toLocaleString()}</div>
                  )}
                </div>
              )}

              {selectedInvoiceForReceipt.notes && (
                <div className="text-slate-500 italic text-[11px]">
                  Note: {selectedInvoiceForReceipt.notes}
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedInvoiceForReceipt(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center space-x-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
