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
  Calendar,
  MapPin,
  User,
  Phone
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Order {
  id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
  delivery_type: 'pickup' | 'delivery' | 'stockpile';
  delivery_fee: number;
  delivery_notes: string | null;
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
      image_url: string | null;
      vendor: {
        business_name: string;
      };
    };
  }[];
  tracking?: {
    id: string;
    status: string;
    location: string | null;
    notes: string | null;
    created_at: string;
  }[];
}

const CustomerOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
        if (user) {
          fetchOrders();
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch orders with items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_address:delivery_addresses(*),
          pickup_location:vendor_locations(*),
          items:order_items(
            *,
            product:products(
              *,
              vendor:vendors(business_name)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (ordersError) throw ordersError;
      
      // Fetch tracking information for each order
      const orderIds = ordersData?.map(order => order.id) || [];
      
      const { data: trackingData, error: trackingError } = await supabase
        .from('delivery_tracking')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });
        
      if (trackingError) throw trackingError;
      
      // Group tracking by order_id
      const trackingByOrder = trackingData?.reduce((acc, tracking) => {
        if (!acc[tracking.order_id]) {
          acc[tracking.order_id] = [];
        }
        acc[tracking.order_id].push(tracking);
        return acc;
      }, {}) || {};
      
      // Combine orders with tracking
      const ordersWithTracking = ordersData?.map(order => ({
        ...order,
        tracking: trackingByOrder[order.id] || []
      })) || [];
      
      setOrders(ordersWithTracking);
    } catch (error: any) {
      setError('Failed to load orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsViewingDetails(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => 
        item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesDeliveryType = selectedDeliveryType === 'all' || order.delivery_type === selectedDeliveryType;
    
    return matchesSearch && matchesStatus && matchesDeliveryType;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
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

  const getDeliveryIcon = (type: string) => {
    switch (type) {
      case 'pickup':
        return <Package className="h-5 w-5 text-gray-400" />;
      case 'delivery':
        return <Truck className="h-5 w-5 text-gray-400" />;
      case 'stockpile':
        return <Clock className="h-5 w-5 text-gray-400" />;
      default:
        return <Package className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
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

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-sm animate-fadeIn">
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
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
            <select
              value={selectedDeliveryType}
              onChange={(e) => setSelectedDeliveryType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Types</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="stockpile">Stockpile</option>
            </select>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Order History</h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p>No orders found</p>
            <a href="/products" className="mt-2 inline-block text-yellow-600 hover:text-yellow-700">
              Browse products
            </a>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center">
                      <span className="text-lg font-medium text-gray-900">Order #{order.id.slice(0, 8)}</span>
                      <span className={`ml-3 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(order)}
                      className="px-3 py-1 text-sm text-yellow-600 hover:text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-50"
                    >
                      View Details
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start">
                    <ShoppingBag className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Items</p>
                      <p className="text-sm text-gray-900">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </p>
                      <p className="text-sm text-gray-900 font-medium">
                        ₦{order.total_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    {getDeliveryIcon(order.delivery_type)}
                    <div className="ml-2">
                      <p className="text-sm font-medium text-gray-700">Delivery Type</p>
                      <p className="text-sm text-gray-900 capitalize">{order.delivery_type}</p>
                      {order.delivery_type === 'delivery' && order.delivery_fee > 0 && (
                        <p className="text-xs text-gray-500">
                          Delivery Fee: ₦{order.delivery_fee.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Payment Status</p>
                      <p className={`text-sm ${
                        order.payment_status === 'paid' ? 'text-green-600' : 
                        order.payment_status === 'refunded' ? 'text-red-600' : 
                        'text-yellow-600'
                      }`}>
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Latest Tracking Info */}
                {order.tracking && order.tracking.length > 0 && (
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Truck className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Tracking Status: <span className="capitalize">{order.tracking[0].status.replace('_', ' ')}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Last updated: {formatDate(order.tracking[0].created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {isViewingDetails && selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
                <p className="text-sm text-gray-500">
                  Order #{selectedOrder.id.slice(0, 8)}
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
                <h4 className="text-lg font-medium text-gray-900 mb-4">Order Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      Placed on {formatDate(selectedOrder.created_at)}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      {getDeliveryIcon(selectedOrder.delivery_type)}
                      <div className="ml-2">
                        <p className="text-sm font-medium text-gray-700">Delivery Method</p>
                        <p className="text-sm text-gray-900 capitalize">{selectedOrder.delivery_type}</p>
                        
                        {selectedOrder.delivery_type === 'delivery' && selectedOrder.delivery_address && (
                          <div className="mt-1">
                            <p className="text-sm text-gray-700">{selectedOrder.delivery_address.address_line1}</p>
                            <p className="text-sm text-gray-700">
                              {selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state}
                            </p>
                          </div>
                        )}
                        
                        {selectedOrder.delivery_type === 'pickup' && selectedOrder.pickup_location && (
                          <div className="mt-1">
                            <p className="text-sm text-gray-700">{selectedOrder.pickup_location.name}</p>
                            <p className="text-sm text-gray-700">{selectedOrder.pickup_location.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Payment Status</p>
                        <p className={`text-sm ${
                          selectedOrder.payment_status === 'paid' ? 'text-green-600' : 
                          selectedOrder.payment_status === 'refunded' ? 'text-red-600' : 
                          'text-yellow-600'
                        }`}>
                          {selectedOrder.payment_status.charAt(0).toUpperCase() + selectedOrder.payment_status.slice(1)}
                        </p>
                      </div>
                    </div>
                    
                    {selectedOrder.delivery_notes && (
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Delivery Notes</p>
                          <p className="text-sm text-gray-900">{selectedOrder.delivery_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Tracking Information</h4>
                {selectedOrder.tracking && selectedOrder.tracking.length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-4">
                      {selectedOrder.tracking.map((track: any, index: number) => (
                        <div key={track.id} className={`relative ${
                          index !== selectedOrder.tracking.length - 1 ? 'pb-4 border-l-2 border-gray-200 ml-2' : ''
                        }`}>
                          <div className="flex items-start">
                            <div className={`absolute -left-2 mt-1 w-4 h-4 rounded-full ${
                              index === 0 ? 'bg-green-500' : 'bg-gray-300'
                            }`}></div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {track.status.replace('_', ' ')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(track.created_at)}
                              </p>
                              {track.location && (
                                <p className="text-sm text-gray-700 mt-1">
                                  Location: {track.location}
                                </p>
                              )}
                              {track.notes && (
                                <p className="text-sm text-gray-700 mt-1">
                                  {track.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                    <Truck className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p>No tracking information available</p>
                  </div>
                )}
                
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
                      Vendor
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.product.image_url ? (
                            <img 
                              src={item.product.image_url} 
                              alt={item.product.name} 
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.product.vendor.business_name}
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

export default CustomerOrders;