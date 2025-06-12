import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Order {
  id: string;
  created_at: string;
  total: number;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  items: number;
}

export const useRecentOrders = (limit = 3) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setOrders([]);
          return;
        }

        const { data, error: queryError } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            total,
            status,
            order_items(count)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (queryError) {
          throw queryError;
        }

        const formattedOrders = data?.map(order => ({
          id: order.id.split('-')[0],
          created_at: order.created_at,
          total: order.total,
          status: order.status,
          items: (order.order_items as unknown as { count: number }[])[0]?.count || 0
        })) || [];

        setOrders(formattedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentOrders();
  }, [limit]);

  return { orders, loading, error };
};