import React, { useState } from 'react';
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
} from 'lucide-react';
import { Invoice } from '../../types/saas';
import { saasStorage } from '../../services/storage';

export const BillingInvoicesManager: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(() => saasStorage.getInvoices());
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  // Manual payment modal state
  const [paymentMethod, setPaymentMethod] = useState('Bank Wire / ACH');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [reminderStatus, setReminderStatus] = useState<Record<string, string>>({});

  const refreshInvoices = () => {
    setInvoices(saasStorage.getInvoices());
  };

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

  const handleSendReminder = (tenantId: string) => {
    const success = saasStorage.sendSubscriptionExpiryReminder(tenantId);
    if (success) {
      setReminderStatus((prev) => ({ ...prev, [tenantId]: 'Dispatched' }));
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

  return (
    <div className="space-y-6">
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

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Platform Invoices & Subscription Billing
            </h3>
            <p className="text-xs text-slate-400">
              Record manual institutional payments or issue renewal reminder notices
            </p>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[720px]">
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
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                    {inv.invoiceNumber}
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
              ))}
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
                  placeholder="e.g. WIRE-89210-BOA"
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
    </div>
  );
};
