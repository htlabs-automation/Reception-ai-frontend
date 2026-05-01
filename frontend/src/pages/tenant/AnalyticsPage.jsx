import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../store/authStore';
import { tenantApi } from '../../api/client';
import { Phone, Clock, ShoppingBag, DollarSign, ArrowLeft } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { format, parseISO } from 'date-fns';

const LANG_COLORS = { en: '#f97316', hi: '#3b82f6', pa: '#10b981' };
const LANG_LABELS = { en: 'English', hi: 'Hindi', pa: 'Punjabi' };

export default function AnalyticsPage() {
  const { tenantId: paramId } = useParams();
  const { user } = useAuth();
  const tenantId = Number(paramId ?? user?.tenant_id);
  const navigate = useNavigate();
  const [period, setPeriod] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', tenantId, period],
    queryFn: () => tenantApi.getAnalytics(tenantId, period).then(r => r.data),
    enabled: !!tenantId,
  });

  const dailyCalls = (data?.calls?.daily || []).map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    calls: d.calls,
    minutes: (d.duration_seconds / 60).toFixed(1),
  }));

  const dailyOrders = (data?.orders?.daily || []).map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    orders: d.orders,
    revenue: Number(d.revenue).toFixed(2),
  }));

  const langData = (data?.calls?.language_breakdown || []).map(l => ({
    name: LANG_LABELS[l.language] || l.language,
    value: l.count,
    color: LANG_COLORS[l.language] || '#6b7280',
  }));

  const totalMinutes = data ? (data.calls.total_duration_seconds / 60) : 0;
  const overageMinutes = Math.max(0, totalMinutes - 500);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/tenant/${tenantId}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
            <p className="text-xs text-gray-500">{data?.tenant_name}</p>
          </div>
        </div>
        <Select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="w-36">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Calls" value={data?.calls?.total ?? '—'} icon={Phone} color="brand" />
        <StatCard
          label="Minutes Used"
          value={totalMinutes.toFixed(0)}
          icon={Clock}
          color={overageMinutes > 0 ? 'brand' : 'blue'}
          sub={overageMinutes > 0 ? `${overageMinutes.toFixed(0)} min overage` : '500 min included'}
        />
        <StatCard label="Orders" value={data?.orders?.total ?? '—'} icon={ShoppingBag} color="green" />
        <StatCard
          label="Revenue"
          value={data ? `$${data.orders.total_revenue.toFixed(2)}` : '—'}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {overageMinutes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Usage Alert:</strong> You've used {totalMinutes.toFixed(0)} minutes this period.
          {overageMinutes.toFixed(1)} minutes over the 500-minute plan — approximately ${(overageMinutes * 1.5).toFixed(2)} in overage charges.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Daily Call Volume" subtitle={`Last ${period} days`} />
            {dailyCalls.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyCalls} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="calls" stroke="#f97316" fill="url(#cGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No call data yet</div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Language Breakdown" />
          {langData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={langData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {langData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {langData.map(l => (
                  <div key={l.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="text-gray-600">{l.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{l.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Daily Orders & Revenue" subtitle={`Last ${period} days`} />
        {dailyOrders.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyOrders} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#10b981" radius={[3, 3, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No order data yet</div>
        )}
      </Card>

      {data?.calls?.recent?.length > 0 && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Calls</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Caller', 'Duration', 'Language', 'Order', 'Time'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.calls.recent.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-800">{c.caller_phone}</td>
                  <td className="px-4 py-3 text-gray-600">{(c.duration_seconds / 60).toFixed(1)} min</td>
                  <td className="px-4 py-3">
                    <span className="uppercase text-xs font-medium px-2 py-0.5 rounded" style={{ background: LANG_COLORS[c.language] + '20', color: LANG_COLORS[c.language] }}>
                      {c.language}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.order_id ? `#${c.order_id}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{format(parseISO(c.started_at), 'MMM d, h:mm a')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
