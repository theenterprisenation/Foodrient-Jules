import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Download, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Commission {
  id: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  order?: {
    total_amount: number;
    status: string;
    created_at: string;
  };
}

const ManagerCommissions = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    commissionRate: 0.5 // 0.5%
  });

  useEffect(() => {
    fetchCommissions();
  }, [dateRange]);

  const fetchCommissions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Determine date range
      let daysToSubtract = 30;
      if (dateRange === 'week') daysToSubtract = 7;
      if (dateRange === 'year') daysToSubtract = 365;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToSubtract);
      
      // Fetch commissions
      const { data, error } = await supabase
        .from('manager_commissions')
        .select(`
          *,
          order:orders(
            total_amount,
            status,
            created_at
          )
        `)
        .eq('manager_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setCommissions(data || []);
      
      // Calculate metrics
      const total = data?.reduce((sum, commission) => sum + Number(commission.amount), 0) || 0;
      const pending = data?.filter(c => c.status === 'pending')
        .reduce((sum, commission) => sum + Number(commission.amount), 0) || 0;
      const paid = data?.filter(c => c.status === 'paid')
        .reduce((sum, commission) => sum + Number(commission.amount), 0) || 0;
      
      setMetrics({
        totalCommissions: total,
        pendingCommissions: pending,
        paidCommissions: paid,
        commissionRate: 0.5
      });
    } catch (error: any) {
      console.error('Error fetching commissions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCommissions = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'Order ID', 'Amount', 'Status'];
      const csvContent = [
        headers.join(','),
        ...commissions.map(commission => [
          format(new Date(commission.created_at), 'yyyy-MM-dd'),
          commission.order_id,
          commission.amount,
          commission.status
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `commissions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setSuccessMessage('Commissions exported successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error exporting commissions:', error);
      setError(error.message);
    }
  };

  const filteredCommissions = commissions.filter(commission => {
    const matchesSearch = commission.order_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || commission.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Commissions</h1>
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
            onClick={handleExportCommissions}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
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

      {/* Commission Metrics */}
      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Commissions</p>
              <p className="text-2xl font-semibold text-gray-900">₦{metrics.totalCommissions.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Paid Commissions</p>
              <p className="text-2xl font-semibold text-gray-900">₦{metrics.paidCommissions.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Commissions</p>
              <p className="text-2xl font-semibold text-gray-900">₦{metrics.pendingCommissions.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Commission Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.commissionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No commissions found
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((commission) => (
                  <tr key={commission.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(commission.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{commission.order_id.slice(0, 8)}</div>
                      <div className="text-xs text-gray-500">
                        {commission.order?.status || 'Unknown status'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{(commission.order?.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ₦{commission.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                        commission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {commission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-yellow-600 hover:text-yellow-900 flex items-center justify-end">
                        <FileText className="h-4 w-4 mr-1" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission Information */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">How Commissions Work</h2>
        <div className="prose prose-sm max-w-none text-gray-500">
          <p>
            As a manager, you earn a {metrics.commissionRate}% commission on all sales made by vendors assigned to you. 
            Commissions are calculated automatically when an order is marked as paid.
          </p>
          <p className="mt-2">
            <strong>Commission Status:</strong>
          </p>
          <ul>
            <li><strong>Pending:</strong> Commission has been calculated but not yet paid out</li>
            <li><strong>Paid:</strong> Commission has been paid to your account</li>
            <li><strong>Cancelled:</strong> Commission was cancelled due to order cancellation or refund</li>
          </ul>
          <p className="mt-2">
            Commissions are paid out on the 1st and 15th of each month. For any questions regarding your commissions, 
            please contact your coordinator.
          </p>
        </div>
        <div className="mt-4">
          <button className="text-sm text-yellow-600 hover:text-yellow-700 flex items-center">
            View Commission Policy
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerCommissions;