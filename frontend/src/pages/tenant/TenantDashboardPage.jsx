import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Phone, ShoppingBag, Clock, TrendingUp, Activity } from 'lucide-react';
import { tenantApi, ordersApi } from '../../api/client';
import { useAuth } from '../../store/authStore';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function TenantDashboardPage({ overrideTenantId }) {
  const { tenantId: paramId } = useParams();
  const { user } = useAuth();
  const tenantId = overrideTenantId ?? Number(paramId ?? user?.tenant_id);

  const { data: analytics } = useQuery({
    queryKey: ['analytics', tenantId],
    queryFn: () => tenantApi.getAnalytics(tenantId, 30).then(r => r.data),
    enabled: !!tenantId,
    refetchInterval: 60_000,
  });

  const { data: kitchenData } = useQuery({
    queryKey: ['kitchen', tenantId],
    queryFn: () => ordersApi.getKitchenOrders(tenantId).then(r => r.data),
    enabled: !!tenantId,
    refetchInterval: 10_000,
  });

  const activeOrders = [
    ...(kitchenData?.orders?.confirmed || []),
    ...(kitchenData?.orders?.preparing || []),
    ...(kitchenData?.orders?.ready || []),
  ];

  const dailyCalls = analytics?.calls?.daily || [];
  const chartData = dailyCalls.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    calls: d.calls,
    minutes: (d.duration_seconds / 60).toFixed(1),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Last 30 days overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Calls" value={analytics?.calls?.total ?? '—'} icon={Phone} color="brand" />
        <StatCard
          label="Minutes Used"
          value={analytics ? (analytics.calls.total_duration_seconds / 60).toFixed(0) : '—'}
          icon={Clock}
          color="blue"
          sub="500 included in plan"
        />
        <StatCard label="Orders" value={analytics?.orders?.total ?? '—'} icon={ShoppingBag} color="green" />
        <StatCard
          label="Revenue"
          value={analytics ? `$${analytics.orders.total_revenue.toFixed(2)}` : '—'}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Daily Call Volume" subtitle="Last 30 days" />
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="calls" stroke="#f97316" fill="url(#callGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Active Orders"
            subtitle={`${activeOrders.length} order${activeOrders.length !== 1 ? 's' : ''} in kitchen`}
            action={<Activity className="h-4 w-4 text-brand-500 animate-pulse" />}
          />
          {activeOrders.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-gray-400 text-sm">No active orders</div>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {activeOrders.slice(0, 6).map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.customer_name}</p>
                    <p className="text-xs text-gray-400">{o.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">${o.total.toFixed(2)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {analytics?.calls?.recent?.length > 0 && (
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
              {analytics.calls.recent.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.caller_phone}</td>
                  <td className="px-4 py-3 text-gray-600">{(c.duration_seconds / 60).toFixed(1)}m</td>
                  <td className="px-4 py-3 text-gray-500 uppercase text-xs">{c.language}</td>
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
