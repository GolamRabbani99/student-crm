import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api, type DashboardData } from '../api';
import { useAuth } from '../auth';
import { chartColors, ErrorBanner, Spinner, StatusBadge, timeAgo } from '../components/ui';

const statCards = [
  {
    key: 'totalStudents' as const,
    label: 'Total Students',
    iconBg: 'bg-blue-50 text-blue-600',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
      </svg>
    ),
  },
  {
    key: 'activeCount' as const,
    label: 'In Pipeline',
    iconBg: 'bg-amber-50 text-amber-600',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'successCount' as const,
    label: 'Successful',
    iconBg: 'bg-emerald-50 text-emerald-600',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'newThisMonth' as const,
    label: 'New This Month',
    iconBg: 'bg-violet-50 text-violet-600',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardData>('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">Here's what's happening with your student pipeline.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900">{data[card.key]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Pipeline by Status</h2>
          <p className="text-sm text-slate-500">Students at each stage</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byStatus} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-18} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.byStatus.map((entry) => (
                    <Cell key={entry.id} fill={chartColors[entry.color] ?? chartColors.slate} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">New Students</h2>
          <p className="text-sm text-slate-500">Last 6 months</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#trendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Top Universities</h2>
          <p className="text-sm text-slate-500">By number of students</p>
          <div className="mt-4 space-y-3">
            {data.byUniversity.length === 0 && <p className="text-sm text-slate-400">No students assigned to universities yet.</p>}
            {data.byUniversity.map((u) => {
              const max = Math.max(...data.byUniversity.map((x) => x.count), 1);
              return (
                <div key={u.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{u.name}</span>
                    <span className="text-slate-500">{u.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(u.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
          <p className="text-sm text-slate-500">Latest updates across all students</p>
          <ul className="mt-4 space-y-4">
            {data.recentActivities.map((act) => (
              <li key={act.id} className="flex gap-3">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    act.type === 'status_change' ? 'bg-blue-500' : act.type === 'note' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">
                    <Link to={`/students?focus=${act.student_id}`} className="font-medium text-blue-600 hover:underline">
                      {act.student_name}
                    </Link>{' '}
                    — {act.content}
                  </p>
                  <p className="text-xs text-slate-400">
                    {act.user_name ?? 'System'} · {timeAgo(act.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Pipeline Overview</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {data.byStatus.map((s) => (
            <Link
              key={s.id}
              to={`/students?status=${s.id}`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-blue-300 hover:shadow-sm"
            >
              <StatusBadge name={s.name} color={s.color} />
              <span className="text-sm font-semibold text-slate-700">{s.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
