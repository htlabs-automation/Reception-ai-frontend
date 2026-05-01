import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../store/authStore';
import { tenantApi } from '../../api/client';
import {
  Plus, Pencil, Trash2, Upload, Percent,
  AlertTriangle, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Select, Textarea } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

function ItemForm({ initial = {}, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    category: initial.category || '',
    price: initial.price || '',
    is_available: initial.is_available !== undefined ? initial.is_available : true,
    popularity_score: initial.popularity_score || 0,
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Name *" value={form.name} onChange={set('name')} required />
        <Input label="Category" value={form.category} onChange={set('category')} placeholder="e.g. Mains" />
      </div>
      <Textarea label="Description" value={form.description} onChange={set('description')} rows={2} />
      <div className="grid grid-cols-3 gap-3">
        <Input label="Price ($) *" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} required />
        <Input label="Popularity Score" type="number" min="0" value={form.popularity_score} onChange={set('popularity_score')} />
        <Select label="Availability" value={form.is_available ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_available: e.target.value === 'true' })}>
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </Select>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" loading={loading}>{initial.id ? 'Save Changes' : 'Add Item'}</Button>
      </div>
    </form>
  );
}

function BulkPriceModal({ onSubmit, loading, onClose }) {
  const [value, setValue] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ mode: 'percent', value: Number(value) }); }} className="space-y-3">
      <Input
        label="Percentage change (e.g. 10 for +10%, -5 for -5%)"
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        placeholder="10"
      />
      <p className="text-xs text-gray-400">This updates all menu item prices at once.</p>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>Apply</Button>
      </div>
    </form>
  );
}

export default function MenuPage() {
  const { tenantId: paramId } = useParams();
  const { user } = useAuth();
  const tenantId = Number(paramId ?? user?.tenant_id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef();

  const [modal, setModal] = useState(null);
  const [bulkModal, setBulkModal] = useState(false);
  const [search, setSearch] = useState('');
  const [pdfState, setPdfState] = useState({ uploading: false, parsing: false, done: false, result: null });

  const { data: rawItems, isLoading } = useQuery({
    queryKey: ['items', tenantId],
    queryFn: () => tenantApi.getItems(tenantId).then(r => r.data.items),
  });

  const items = (rawItems || []).filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const createMut = useMutation({
    mutationFn: (d) => tenantApi.createItem(tenantId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items', tenantId] }); setModal(null); toast.success('Item added!'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => tenantApi.updateItem(tenantId, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items', tenantId] }); setModal(null); toast.success('Item updated!'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => tenantApi.deleteItem(tenantId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items', tenantId] }); toast.success('Item deleted'); },
  });
  const bulkMut = useMutation({
    mutationFn: (d) => tenantApi.bulkPriceUpdate(tenantId, d),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['items', tenantId] });
      setBulkModal(false);
      toast.success(`Updated ${r.data.updated} items`);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfState({ uploading: true, parsing: false, done: false, result: null });
    try {
      await tenantApi.uploadMenuPdf(tenantId, file);
      toast.success('PDF uploaded! Parsing with AI...');
      setPdfState({ uploading: false, parsing: true, done: false, result: null });
      const result = await tenantApi.parseMenuPdf(tenantId);
      qc.invalidateQueries({ queryKey: ['items', tenantId] });
      setPdfState({ uploading: false, parsing: false, done: true, result: result.data });
      toast.success(`Parsed ${result.data.total} items!`);
    } catch (err) {
      setPdfState({ uploading: false, parsing: false, done: false, result: null });
      toast.error(err.response?.data?.error || 'Upload/parse failed');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/tenant/${tenantId}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Menu</h1>
            <p className="text-xs text-gray-500">{rawItems?.length || 0} items</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setBulkModal(true)}>
            <Percent className="h-3.5 w-3.5" /> Bulk %
          </Button>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          <Button
            variant="secondary" size="sm"
            loading={pdfState.uploading || pdfState.parsing}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {pdfState.uploading ? 'Uploading...' : pdfState.parsing ? 'AI Parsing...' : 'Upload PDF'}
          </Button>
          <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
            <Plus className="h-3.5 w-3.5" /> Add Item
          </Button>
        </div>
      </div>

      {pdfState.done && pdfState.result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-800 text-sm">Menu parsed!</p>
            <p className="text-xs text-green-600">{pdfState.result.created} created · {pdfState.result.updated} updated · {pdfState.result.total} total</p>
          </div>
          <button onClick={() => setPdfState({ ...pdfState, done: false })} className="text-green-400 hover:text-green-600 text-xs">✕</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Search by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span className="text-xs text-gray-400">{items.length} results</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <Card padding={false}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Item', 'Category', 'Price', 'Stock', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const inv = item.inventory;
                const isLow = inv?.is_low_stock;
                const isOut = inv && !inv.in_stock;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 truncate max-w-xs">{item.description}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{item.category || '—'}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">${Number(item.price).toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {(isOut || isLow) && <AlertTriangle className={`h-3.5 w-3.5 ${isOut ? 'text-red-400' : 'text-yellow-400'}`} />}
                        <span className={`text-sm ${isOut ? 'text-red-600 font-medium' : isLow ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {inv?.quantity_available ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge color={item.is_available && !isOut ? 'green' : 'red'}>
                        {item.is_available && !isOut ? 'Available' : 'Unavailable'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal({ mode: 'edit', item })} className="p-1.5 hover:bg-gray-100 rounded-lg">
                          <Pencil className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteMut.mutate(item.id); }} className="p-1.5 hover:bg-red-50 rounded-lg">
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No items found. Add items or upload a PDF menu.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Item' : 'Add Menu Item'} size="md">
        {modal && (
          <ItemForm
            key={modal.item?.id || 'new'}
            initial={modal.item || {}}
            onSubmit={(form) => {
              if (modal.mode === 'edit') updateMut.mutate({ id: modal.item.id, data: form });
              else createMut.mutate(form);
            }}
            loading={createMut.isPending || updateMut.isPending}
          />
        )}
      </Modal>

      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Price Update" size="sm">
        <BulkPriceModal onSubmit={bulkMut.mutate} loading={bulkMut.isPending} onClose={() => setBulkModal(false)} />
      </Modal>
    </div>
  );
}
