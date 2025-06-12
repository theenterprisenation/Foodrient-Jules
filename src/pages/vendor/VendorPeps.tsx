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

const VendorPeps = () => {
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
  const [users, setUsers] = useState<{id: string; full_name: string; email: string; points_balance: number}[]>([]);

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
      if (!user) throw new Error();
      
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
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, points_balance, email')
        .order('full_name');
        
      if (profilesError) throw profilesError;
      
      // Filter out current user and format the data
      const { data: { user } } = await supabase.auth.getUser();
      const usersWithEmails = profiles
        ?.filter(profile => user ? profile.id !== user.id : true)
        .map(profile => ({
          id: profile.id,
          full_name: profile.full_name || 'Unknown User',
          email: profile.email || 'N/A',
          points_balance: profile.points_balance || 0
        })) || [];
      
      setUsers(usersWithEmails);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message);
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

  const handleTransferPeps = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      // Find recipient by email
      const recipient = users.find(u => u.email === transferData.recipientEmail);
      if (!recipient) {
        throw new Error('Recipient not found. Please check the email address.');
      }
      
      // Validate amount
      if (transferData.amount <= 0) {
        throw new Error('Please enter a valid amount greater than 0.');
      }
      
      if (transferData.amount > userProfile.points_balance) {
        throw new Error('Insufficient PEPS balance for this transfer.');
      }
      
      // Deduct from sender
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ points_balance: userProfile.points_balance - transferData.amount })
        .eq('id', userProfile.id);
        
      if (deductError) throw deductError;
      
      // Add to recipient
      const { error: addError } = await supabase
        .from('profiles')
        .update({ points_balance: recipient.points_balance + transferData.amount })
        .eq('id', recipient.id);
        
      if (addError) throw addError;
      
      // Record transaction for sender
      const { error: senderTransactionError } = await supabase
        .from('affiliate_points')
        .insert([{
          user_id: userProfile.id,
          points: -transferData.amount,
          transaction_type: 'spent',
          source: 'transfer_out',
          reference_id: recipient.id
        }]);
        
      if (senderTransactionError) throw senderTransactionError;
      
      // Record transaction for recipient
      const { error: recipientTransactionError } = await supabase
        .from('affiliate_points')
        .insert([{
          user_id: recipient.id,
          points: transferData.amount,
          transaction_type: 'earned',
          source: 'transfer_in',
          reference_id: userProfile.id
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
      
      // Clear success message after 3 seconds
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
      (transaction.reference_id && transaction.reference_id.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesType = selectedTransactionType === 'all' || transaction.transaction_type === selectedTransactionType;
    
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My PEPS</h1>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={handleExportTransactions}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          <button
            onClick={() => setIsTransferring(true)}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
          >
            <ArrowRight className="h-5 w-5 mr-2" />
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

      {/* PEPS Balance Card */}
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center mb-4">
          <Wallet className="h-8 w-8 mr-3" />
          <h2 className="text-xl font-bold">PEPS Balance</h2>
        </div>
        <div className="text-4xl font-bold mb-4">{metrics.totalPeps.toLocaleString()}</div>
        <div className="text-sm opacity-80">
          1 PEPS = ₦1 | Can be used for purchases on Foodrient
        </div>
        <div className="mt-6 flex items-center">
          <ArrowRight className="h-5 w-5 mr-2" />
          <span className="text-sm">Use your PEPS at checkout for discounts</span>
        </div>
      </div>

      {/* PEPS Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Earned PEPS</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.earnedPeps.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Spent PEPS</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.spentPeps.toLocaleString()}</p>
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
      <div className="mb-6 flex items-center space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        
        <div>
          <select
            value={selectedTransactionType}
            onChange={(e) => setSelectedTransactionType(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="all">All Types</option>
            <option value="earned">Earned</option>
            <option value="spent">Spent</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {transaction.source.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.reference_id ? transaction.reference_id.substring(0, 8) + '...' : 'N/A'}
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

      {/* Transfer PEPS Modal */}
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
                  max={userProfile?.points_balance || 0}
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Available balance: {userProfile?.points_balance || 0} PEPS
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
                  disabled={isSending || !transferData.recipientEmail || transferData.amount <= 0 || transferData.amount > (userProfile?.points_balance || 0)}
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

      {/* PEPS Information */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">About PEPS</h2>
        <div className="prose prose-sm max-w-none text-gray-500">
          <p>
            PEPS (Points Earned Per Sale) are Foodrient's reward points that you can earn and redeem on the platform.
          </p>
          <p className="mt-2">
            <strong>How to earn PEPS:</strong>
          </p>
          <ul>
            <li>Earn 0.5% of transaction value for successful referrals</li>
            <li>Receive PEPS as bonuses for exceptional performance</li>
            <li>Participate in special promotions and events</li>
          </ul>
          <p className="mt-2">
            <strong>How to use PEPS:</strong>
          </p>
          <ul>
            <li>Redeem PEPS for discounts on your purchases (1 PEPS = ₦1)</li>
            <li>Use PEPS to pay for all or part of your order</li>
            <li>PEPS can be combined with other payment methods</li>
          </ul>
          <p className="mt-2">
            PEPS expire 12 months after they are earned. Make sure to use them before they expire!
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorPeps;