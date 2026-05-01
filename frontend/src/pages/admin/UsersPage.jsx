import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Pencil, Trash2, ShieldCheck, User } from 'lucide-react';
import { adminApi, tenantApi } from '../../api/client';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

function UserForm({ initial = {}, tenants = [], onSubmit, loading, isEdit }) {
  const [form, setForm] = useState({
    username: initial.username || '',
    password: '',
    email: initial.email || '',
    first_name: initial.first_name || '',
    last_name: initial.last_name || '',
    role: initial.role || 'tenant_staff',
    tenant_id: initial.tenant_id || '',
    is_active: initial.is_active !== undefined ? initial.is_active : true,
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" value={form.first_name} onChange={set('first_name')} placeholder="Hassan" />
        <Input label="Last Name" value={form.last_name} onChange={set('last_name')} placeholder="Singh" />
      </div>
      <Input label={`Username ${isEdit ? '' : '*'}`} value={form.username} onChange={set('username')} required={!isEdit} disabled={isEdit} />
      <Input label={`Password ${isEdit ? '(leave blank to keep)' : '*'}`} type="password" value={form.password} onChange={set('password')} required={!isEdit} />
      <Input label="Email" type="email" value={form.email} onChange={set('email')} />
      <Select label="Role" value={form.role} onChange={set('role')}>
        <option value="tenant_staff">Tenant Staff</option>
        <option value="superadmin">Super Admin</option>
      </Select>
      <Select label="Assigned Restaurant" value={form.tenant_id} onChange={set('tenant_id')}>
        <option value="">— None (Super Admin) —</option>
        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      {isEdit && (
        <Select label="Status" value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
          <option value="true">Active</option>
          <option value="false">Disabled</option>
        </Select>
      )}
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create User'}</Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', user?: {} }

  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => adminApi.getUsers().then(r => r.data.users) });
  const { data: tenantsData } = useQuery({ queryKey: ['tenants'], queryFn: () => tenantApi.list().then(r => r.data.tenants) });

  const users = usersData || [];
  const tenants = tenantsData || [];

  const createMut = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModal(null); toast.success('User created!'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModal(null); toast.success('User updated!'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const deleteMut = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deleted'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const handleDelete = (user) => {
    if (!confirm(`Delete user "${user.username}"?`)) return;
    deleteMut.mutate(user.id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage dashboard access</p>
        </div>
        <Button onClick={() => setModal({ mode: 'create' })}>
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <Card padding={false}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['User', 'Role', 'Restaurant', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                      {u.role === 'superadmin'
                        ? <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                        : <User className="h-3.5 w-3.5 text-brand-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.first_name ? `${u.first_name} ${u.last_name}` : u.username}</p>
                      <p className="text-xs text-gray-400">{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge color={u.role === 'superadmin' ? 'purple' : 'blue'}>
                    {u.role === 'superadmin' ? 'Super Admin' : 'Staff'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.tenant_name || '—'}</td>
                <td className="px-4 py-3">
                  <Badge color={u.is_active ? 'green' : 'red'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({ mode: 'edit', user: u })} className="p-1.5 hover:bg-gray-100 rounded-lg"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                    <button onClick={() => handleDelete(u)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit User' : 'Create User'}
      >
        {modal && (
          <UserForm
            key={modal.user?.id || 'new'}
            initial={modal.user || {}}
            tenants={tenants}
            isEdit={modal.mode === 'edit'}
            onSubmit={(form) => {
              if (modal.mode === 'edit') {
                const payload = { ...form };
                if (!payload.password) delete payload.password;
                updateMut.mutate({ id: modal.user.id, data: payload });
              } else {
                createMut.mutate(form);
              }
            }}
            loading={createMut.isPending || updateMut.isPending}
          />
        )}
      </Modal>
    </div>
  );
}
