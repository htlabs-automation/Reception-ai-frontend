import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, ExternalLink, Clock, Phone } from 'lucide-react';
import { tenantApi } from '../../api/client';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';

function TenantForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    name: '', slug: '', phone_number: '', avg_prep_minutes: 15, timezone: 'UTC',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Input label="Restaurant Name *" value={form.name} onChange={set('name')} required placeholder="e.g. Spice Garden" />
      <Input label="Slug (auto-generated if empty)" value={form.slug} onChange={set('slug')} placeholder="e.g. spice-garden" />
      <Input label="Phone Number" value={form.phone_number} onChange={set('phone_number')} placeholder="+1..." />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Avg Prep (minutes)" type="number" min="1" value={form.avg_prep_minutes} onChange={set('avg_prep_minutes')} />
        <Input label="Timezone" value={form.timezone} onChange={set('timezone')} placeholder="UTC" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={loading}>Create Restaurant</Button>
      </div>
    </form>
  );
}

export default function TenantsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantApi.list().then(r => r.data.tenants),
  });

  const createMutation = useMutation({
    mutationFn: (form) => tenantApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      setModal(false);
      toast.success('Restaurant created!');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all tenant restaurants</p>
        </div>
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4" /> Add Restaurant
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data || []).map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/tenant/${t.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.slug}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/tenant/${t.id}`); }}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                  title="Open tenant dashboard"
                >
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <div className="space-y-1.5">
                {t.phone_number && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone className="h-3.5 w-3.5" /> {t.phone_number}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" /> Avg prep: {t.avg_prep_minutes}m · {t.timezone}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm" variant="secondary"
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/tenant/${t.id}`); }}
                >
                  Manage
                </Button>
                <Button
                  size="sm" variant="ghost"
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/invoices?tenant=${t.id}`); }}
                >
                  Invoice
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add New Restaurant">
        <TenantForm onSubmit={createMutation.mutate} loading={createMutation.isPending} />
      </Modal>
    </div>
  );
}
