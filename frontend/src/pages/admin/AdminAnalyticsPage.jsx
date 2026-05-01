import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Phone, ShoppingBag, Clock, DollarSign, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { adminApi } from '../../api/client';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';

const COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#f59e0b','#ec4899'];

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics', period],
    queryFn: () => adminApi.getAnalyticsOverview(period).then(r => r.data),
  });

  const tenants = data?.tenants || [];
  const totalCalls = tenants.reduce((s, t) => s + t.total_calls, 0);
  const totalMinutes = tenants.reduce((s, t) => s + t.total_duration_minutes, 0);
  const totalOrders = tenants.reduce((s, t) => s + t.total_orders, 0);
  const totalRevenue = tenants.reduce((s, t) => s + t.total_revenue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">All restaurants — usage & billing summary</p>
        </div>
        <Select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="w-36">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Calls" value={totalCalls} icon={Phone} color="brand" />
        <StatCard label="Total Minutes" value={totalMinutes.toFixed(0)} icon={Clock} color="blue" sub="across all restaurants" />
        <StatCard label="Total Orders" value={totalOrders} icon={ShoppingBag} color="green" />
        <StatCard label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} icon={DollarSign} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Calls by Restaurant" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tenants} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="tenant_name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total_calls" radius={[4, 4, 0, 0]}>
                {tenants.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Minutes Used by Restaurant" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tenants} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="tenant_name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v.toFixed(1)} min`]} />
              <Bar dataKey="total_duration_minutes" radius={[4, 4, 0, 0]}>
                {tenants.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card padding={false}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Restaurant Breakdown</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Restaurant', 'Calls', 'Minutes Used', 'Orders', 'Revenue', 'Invoice'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tenants.map(t => (
              <tr key={t.tenant_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{t.tenant_name}</td>
                <td className="px-4 py-3 text-gray-600">{t.total_calls}</td>
                <td className="px-4 py-3">
                  <span className={t.total_duration_minutes > 500 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                    {t.total_duration_minutes.toFixed(1)}
                  </span>
                  <span className="text-gray-400 text-xs"> / 500 incl.</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{t.total_orders}</td>
                <td className="px-4 py-3 text-gray-600">${t.total_revenue.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => navigate(`/admin/invoices?tenant=${t.tenant_id}`)}
                  >
                    <FileText className="h-3.5 w-3.5" /> View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
