import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { ordersApi, SSE_URL } from '../../api/client';
import { ChefHat, Clock, CheckCircle2, XCircle, Wifi, WifiOff, ArrowDown, ArrowLeft } from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const STATUS_COLUMNS = [
  { key: 'confirmed', label: 'New Orders', color: 'blue', next: 'preparing', nextLabel: 'Start Preparing' },
  { key: 'preparing', label: 'Preparing', color: 'yellow', next: 'ready', nextLabel: 'Mark Ready' },
  { key: 'ready', label: 'Ready for Pickup', color: 'green', next: 'completed', nextLabel: 'Complete' },
];

function OrderCard({ order, tenantId, onStatusUpdate }) {
  const [loading, setLoading] = useState(false);
  const col = STATUS_COLUMNS.find(c => c.key === order.status);
  const elapsed = order.created_at
    ? formatDistanceToNow(parseISO(order.created_at), { addSuffix: true })
    : '';

  const advance = async () => {
    if (!col?.next) return;
    setLoading(true);
    try {
      await ordersApi.updateStatus(order.id, tenantId, col.next);
      onStatusUpdate();
      toast.success(`Order #${order.id} → ${col.next}`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    if (!confirm(`Cancel order #${order.id}?`)) return;
    setLoading(true);
    try {
      await ordersApi.updateStatus(order.id, tenantId, 'cancelled');
      onStatusUpdate();
      toast.success(`Order #${order.id} cancelled`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Cancel failed');
    } finally {
      setLoading(false);
    }
  };

  const borderColors = { confirmed: 'border-blue-300', preparing: 'border-yellow-300', ready: 'border-green-300' };

  return (
    <div className={`bg-white rounded-xl border-2 ${borderColors[order.status] || 'border-gray-200'} p-4 shadow-sm animate-slide-up`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-gray-900 text-base">#{order.id}</p>
          <p className="text-sm text-gray-600 font-medium">{order.customer_name}</p>
          <p className="text-xs text-gray-400">{order.customer_phone}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900 text-lg">${order.total.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{elapsed}</p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-2 mb-3 space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-800">{item.name}</span>
            <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">×{item.quantity}</span>
          </div>
        ))}
      </div>

      {order.estimated_ready_at && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
          <Clock className="h-3 w-3" />
          Ready by {new Date(order.estimated_ready_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      <div className="flex gap-2">
        {col?.next && (
          <Button
            size="sm"
            loading={loading}
            className="flex-1 justify-center"
            onClick={advance}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {col.nextLabel}
          </Button>
        )}
        {order.status !== 'completed' && (
          <button
            onClick={cancel}
            disabled={loading}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
            title="Cancel order"
          >
            <XCircle className="h-4 w-4 text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function KitchenPage() {
  const { tenantId: paramId } = useParams();
  const { user } = useAuth();
  const tenantId = Number(paramId ?? user?.tenant_id);
  const navigate = useNavigate();

  const [orders, setOrders] = useState({ confirmed: [], preparing: [], ready: [] });
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const esRef = useRef(null);
  const colRefs = useRef({});

  const refreshOrders = useCallback(() => {
    ordersApi.getKitchenOrders(tenantId)
      .then(r => setOrders(r.data.orders || { confirmed: [], preparing: [], ready: [] }))
      .catch(() => {});
  }, [tenantId]);

  // SSE connection
  useEffect(() => {
    if (!tenantId) return;

    const connect = () => {
      const url = SSE_URL(tenantId);
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => setConnected(true);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.error) return;
          setOrders(data);
        } catch {}
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        // Fallback poll every 5s if SSE drops
        setTimeout(connect, 5000);
      };
    };

    connect();
    return () => { esRef.current?.close(); };
  }, [tenantId]);

  // Auto-scroll each column
  useEffect(() => {
    if (!autoScroll) return;
    const interval = setInterval(() => {
      Object.values(colRefs.current).forEach(el => {
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollTop + clientHeight < scrollHeight) {
          el.scrollBy({ top: 80, behavior: 'smooth' });
        } else {
          el.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [autoScroll]);

  const totalActive = (orders.confirmed?.length || 0) + (orders.preparing?.length || 0) + (orders.ready?.length || 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/tenant/${tenantId}`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <ChefHat className="h-5 w-5 text-brand-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kitchen View</h1>
            <p className="text-xs text-gray-500">{totalActive} active order{totalActive !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoScroll(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${autoScroll ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'}`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </button>
          <div className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ${connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? 'Live' : 'Reconnecting...'}
          </div>
          <Button variant="secondary" size="sm" onClick={refreshOrders}>Refresh</Button>
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-180px)]">
        {STATUS_COLUMNS.map(col => {
          const colOrders = orders[col.key] || [];
          const headerColors = {
            blue: 'bg-blue-600',
            yellow: 'bg-yellow-500',
            green: 'bg-green-600',
          };
          return (
            <div key={col.key} className="flex flex-col min-h-0">
              <div className={`${headerColors[col.color]} text-white rounded-t-xl px-4 py-3 flex items-center justify-between flex-shrink-0`}>
                <span className="font-semibold text-sm">{col.label}</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{colOrders.length}</span>
              </div>
              <div
                ref={el => colRefs.current[col.key] = el}
                className="flex-1 overflow-y-auto bg-gray-50 rounded-b-xl p-3 space-y-3 border border-t-0 border-gray-200"
              >
                {colOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                    <ChefHat className="h-10 w-10 mb-2" />
                    <p className="text-sm">No orders</p>
                  </div>
                ) : (
                  colOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      tenantId={tenantId}
                      onStatusUpdate={refreshOrders}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
