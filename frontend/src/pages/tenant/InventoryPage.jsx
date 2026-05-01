import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../store/authStore';
import { tenantApi } from '../../api/client';
import { AlertTriangle, Clock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

function InlineQtyEditor({ item, tenantId, onSaved }) {
  const [qty, setQty] = useState(item.inventory?.quantity_available ?? 0);
  const [threshold, setThreshold] = useState(item.inventory?.low_stock_threshold ?? 5);
  const [dirty, setDirty] = useState(false);
  const mut = useMutation({
    mutationFn: () => tenantApi.updateItem(tenantId, item.id, {
      quantity_available: Number(qty),
      low_stock_threshold: Number(threshold),
    }),
    onSuccess: () => { onSaved(); toast.success(`${item.name} updated`); setDirty(false); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const handleChange = (setter) => (e) => { setter(e.target.value); setDirty(true); };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number" min="0"
        value={qty}
        onChange={handleChange(setQty)}
        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <span className="text-gray-300 text-xs">/</span>
      <input
        type="number" min="0"
        value={threshold}
        onChange={handleChange(setThreshold)}
        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
        title="Low stock alert threshold"
      />
      {dirty && (
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="p-1 hover:bg-green-50 rounded text-green-500 hover:text-green-700 transition-colors"
          title="Save"
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const { tenantId: paramId } = useParams();
  const { user } = useAuth();
  const tenantId = Number(paramId ?? user?.tenant_id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [prepMinutes, setPrepMinutes] = useState('');
  const [prepDirty, setPrepDirty] = useState(false);
  const [filter, setFilter] = useState('all');

  const { data: rawItems, isLoading } = useQuery({
    queryKey: ['items', tenantId],
    queryFn: () => tenantApi.getItems(tenantId).then(r => r.data.items),
  });

  const { data: tenantData } = useQuery({
    queryKey: ['tenant-detail', tenantId],
    queryFn: () => tenantApi.getTenant(tenantId).then(r => r.data),
    enabled: !!tenantId,
  });

  const currentPrep = tenantData?.avg_prep_minutes ?? 15;

  const prepMut = useMutation({
    mutationFn: (mins) => tenantApi.updateTenant(tenantId, { avg_prep_minutes: mins }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-detail', tenantId] });
      toast.success('Prep time updated');
      setPrepDirty(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update prep time'),
  });

  const items = (rawItems || []).filter(item => {
    const inv = item.inventory;
    if (filter === 'low') return inv?.is_low_stock && inv?.in_stock;
    if (filter === 'out') return inv && !inv.in_stock;
    return true;
  });

  const lowCount = (rawItems || []).filter(i => i.inventory?.is_low_stock && i.inventory?.in_stock).length;
  const outCount = (rawItems || []).filter(i => i.inventory && !i.inventory.in_stock).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/tenant/${tenantId}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
            <p className="text-xs text-gray-500">
              {outCount > 0 && <span className="text-red-500 font-medium">{outCount} out of stock · </span>}
              {lowCount > 0 && <span className="text-yellow-600 font-medium">{lowCount} low stock · </span>}
              {rawItems?.length || 0} total items
            </p>
          </div>
        </div>

        {/* Avg prep time inline editor */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-600 whitespace-nowrap">Avg prep time</span>
          <input
            type="number" min="1" max="120"
            value={prepDirty ? prepMinutes : currentPrep}
            onChange={(e) => { setPrepMinutes(e.target.value); setPrepDirty(true); }}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-400">min</span>
          {prepDirty && (
            <Button size="sm" loading={prepMut.isPending} onClick={() => prepMut.mutate(Number(prepMinutes))}>
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: `All (${rawItems?.length || 0})` },
          { key: 'low', label: `Low Stock (${lowCount})`, color: 'text-yellow-600' },
          { key: 'out', label: `Out of Stock (${outCount})`, color: 'text-red-600' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key ? 'bg-brand-600 text-white' : `bg-white border border-gray-200 ${tab.color || 'text-gray-600'} hover:bg-gray-50`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <Card padding={false}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Qty / Alert Threshold
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const inv = item.inventory;
                const isOut = inv && !inv.in_stock;
                const isLow = inv?.is_low_stock && inv?.in_stock;
                return (
                  <tr key={item.id} className={`transition-colors ${isOut ? 'bg-red-50/40 hover:bg-red-50' : isLow ? 'bg-yellow-50/40 hover:bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {isOut && <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />}
                        <p className="font-medium text-gray-900">{item.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{item.category || '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={isOut ? 'red' : isLow ? 'yellow' : 'green'}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <InlineQtyEditor
                        item={item}
                        tenantId={tenantId}
                        onSaved={() => qc.invalidateQueries({ queryKey: ['items', tenantId] })}
                      />
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">No items to show.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
