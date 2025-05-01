import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Download, 
  Search, 
  Filter, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  CreditCard,
  Store,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Payment {
  id: string;
  order_id: string;
  reference: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  order?: {
    status: string;
    payment_status: string;
  };
}

interface PaymentSplit {
  id: string;
  payment_id: string;
  vendor_id: string;
  amount: number;
  platform_fee: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  vendor?: {
    business_name: string;
  };
}

const ChiefPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vendors, setVendors] = useState<{id: string; business_name: string}[]>([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    platformFees: 0,
    vendorPayouts: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    fetchPayments();
    fetchVendors();
  }, [dateRange]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('status', 'active');
        
      if (error) throw error;
      
      setVendors(data || []);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Determine date range
      let startDate;
      const endDate = new Date();
      
      if (dateRange === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          order:orders(
            status,
            payment_status
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (paymentsError) throw paymentsError;
      
      setPayments(paymentsData || []);
      
      // Fetch payment splits
      const paymentIds = paymentsData?.map(payment => payment.id) || [];
      
      if (paymentIds.length === 0) {
        setPaymentSplits([]);
        setMetrics({
          totalRevenue: 0,
          platformFees: 0,
          vendorPayouts: 0,
          pendingPayments: 0
        });
        setIsLoading(false);
        return;
      }
      
      const { data: splitsData, error: splitsError } = await supabase
        .from('payment_splits')
        .select(`
          *,
          vendor:vendors(
            business_name
          )
        `)
        .in('payment_id', paymentIds);
        
      if (splitsError) throw splitsError;
      
      setPaymentSplits(splitsData || []);
      
      // Calculate metrics
      const totalRevenue = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      const platformFees = splitsData?.reduce((sum, split) => sum + Number(split.platform_fee), 0) || 0;
      const vendorPayouts = splitsData?.reduce((sum, split) => sum + Number(split.amount), 0) || 0;
      const pendingPayments = splitsData?.filter(split => split.status === 'pending')
        .reduce((sum, split) => sum + Number(split.amount), 0) || 0;
      
      setMetrics({
        totalRevenue,
        platformFees,
        vendorPayouts,
        pendingPayments
      });
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPayments = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'Reference', 'Order ID', 'Vendor', 'Amount', 'Platform Fee', 'Vendor Payout', 'Status'];
      const csvContent = [
        headers.join(','),
        ...paymentSplits.map(split => {
          const payment = payments.find(p => p.id === split.payment_id);
          return [
            format(new Date(split.created_at), 'yyyy-MM-dd'),
            payment?.reference || 'N/A',
            payment?.order_id || 'N/A',
            split.vendor?.business_name || 'Unknown',
            payment?.amount || 0,
            split.platform_fee,
            split.amount,
            split.status
          ].join(',');
        })
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setSuccessMessage('Payment history exported successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error exporting payments:', error);
      setError(error.message);
    }
  };

  const filteredPaymentSplits = paymentSplits.filter(split => {
    const payment = payments.find(p => p.id === split.payment_id);
    
    const matchesSearch = 
      payment?.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment?.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      split.vendor?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
      
    const matchesStatus = selectedStatus === 'all' || split.status === selectedStatus;
    const matchesVendor = selectedVendor === 'all' || split.vendor_id === selectedVendor;
    
    return matchesSearch && matchesStatus && matchesVendor;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
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
            onClick={handleExportPayments}
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

      {/* Payment Metrics */}
      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">₦{metrics.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Platform Fees</p>
              <p className="text-2xl font-semibold text-gray-900">₦{metrics.platformFees.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Vendor Payouts</p>
              <p className="text-2xl font-semibold text-gray-900">₦{metrics.vendorPayouts.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Payments</p>
              <p className="text-2xl font-semibold text-gray-900">₦{metrics.pendingPayments.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by reference, order ID, or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          <Filter className="h-5 w-5 mr-2" />
          Filters
          <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${showFilters ? 'transform rotate-180' : ''}`} />
        </button>
      </div>

      {/* Additional Filters */}
      {showFilters && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-sm animate-fadeIn">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Vendors</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>{vendor.business_name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor Payout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredPaymentSplits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No payment records found
                  </td>
                </tr>
              ) : (
                filteredPaymentSplits.map((split) => {
                  const payment = payments.find(p => p.id === split.payment_id);
                  return (
                    <tr key={split.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(split.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{payment?.reference || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment?.order_id ? `#${payment.order_id.slice(0, 8)}` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment?.order?.status || 'Unknown status'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Store className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{split.vendor?.business_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₦{(Number(split.amount) + Number(split.platform_fee)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        ₦{Number(split.platform_fee).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        ₦{Number(split.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          split.status === 'completed' ? 'bg-green-100 text-green-800' :
                          split.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {split.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Information */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h2>
        <div className="prose prose-sm max-w-none text-gray-500">
          <p>
            Foodrient charges a 5% platform fee on each transaction. Vendors receive 95% of the payment amount.
          </p>
          <p className="mt-2">
            <strong>Payment Status:</strong>
          </p>
          <ul>
            <li><strong>Pending:</strong> Payment has been received but not yet transferred to the vendor</li>
            <li><strong>Completed:</strong> Payment has been transferred to the vendor's account</li>
            <li><strong>Failed:</strong> Payment processing failed</li>
          </ul>
          <p className="mt-2">
            Payments are processed and transferred to vendors within 2-3 business days after the order is marked as delivered.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChiefPayments;