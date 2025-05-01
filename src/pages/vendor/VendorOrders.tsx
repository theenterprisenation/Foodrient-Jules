import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ChevronDown, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Truck, 
  Package, 
  Clock, 
  Eye, 
  Bell
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
  updated_at: string;
  delivery_type: 'pickup' | 'delivery' | 'stockpile';
  delivery_fee: number;
  delivery_notes: string | null;
  user?: {
    full_name: string;
    email: string;
    phone_number: string;
  };
  delivery_address?: {
    address_line1: string;
    city: string;
    state: string;
  };
  pickup_location?: {
    name: string;
    address: string;
  };
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    product: {
      name: string;
      unit: string;
    };
  }[];
}

const VendorOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [newOrders, setNewOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchVendorId();
  }, []);

  useEffect(() => {
    if (vendorId) {
      fetchOrders();
    }
  }, [vendorId]);

  const fetchVendorId = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Fetch vendor profile
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (vendorError) throw vendorError;
      
      setVendorId(vendorData.id);
    } catch (error: any) {
      console.error('Error fetching vendor ID:', error);
      setError(error.message);
    }
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch orders for this vendor's products
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          product:products(
            name,
            unit,
            vendor_id
          )
        `)
        .eq('product.vendor_id', vendorId);
        
      if (orderItemsError) throw orderItemsError;
      
      // Group order items by order_id
      const orderItemsByOrder = orderItems?.reduce((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {});
      
      // Fetch order details
      const orderIds = Object.keys(orderItemsByOrder || {});
      
      if (orderIds.length === 0) {
        setOrders([]);
        setIsLoading(false);
        return;
      }
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          user:profiles(
            full_name,
            email:auth.users!profiles_id_fkey(email),
            phone_number
          ),
          delivery_address:delivery_addresses(*),
          pickup_location:vendor_locations(*)
        `)
        .in('id', orderIds)
        .order('created_at', { ascending: false });
        
      if (ordersError) throw ordersError;
      
      // Combine order data with items
      const processedOrders = ordersData?.map(order => ({
        ...order,
        user: {
          ...order.user,
          email: order.user?.email?.[0]?.email || 'N/A'
        },
        items: orderItemsByOrder[order.id] || []
      }));
      
      setOrders(processedOrders || []);
      
      // Check for new orders (pending status)
      const newOrdersCount = processedOrders?.filter(order => order.status === 'pending').length || 0;
      if (newOrdersCount > 0) {
        setNewOrders(processedOrders?.filter(order => order.status === 'pending') || []);
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
        
      if (error) throw error;
      
      setSuccessMessage(`Order status updated to ${newStatus}`);
      fetchOrders();
      
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: newStatus
        });
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      setError(error.message);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsViewingDetails(true);
    
    // Remove from new orders if it was there
    if (newOrders.some(newOrder => newOrder.id === order.id)) {
      setNewOrders(newOrders.filter(newOrder => newOrder.id !== order.id));
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesPaymentStatus = selectedPaymentStatus === 'all' || order.payment_status === selectedPaymentStatus;
    const matchesDeliveryType = selectedDeliveryType === 'all' || order.delivery_type === selectedDeliveryType;
    
    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesDeliveryType;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatus = (currentStatus: Order['status']) => {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'shipped';
      case 'shipped':
        return 'delivered';
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          {newOrders.length > 0 && (
            <div className="ml-4 flex items-center">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="ml-2 text-sm font-medium text-red-600">
                {newOrders.length} new {newOrders.length === 1 ? 'order' : 'orders'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
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

      {/* New Orders Notification */}
      {newOrders.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center mb-2">
            <Bell className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-yellow-800">New Orders</h3>
          </div>
          <p className="text-yellow-700 mb-4">
            You have {newOrders.length} new {newOrders.length === 1 ? 'order' : 'orders'} that require your attention.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newOrders.slice(0, 3).map(order => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {order.status}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'} • ₦{order.total_amount.toLocaleString()}
                  </p>
                </div>
                <div className="mt-3 flex justify-between">
                  <button
                    onClick={() => handleViewDetails(order)}
                    className="text-sm text-yellow-600 hover:text-yellow-700"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    Confirm Order
                  </button>
                </div>
              </div>
            ))}
            {newOrders.length > 3 && (
              <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center">
                <button
                  onClick={() => {
                    setSelectedStatus('pending');
                    setShowFilters(true);
                  }}
                  className="text-sm text-yellow-600 hover:text-yellow-700"
                >
                  View {newOrders.length - 3} more new orders
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow-sm animate-fadeIn">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
            <select
              value={selectedDeliveryType}
              onChange={(e) => setSelectedDeliveryType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Delivery Types</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="stockpile">Stockpile</option>
            </select>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className={newOrders.some(newOrder => newOrder.id === order.id) ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</div>
                      <div className="text-xs text-gray-500">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.user?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{order.user?.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₦{order.total_amount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        {order.payment_status === 'paid' ? 'Paid' : 'Pending payment'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        {order.delivery_type === 'pickup' ? (
                          <Package className="h-4 w-4 mr-1" />
                        ) : order.delivery_type === 'delivery' ? (
                          <Truck className="h-4 w-4 mr-1" />
                        ) : (
                          <Clock className="h-4 w-4 mr-1" />
                        )}
                        <span className="capitalize">{order.delivery_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="text-yellow-600 hover:text-yellow-900 mr-3"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {getNextStatus(order.status) && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, getNextStatus(order.status)!)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {isViewingDetails && selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Order #{selectedOrder.id.slice(0, 8)}</h3>
                <p className="text-sm text-gray-500">
                  Placed on {formatDate(selectedOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setIsViewingDetails(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">{selectedOrder.user?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{selectedOrder.user?.email || 'No email'}</p>
                  <p className="text-sm text-gray-500">{selectedOrder.user?.phone_number || 'No phone'}</p>
                </div>
                
                <h4 className="text-lg font-medium text-gray-900 mt-6 mb-4">Delivery Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    {selectedOrder.delivery_type === 'pickup' ? (
                      <Package className="h-5 w-5 text-gray-400 mr-2" />
                    ) : selectedOrder.delivery_type === 'delivery' ? (
                      <Truck className="h-5 w-5 text-gray-400 mr-2" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    )}
                    <p className="text-sm font-medium text-gray-900 capitalize">{selectedOrder.delivery_type}</p>
                  </div>
                  
                  {selectedOrder.delivery_type === 'delivery' && selectedOrder.delivery_address && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">{selectedOrder.delivery_address.address_line1}</p>
                      <p className="text-sm text-gray-700">
                        {selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state}
                      </p>
                      {selectedOrder.delivery_fee > 0 && (
                        <p className="text-sm text-gray-700 mt-2">
                          Delivery Fee: ₦{selectedOrder.delivery_fee.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {selectedOrder.delivery_type === 'pickup' && selectedOrder.pickup_location && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">{selectedOrder.pickup_location.name}</p>
                      <p className="text-sm text-gray-700">{selectedOrder.pickup_location.address}</p>
                    </div>
                  )}
                  
                  {selectedOrder.delivery_notes && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Notes:</p>
                      <p className="text-sm text-gray-700">{selectedOrder.delivery_notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Order Status</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedOrder.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedOrder.payment_status}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {getNextStatus(selectedOrder.status) && (
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedOrder.id, getNextStatus(selectedOrder.status)!);
                        }}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as {getNextStatus(selectedOrder.status)}
                      </button>
                    )}
                    
                    {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to cancel this order?')) {
                            handleUpdateStatus(selectedOrder.id, 'cancelled');
                          }
                        }}
                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
                
                <h4 className="text-lg font-medium text-gray-900 mt-6 mb-4">Payment Summary</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-900">₦{(selectedOrder.total_amount - selectedOrder.delivery_fee).toLocaleString()}</span>
                    </div>
                    
                    {selectedOrder.delivery_fee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Delivery Fee</span>
                        <span className="text-gray-900">₦{selectedOrder.delivery_fee.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-900">Total</span>
                        <span className="text-gray-900">₦{selectedOrder.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <h4 className="text-lg font-medium text-gray-900 mb-4">Order Items</h4>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity} {item.product.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₦{item.unit_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ₦{item.subtotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsViewingDetails(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOrders;