import React, { useState, useEffect, useCallback } from 'react';
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
import { useUnmountAwareSubscription } from '../../utils/subscriptionRegistry';

interface PepsTransaction {
  id: string;
  created_at: string;
  transaction_type: string;
  points: number;
  source: string;
  reference_id?: string;
  user_id: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  points_balance: number;
}

const ChiefPeps = () => {
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
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({
    recipientEmail: '',
    amount: 0,
    note: ''
  });
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Default admin profile with high balance
  const adminProfile = {
    id: 'admin-account',
    full_name: 'Admin User',
   points_balance: 1000000
  }; 

  const fetchData = useCallback(() => {
    const fetchAll = async () => {
      await Promise.all([
        fetchPepsData(),
        fetchUsers()
      ]);
    };
    
    fetchAll();
  }, [dateRange]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchPepsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all transactions without user filter
      const { data, error } = await supabase
        .from('affiliate_points')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setTransactions(data || []);
      
      // Calculate metrics from all transactions
      const earned = data?.filter(t => t.transaction_type === 'earned')
        .reduce((sum, t) => sum + t.points, 0) || 0;
      const spent = data?.filter(t => t.transaction_type === 'spent')
        .reduce((sum, t) => sum + Math.abs(t.points), 0) || 0;
      const expired = data?.filter(t => t.transaction_type === 'expired')
        .reduce((sum, t) => sum + Math.abs(t.points), 0) || 0;
      
      setMetrics({
        totalPeps: adminProfile.points_balance,
        earnedPeps: earned,
        spentPeps: spent,
        expiredPeps: expired
      });
    } catch (error: any) {
      console.error('Error fetching PEPS data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, points_balance, email');
        
      if (error) throw error;
      
      const usersWithEmails = data?.map(profile => ({
        id: profile.id,
        full_name: profile.full_name || 'Unknown User',
        email: profile.email || 'N/A',
        points_balance: profile.points_balance || 0
      })) || [];
      
      setUsers(usersWithEmails);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError('Failed to load user data.');
    }
  };

  const handleExportTransactions = () => {
    try {
      const headers = ['Date', 'Type', 'Points', 'Source', 'Reference', 'User ID'];
      const csvContent = [
        headers.join(','),
        ...transactions.map(transaction => [
          new Date(transaction.created_at).toISOString().split('T')[0],
          transaction.transaction_type,
          transaction.points,
          transaction.source,
          transaction.reference_id || '',
          transaction.user_id
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `peps-transactions-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setSuccessMessage('Transactions exported successfully');
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      setError('Failed to export transactions: ' + error.message);
    }
  };

  const handleTransferPeps = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSending(true);
    setError(null);
    
    try {
      const recipient = users.find(u => u.email === transferData.recipientEmail);
      if (!recipient) {
        throw new Error('Recipient not found. Please check the email address.');
      }
      
      if (transferData.amount <= 0) {
        throw new Error('Please enter a valid amount greater than 0.');
      }
      
      if (transferData.amount > adminProfile.points_balance) {
        throw new Error('Insufficient PEPS balance for this transfer.');
      }
      
      // Update recipient's balance
      const { error: addError } = await supabase
        .from('profiles')
        .update({ points_balance: recipient.points_balance + transferData.amount })
        .eq('id', recipient.id);
        
      if (addError) throw addError;
      
      // Create transaction record for recipient
      const { error: recipientTransactionError } = await supabase
        .from('affiliate_points')
        .insert([{
          user_id: recipient.id,
          points: transferData.amount,
          transaction_type: 'earned',
          source: 'transfer_in',
          reference_id: adminProfile.id
        }]);
        
      if (recipientTransactionError) throw recipientTransactionError;
      
      setSuccessMessage(`Successfully transferred ${transferData.amount} PEPS to ${recipient.full_name}`);
      setTransferData({
        recipientEmail: '',
        amount: 0,
        note: ''
      });
      setIsTransferring(false);
      fetchPepsData();
      fetchUsers();
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error transferring PEPS:', error);
      setError(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.reference_id && transaction.reference_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      transaction.user_id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = selectedTransactionType === 'all' || transaction.transaction_type === selectedTransactionType;
    
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">PEPS Management Dashboard</h1>
        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        )}
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

      <div className="bg-white rounded-lg shadow p-6 mb-8">
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
              onChange={(e) => setDateRange(e.target.value as any)}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleExportTransactions}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
            <button
              onClick={() => setIsTransferring(true)}
              className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Transfer PEPS
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center text-green-800">
            <CheckCircle className="h-5 w-5 mr-2" />
            <p>{successMessage}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map(transaction => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.created_at)}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {transaction.source.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.reference_id || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.user_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={transaction.transaction_type === 'earned' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.transaction_type === 'earned' ? '+' : '-'}{Math.abs(transaction.points)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">User PEPS Balances</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PEPS Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-gray-900">{user.points_balance}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isTransferring && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Transfer PEPS
            </h3>
            <form onSubmit={handleTransferPeps} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Recipient Email</label>
                <input
                  type="email"
                  value={transferData.recipientEmail}
                  onChange={(e) => setTransferData({ ...transferData, recipientEmail: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  min="1"
                  max={adminProfile.points_balance}
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Available balance: {adminProfile.points_balance} PEPS
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Note (Optional)</label>
                <textarea
                  value={transferData.note}
                  onChange={(e) => setTransferData({ ...transferData, note: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  placeholder="Add a note for the recipient"
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTransferring(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || !transferData.recipientEmail || transferData.amount <= 0 || transferData.amount > adminProfile.points_balance}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-5 w-5 mr-2" />
                      Transfer PEPS
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiefPeps;