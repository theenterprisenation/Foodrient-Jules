import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Search, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Upload,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface PepsTransaction {
  id: string;
  user_id: string;
  points: number;
  transaction_type: 'earned' | 'spent' | 'expired';
  source: string;
  reference_id: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
}

interface UserPepsBalance {
  id: string;
  full_name: string;
  email: string;
  points_balance: number;
}

const ChiefPeps = () => {
  const [transactions, setTransactions] = useState<PepsTransaction[]>([]);
  const [topUsers, setTopUsers] = useState<UserPepsBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('all');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferData, setTransferData] = useState({
    fromUserId: '',
    toUserId: '',
    amount: 0,
    reason: ''
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [users, setUsers] = useState<{id: string; full_name: string; email: string}[]>([]);
  const [metrics, setMetrics] = useState({
    totalPeps: 0,
    activePeps: 0,
    redeemedPeps: 0,
    expiredPeps: 0
  });

  useEffect(() => {
    fetchPepsData();
    fetchUsers();
  }, []);

  const fetchPepsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch transactions with user info
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('affiliate_points')
        .select(`
          *,
          user:profiles(full_name, email:auth.users!profiles_id_fkey(email))
        `)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (transactionsError) throw transactionsError;
      
      // Process transactions
      const processedTransactions = transactionsData.map(transaction => ({
        id: transaction.id,
        user_id: transaction.user_id,
        points: transaction.points,
        transaction_type: transaction.transaction_type,
        source: transaction.source,
        reference_id: transaction.reference_id,
        created_at: transaction.created_at,
        user_name: transaction.user?.full_name || 'Unknown User',
        user_email: transaction.user?.email?.[0]?.email || 'N/A'
      }));
      
      setTransactions(processedTransactions);
      
      // Fetch top users by PEPS balance
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email:auth.users!profiles_id_fkey(email),
          points_balance
        `)
        .order('points_balance', { ascending: false })
        .limit(10);
        
      if (usersError) throw usersError;
      
      // Process users data
      const processedUsers = usersData.map(user => ({
        id: user.id,
        full_name: user.full_name || 'Unknown User',
        email: user.email?.[0]?.email || 'N/A',
        points_balance: user.points_balance || 0
      }));
      
      setTopUsers(processedUsers);
      
      // Calculate metrics
      const totalPeps = processedUsers.reduce((sum, user) => sum + user.points_balance, 0);
      const earnedPeps = transactionsData
        .filter(t => t.transaction_type === 'earned')
        .reduce((sum, t) => sum + t.points, 0);
      const spentPeps = transactionsData
        .filter(t => t.transaction_type === 'spent')
        .reduce((sum, t) => sum + Math.abs(t.points), 0);
      const expiredPeps = transactionsData
        .filter(t => t.transaction_type === 'expired')
        .reduce((sum, t) => sum + Math.abs(t.points), 0);
      
      setMetrics({
        totalPeps,
        activePeps: totalPeps,
        redeemedPeps: spentPeps,
        expiredPeps
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
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email:auth.users!profiles_id_fkey(email)
        `)
        .order('full_name');
        
      if (error) throw error;
      
      const processedUsers = data.map(user => ({
        id: user.id,
        full_name: user.full_name || 'Unknown User',
        email: user.email?.[0]?.email || 'N/A'
      }));
      
      setUsers(processedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const handleTransferPeps = () => {
    setTransferData({
      fromUserId: '',
      toUserId: '',
      amount: 0,
      reason: ''
    });
    setIsTransferring(true);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { fromUserId, toUserId, amount, reason } = transferData;
    
    if (!fromUserId || !toUserId || amount <= 0) {
      setError('Please fill all required fields with valid values');
      return;
    }
    
    if (fromUserId === toUserId) {
      setError('Sender and recipient cannot be the same user');
      return;
    }
    
    try {
      // Start a transaction
      const { data: fromUser, error: fromUserError } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('id', fromUserId)
        .single();
        
      if (fromUserError) throw fromUserError;
      
      if (fromUser.points_balance < amount) {
        throw new Error('Insufficient PEPS balance for transfer');
      }
      
      // Deduct from sender
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ points_balance: fromUser.points_balance - amount })
        .eq('id', fromUserId);
        
      if (deductError) throw deductError;
      
      // Add to recipient
      const { data: toUser, error: toUserError } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('id', toUserId)
        .single();
        
      if (toUserError) throw toUserError;
      
      const { error: addError } = await supabase
        .from('profiles')
        .update({ points_balance: toUser.points_balance + amount })
        .eq('id', toUserId);
        
      if (addError) throw addError;
      
      // Record transaction for sender
      const { error: senderTransactionError } = await supabase
        .from('affiliate_points')
        .insert([{
          user_id: fromUserId,
          points: -amount,
          transaction_type: 'spent',
          source: 'admin_transfer',
          reference_id: toUserId
        }]);
        
      if (senderTransactionError) throw senderTransactionError;
      
      // Record transaction for recipient
      const { error: recipientTransactionError } = await supabase
        .from('affiliate_points')
        .insert([{
          user_id: toUserId,
          points: amount,
          transaction_type: 'earned',
          source: 'admin_transfer',
          reference_id: fromUserId
        }]);
        
      if (recipientTransactionError) throw recipientTransactionError;
      
      setSuccessMessage(`Successfully transferred ${amount} PEPS`);
      fetchPepsData();
      setIsTransferring(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error transferring PEPS:', error);
      setError(error.message);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.source.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = selectedTransactionType === 'all' || transaction.transaction_type === selectedTransactionType;
    
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">PEPS Management</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={handleTransferPeps}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
          >
            <Upload className="h-5 w-5 mr-2" />
            Transfer PEPS
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center text-green-800">
          <CheckCircle className="h-5 w-5 mr-2" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {/* PEPS Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <Wallet className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total PEPS</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.totalPeps.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active PEPS</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.activePeps.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Redeemed PEPS</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.redeemedPeps.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 mr-4">
              <Calendar className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Expired PEPS</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.expiredPeps.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
        <select
          value={selectedTransactionType}
          onChange={(e) => setSelectedTransactionType(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
        >
          <option value="all">All Transactions</option>
          <option value="earned">Earned</option>
          <option value="spent">Spent</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {transaction.user_name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{transaction.user_name}</div>
                          <div className="text-xs text-gray-500">{transaction.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.transaction_type === 'earned' ? 'bg-green-100 text-green-800' :
                        transaction.transaction_type === 'spent' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{transaction.source.replace('_', ' ')}</div>
                      {transaction.reference_id && (
                        <div className="text-xs text-gray-500">Ref: {transaction.reference_id.substring(0, 8)}...</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(transaction.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-sm font-medium ${
                        transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.points > 0 ? '+' : ''}{transaction.points}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Users */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Top PEPS Holders</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PEPS Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{index + 1}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {user.full_name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-yellow-600">{user.points_balance.toLocaleString()}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {isTransferring && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Transfer PEPS
            </h3>
            <form onSubmit={handleSubmitTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">From User</label>
                <select
                  value={transferData.fromUserId}
                  onChange={(e) => setTransferData({ ...transferData, fromUserId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                >
                  <option value="">Select sender</option>
                  {users.map(user => (
                    <option key={`from-${user.id}`} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-yellow-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">To User</label>
                <select
                  value={transferData.toUserId}
                  onChange={(e) => setTransferData({ ...transferData, toUserId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                >
                  <option value="">Select recipient</option>
                  {users.map(user => (
                    <option key={`to-${user.id}`} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  min="1"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  placeholder="Reason for transfer"
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
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Transfer PEPS
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