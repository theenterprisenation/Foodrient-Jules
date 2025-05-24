// src/pages/coordinator/CoordinatorPeps.tsx
import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Search, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Filter,
  ChevronDown,
  User,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface PepsTransaction {
  id: string;
  points: number;
  transaction_type: 'earned' | 'spent' | 'expired';
  source: string;
  reference_id: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  points_balance: number;
}

const CoordinatorPeps = () => {
  const [transactions, setTransactions] = useState<PepsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    totalPeps: 0,
    earnedPeps: 0,
    spentPeps: 0,
    expiredPeps: 0
  });
  const [userProfile, setUserProfile] = useState<{
    id: string;
    full_name: string | null;
    points_balance: number;
  } | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({
    recipientEmail: '',
    amount: 0,
    note: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    fetchPepsData();
    fetchUsers();
  }, [dateRange]);

  const fetchPepsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, points_balance')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      setUserProfile(profile);

      // Determine date range
      let daysToSubtract = 30;
      if (dateRange === 'week') daysToSubtract = 7;
      if (dateRange === 'year') daysToSubtract = 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToSubtract);

      // Fetch transactions
      const { data, error } = await supabase
        .from('affiliate_points')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);

      // Calculate metrics
      const earned = data?.filter(t => t.transaction_type === 'earned')
        .reduce((sum, t) => sum + t.points, 0) || 0;
      const spent = data?.filter(t => t.transaction_type === 'spent')
        .reduce((sum, t) => sum + Math.abs(t.points), 0) || 0;
      const expired = data?.filter(t => t.transaction_type === 'expired')
        .reduce((sum, t) => sum + Math.abs(t.points), 0) || 0;

      setMetrics({
        totalPeps: profile?.points_balance || 0,
        earnedPeps: earned,
        spentPeps: spent,
        expiredPeps: expired
      });
    } catch (error: any) {
      console.error('Error fetching PEPS data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch profiles data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, points_balance');

      if (profilesError) throw profilesError;

      // Fetch auth users using Supabase Admin API
      const { data: { users: authUsers }, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) throw usersError;

      // Create maps for quick lookup
      const profileMap = new Map(
        profiles?.map(p => [p.id, { full_name: p.full_name, points_balance: p.points_balance }]) || []
      );
      const emailMap = new Map(authUsers?.map(u => [u.id, u.email]) || []);

      // Combine results by ID
      const combinedData = Array.from(new Set([...profileMap.keys(), ...emailMap.keys()])).map(id => ({
        id,
        full_name: profileMap.get(id)?.full_name || 'Unknown User',
        email: emailMap.get(id) || 'N/A',
        points_balance: profileMap.get(id)?.points_balance || 0
      }));

      setUsers(combinedData);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message || 'An unknown error occurred');
    }
  };

  const handleExportTransactions = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'Type', 'Points', 'Source', 'Reference'];
      const csvContent = [
        headers.join(','),
        ...transactions.map(transaction => [
          format(new Date(transaction.created_at), 'yyyy-MM-dd'),
          transaction.transaction_type,
          transaction.points,
          transaction.source,
          transaction.reference_id || ''
        ].join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `peps-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setSuccessMessage('Transactions exported successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error exporting transactions:', error);
      setError(error.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">PEPS Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Total PEPS</p>
                <p className="text-2xl font-bold">{metrics.totalPeps}</p>
              </div>
              <Wallet className="text-blue-500 h-8 w-8" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Earned</p>
                <p className="text-2xl font-bold text-green-600">{metrics.earnedPeps}</p>
              </div>
              <TrendingUp className="text-green-500 h-8 w-8" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Spent</p>
                <p className="text-2xl font-bold text-red-600">{metrics.spentPeps}</p>
              </div>
              <TrendingDown className="text-red-500 h-8 w-8" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Expired</p>
                <p className="text-2xl font-bold text-gray-600">{metrics.expiredPeps}</p>
              </div>
              <AlertTriangle className="text-yellow-500 h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search transactions..."
                className="pl-10 pr-4 py-2 border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
            </div>
            <select
              className="border rounded-lg px-4 py-2"
              value={selectedTransactionType}
              onChange={(e) => setSelectedTransactionType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="earned">Earned</option>
              <option value="spent">Spent</option>
              <option value="expired">Expired</option>
            </select>
            <select
              className="border rounded-lg px-4 py-2"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'year')}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <button
            onClick={handleExportTransactions}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${transaction.transaction_type === 'earned' ? 'bg-green-100 text-green-800' :
                          transaction.transaction_type === 'spent' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={transaction.transaction_type === 'earned' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.transaction_type === 'earned' ? '+' : '-'}{Math.abs(transaction.points)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{transaction.source}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{transaction.reference_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatorPeps;