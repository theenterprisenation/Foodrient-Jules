import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface CustomerStats {
  activeOrders: number;
  activeGroups: number;
  favorites: number;
  credits: number;
  savings: number;
  monthlySavings: number;
  totalSavings: number;
}

export const useCustomerStats = () => {
  const [stats, setStats] = useState<CustomerStats>({
    activeOrders: 0,
    activeGroups: 0,
    favorites: 0,
    credits: 0,
    savings: 0,
    monthlySavings: 0,
    totalSavings: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerStats = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return;
        }

        // Fetch all stats in parallel
        const [
          { count: activeOrders },
          { count: activeGroups },
          { count: favorites },
          { data: creditData },
          { data: savingsData }
        ] = await Promise.all([
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('status', ['Processing', 'Shipped']),
          
          supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          
          supabase
            .from('favorites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          
          supabase
            .from('user_credits')
            .select('amount')
            .eq('user_id', user.id)
            .single(),
          
          supabase
            .from('user_savings')
            .select('monthly_savings, total_savings')
            .eq('user_id', user.id)
            .single()
        ]);

        setStats({
          activeOrders: activeOrders || 0,
          activeGroups: activeGroups || 0,
          favorites: favorites || 0,
          credits: creditData?.amount || 0,
          savings: savingsData?.monthly_savings || 0,
          monthlySavings: savingsData?.monthly_savings || 0,
          totalSavings: savingsData?.total_savings || 0
        });
      } catch (err) {
        console.error('Error fetching customer stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch customer stats');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerStats();
  }, []);

  return { stats, loading, error };
};