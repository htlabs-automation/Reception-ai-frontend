import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../store/authStore';
import { tenantApi } from '../../api/client';
import { Plus, Pencil, Trash2, Tag, Clock, Calendar, Percent, DollarSign, ArrowLeft } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Select, Textarea } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

function DealForm({ initial = {}, items = [], onSubmit, loading }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    discount_type: initial.discount_type || 'percent',
    discount_value: initial.discount_value || '',
    is_active: initial.is_active !== undefined ? initial.is_active : true,
    is_all_day: initial.is_all_day !== undefined ? initial.is_all_day : true,
    start_time: initial.start_time || '',
    end_time: initial.end_time || '',
    valid_from: initial.valid_from || '',
    valid_until: initial.valid_until || '',
    menu_items: initial.menu_items || [],
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleItem = (id) => {
    const ids = form.menu_items.includes(id)
      ? form.menu_items.filter(x => x !== id)
      : [...form.menu_items, id];
    setForm({ ...form, menu_items: ids });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Input label="Deal Name *" value={form.name} onChange={set('name')} required placeholder="e.g. Happy Hour" />
      <Textarea label="Description (shown to AI)" value={form.description} onChange={set('description')} rows={2} placeholder="e.g. 20% off all starters 4-7pm" />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Discount Type" value={form.discount_type} onChange={set('discount_type')}>
          <option value="percent">Percentage Off (%)</option>
          <option value="fixed">Fixed Price Override ($)</option>
        </Select>
        <Input
          label={form.discount_type === 'percent' ? 'Percentage (0-100)' : 'Fixed Price ($)'}
          type="number" step="0.01" min="0"
          value={form.discount_value}
          onChange={set('discount_value')}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Status" value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <Select label="Schedule" value={form.is_all_day ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_all_day: e.target.value === 'true' })}>
          <option value="true">All Day</option>
          <option value="false">Time Window</option>
        </Select>
      </div>
      {!form.is_all_day && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Time" type="time" value={form.start_time} onChange={set('start_time')} />
          <Input label="End Time" type="time" value={form.end_time} onChange={set('end_time')} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Valid From (optional)" type="date" value={form.valid_from} onChange={set('valid_from')} />
        <Input label="Valid Until (optional)" type="date" value={form.valid_until} onChange={set('valid_until')} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Apply To Items <span className="text-gray-400 font-normal">(leave empty = all items)</span>
        </label>
        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {items.map(item => (
            <label key={item.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.menu_items.includes(item.id)}
                onChange={() => toggleItem(item.id)}
                className="accent-brand-600"
              />
              <span className="text-sm text-gray-700">{item.name}</span>
              <span className="text-xs text-gray-400 ml-auto">${Number(item.price).toFixed(2)}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>{initial.id ? 'Save Changes' : 'Create Deal'}</Button>
      </div>
    </form>
  );
}

export default function DealsPage() {
  const { tenantId: paramId } = useParams();
  const { user } = useAuth();
  const tenantId = Number(paramId ?? user?.tenant_id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);

  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['deals', tenantId],
    queryFn: () => tenantApi.getDeals(tenantId).then(r => r.data.deals),
  });
  const { data: itemsData } = useQuery({
    queryKey: ['items', tenantId],
    queryFn: () => tenantApi.getItems(tenantId).then(r => r.data.items),
  });

  const deals = dealsData || [];
  const items = itemsData || [];

  const createMut = useMutation({
    mutationFn: (d) => tenantApi.createDeal(tenantId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals', tenantId] }); setModal(null); toast.success('Deal created!'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => tenantApi.updateDeal(tenantId, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals', tenantId] }); setModal(null); toast.success('Deal updated!'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => tenantApi.deleteDeal(tenantId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals', tenantId] }); toast.success('Deal deleted'); },
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/tenant/${tenantId}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Special Deals</h1>
            <p className="text-xs text-gray-500">Active deals are read by the AI during calls</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
          <Plus className="h-4 w-4" /> New Deal
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16">
          <Tag className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No deals yet. Create one to let the AI mention promotions during calls.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {deals.map(deal => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{deal.name}</p>
                    <Badge color={deal.is_active ? 'green' : 'gray'}>{deal.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">{deal.description}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ mode: 'edit', deal })} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <Pencil className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${deal.name}"?`)) deleteMut.mutate(deal.id); }} className="p-1.5 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-1 rounded-lg">
                  {deal.discount_type === 'percent'
                    ? <><Percent className="h-3 w-3" />{deal.discount_value}% off</>
                    : <><DollarSign className="h-3 w-3" />${deal.discount_value} price</>
                  }
                </span>
                {!deal.is_all_day && deal.start_time && (
                  <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                    <Clock className="h-3 w-3" />{deal.start_time}–{deal.end_time}
                  </span>
                )}
                {deal.valid_until && (
                  <span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg">
                    <Calendar className="h-3 w-3" />Until {deal.valid_until}
                  </span>
                )}
                {deal.menu_item_names?.length > 0 && (
                  <span className="text-gray-400">On: {deal.menu_item_names.slice(0, 2).join(', ')}{deal.menu_item_names.length > 2 ? ` +${deal.menu_item_names.length - 2}` : ''}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Deal' : 'Create Special Deal'} size="lg">
        {modal && (
          <DealForm
            key={modal.deal?.id || 'new'}
            initial={modal.deal || {}}
            items={items}
            onSubmit={(form) => {
              if (modal.mode === 'edit') updateMut.mutate({ id: modal.deal.id, data: form });
              else createMut.mutate(form);
            }}
            loading={createMut.isPending || updateMut.isPending}
          />
        )}
      </Modal>
    </div>
  );
}
