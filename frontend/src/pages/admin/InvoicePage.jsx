import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Printer, Building2 } from 'lucide-react';
import { tenantApi } from '../../api/client';
import { useQuery as uQ } from '@tanstack/react-query';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';

function InvoicePrint({ data }) {
  if (!data) return null;
  const { tenant_name, period, billing, calls, orders } = data;

  return (
    <div id="invoice-print" className="bg-white rounded-2xl border border-gray-200 p-8 max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
          <p className="text-gray-500 text-sm mt-1">{period.month}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">AI Receptionist</p>
          <p className="text-sm text-gray-500">hassanvirsaini5@gmail.com</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-gray-700">Billed To</p>
        <p className="font-semibold text-gray-900 mt-1">{tenant_name}</p>
        <p className="text-sm text-gray-500">{period.start} — {period.end}</p>
      </div>

      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 text-gray-600 font-medium">Description</th>
            <th className="text-right py-2 text-gray-600 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          <tr>
            <td className="py-3">
              <p className="font-medium text-gray-900">Monthly Plan</p>
              <p className="text-xs text-gray-500">Includes {billing.included_minutes} minutes of calls</p>
            </td>
            <td className="py-3 text-right font-medium">${billing.plan_monthly_fee.toFixed(2)}</td>
          </tr>
          {billing.overage_minutes > 0 && (
            <tr>
              <td className="py-3">
                <p className="font-medium text-gray-900">Overage Charges</p>
                <p className="text-xs text-gray-500">
                  {billing.overage_minutes.toFixed(1)} extra minutes × ${billing.overage_rate_per_minute}/min
                </p>
              </td>
              <td className="py-3 text-right font-medium text-red-600">${billing.overage_charge.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200">
            <td className="py-3 font-bold text-gray-900">Total Due</td>
            <td className="py-3 text-right font-bold text-xl text-brand-600">${billing.total_due.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">{calls.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Calls</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{billing.total_minutes_used.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Minutes Used</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{orders.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Orders Placed</p>
        </div>
      </div>

      {calls.language_breakdown?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Language Breakdown</p>
          <div className="flex gap-3">
            {calls.language_breakdown.map(lb => (
              <div key={lb.language} className="bg-gray-100 px-3 py-1.5 rounded-lg text-center">
                <p className="text-sm font-bold text-gray-900">{lb.count}</p>
                <p className="text-xs text-gray-500">{lb.language?.toUpperCase()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
        <p>AI Receptionist Platform · Invoice generated {new Date().toLocaleDateString()}</p>
        <p className="mt-1">For billing questions contact hassanvirsaini5@gmail.com</p>
      </div>
    </div>
  );
}

function monthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    opts.push({ val, label });
  }
  return opts;
}

export default function InvoicePage() {
  const [params] = useSearchParams();
  const [tenantId, setTenantId] = useState(params.get('tenant') || '');
  const [month, setMonth] = useState(monthOptions()[0].val);

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantApi.list().then(r => r.data.tenants),
  });
  const tenants = tenantsData || [];

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', tenantId, month],
    queryFn: () => tenantApi.getInvoice(tenantId, month).then(r => r.data),
    enabled: !!tenantId,
  });

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and download billing invoices</p>
        </div>
        {invoice && (
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print / Download
          </Button>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Restaurant"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            <option value="">— Select a restaurant —</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select label="Billing Month" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions().map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </Select>
        </div>
      </Card>

      {isLoading && tenantId && (
        <div className="text-center py-12 text-gray-400 text-sm">Loading invoice...</div>
      )}

      {!tenantId && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Select a restaurant to generate an invoice</p>
        </div>
      )}

      {invoice && <InvoicePrint data={invoice} />}

      <style>{`
        @media print {
          body > * { display: none !important; }
          #invoice-print { display: block !important; }
        }
      `}</style>
    </div>
  );
}
