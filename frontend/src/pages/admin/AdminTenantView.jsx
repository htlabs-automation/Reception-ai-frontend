import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';
import { tenantApi } from '../../api/client';
import Button from '../../components/ui/Button';
import TenantDashboardPage from '../tenant/TenantDashboardPage';

export default function AdminTenantView() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => tenantApi.list().then(r => r.data.tenants.find(t => t.id === Number(tenantId))),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-brand-600" />
          <span className="font-semibold text-gray-900">{tenant?.name || `Tenant #${tenantId}`}</span>
          <span className="text-gray-400 text-sm">— Admin View</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/tenant/${tenantId}/menu`)}>Menu</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/tenant/${tenantId}/kitchen`)}>Kitchen</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/tenant/${tenantId}/analytics`)}>Analytics</Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/invoices?tenant=${tenantId}`)}>Invoice</Button>
        </div>
      </div>
      <TenantDashboardPage overrideTenantId={Number(tenantId)} />
    </div>
  );
}
