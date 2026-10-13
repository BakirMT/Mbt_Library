import React, { useState } from 'react';
import {
  FileClock,
  Shield,
  Search,
  Filter,
  Building2,
  CreditCard,
  Key,
  Calendar,
} from 'lucide-react';
import { ActivityLog } from '../../types/saas';
import { saasStorage } from '../../services/storage';

export const ActivityLogsView: React.FC = () => {
  const [logs] = useState<ActivityLog[]>(() => saasStorage.getActivityLogs());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Platform Activity & Security Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically timestamped audit log of provisioning, authentication, and plan operations.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, details, institution, or actor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700"
        >
          <option value="all">All Categories</option>
          <option value="provisioning">Provisioning Events</option>
          <option value="subscription">Subscription & Billing</option>
          <option value="security">Security & Invitations</option>
          <option value="auth">Authentication</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Timestamp</th>
                <th className="px-5 py-3 font-semibold">Event Action</th>
                <th className="px-5 py-3 font-semibold">Target Institution</th>
                <th className="px-5 py-3 font-semibold">Actor & Role</th>
                <th className="px-5 py-3 font-semibold">Event Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                      {log.action}
                    </span>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
