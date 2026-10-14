import React, { useState, useEffect } from 'react';
import {
  FileClock,
  Shield,
  Search,
  Filter,
  Building2,
  CreditCard,
  Key,
  Calendar,
  RefreshCw,
  Download,
  CheckCircle2,
  Lock,
  Layers,
  Clock,
} from 'lucide-react';
import { ActivityLog } from '../../types/saas';
import { saasStorage } from '../../services/storage';

export const ActivityLogsView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>(() => saasStorage.getActivityLogs());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const refreshLogs = () => {
    setIsSyncing(true);
    saasStorage
      .syncActivityLogsFromApi()
      .then((freshLogs) => {
        setLogs(freshLogs);
        showToast('Audit trail synchronized with Cloud SQL database.');
      })
      .catch(() => setLogs(saasStorage.getActivityLogs()))
      .finally(() => setIsSyncing(false));
  };

  useEffect(() => {
    refreshLogs();
    const handleUpdate = () => setLogs(saasStorage.getActivityLogs());
    window.addEventListener('mbt_logs_updated', handleUpdate);
    return () => window.removeEventListener('mbt_logs_updated', handleUpdate);
  }, []);

  const handleExportCSV = () => {
    if (!filtered.length) {
      showToast('No logs to export.');
      return;
    }
    const headers = ['Timestamp', 'Action', 'Category', 'Target Institution', 'Actor Name', 'Actor Role', 'Details'];
    const rows = filtered.map((log) => [
      `"${new Date(log.timestamp).toISOString()}"`,
      `"${log.action}"`,
      `"${log.category}"`,
      `"${log.tenantName || 'Global Platform'}"`,
      `"${log.actorName}"`,
      `"${log.actorRole}"`,
      `"${log.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mbt_platform_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Audit trail exported as CSV.');
  };

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      (log.tenantName && log.tenantName.toLowerCase().includes(q));

    const matchesCat = categoryFilter === 'all' || log.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'provisioning':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
            <Building2 className="w-3 h-3" />
            <span>Provisioning</span>
          </span>
        );
      case 'subscription':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CreditCard className="w-3 h-3" />
            <span>Billing & Quota</span>
          </span>
        );
      case 'security':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
            <Key className="w-3 h-3" />
            <span>Tokens & Access</span>
          </span>
        );
      case 'auth':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
            <Shield className="w-3 h-3" />
            <span>Auth</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3" />
            <span>{category}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Platform Activity & Security Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically timestamped audit log of provisioning, authentication, token issuance, and plan operations.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={refreshLogs}
            disabled={isSyncing}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud SQL'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, details, institution, or actor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700 w-full sm:w-auto font-medium"
          >
            <option value="all">All Categories ({logs.length})</option>
            <option value="provisioning">Provisioning Events</option>
            <option value="subscription">Subscription & Billing</option>
            <option value="security">Security & Tokens</option>
            <option value="auth">Authentication</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Audit Records ({filtered.length})
          </span>
          <span className="text-xs text-slate-400">Chronologically ordered (newest first)</span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Timestamp</th>
                <th className="px-5 py-3 font-semibold">Event Action</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Target Institution</th>
                <th className="px-5 py-3 font-semibold">Actor & Role</th>
                <th className="px-5 py-3 font-semibold">Event Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No activity logs found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getCategoryBadge(log.category)}
                    </td>
                    <td className="px-5 py-3.5">
                      {log.tenantName ? (
                        <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {log.tenantName}
                        </span>
                      ) : (
                        <span className="text-slate-400">Global Platform</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{log.actorName}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {log.actorRole.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-md">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center space-x-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
