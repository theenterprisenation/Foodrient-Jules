import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Calendar, 
  Search, 
  Filter, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface DeliverySchedule {
  id: string;
  order_id: string;
  delivery_date: string;
  time_slot: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  order: {
    total_amount: number;
    delivery_type: 'pickup' | 'delivery' | 'stockpile';
    delivery_address_id: string | null;
    pickup_location_id: string | null;
    user_id: string;
    delivery_notes: string | null;
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
  customer?: {
    full_name: string;
    phone_number: string;
    email: string;
  };
}

const VendorDelivery = () => {
  const [deliveries, setDeliveries] = useState<DeliverySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliverySchedule | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);

  useEffect(() => {
    fetchVendorId();
    generateWeekDates();
  }, []);

  useEffect(() => {
    if (vendorId) {
      fetchDeliveries();
    }
  }, [vendorId, selectedDate]);

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

  const generateWeekDates = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start from Monday
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    setWeekDates(dates);
  };

  const fetchDeliveries = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get start and end of selected date
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      
      // Fetch orders for this vendor's products
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          order_id,
          product:products(
            vendor_id
          )
        `)
        .eq('product.vendor_id', vendorId);
        
      if (orderItemsError) throw orderItemsError;
      
      // Get unique order IDs
      const orderIds = [...new Set(orderItems?.map(item => item.order_id))];
      
      if (orderIds.length === 0) {
        setDeliveries([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch delivery schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('delivery_tracking')
        .select(`
          id,
          order_id,
          status,
          location,
          notes,
          created_at,
          updated_at,
          order:orders(
            total_amount,
            delivery_type,
            delivery_address_id,
            pickup_location_id,
            user_id,
            delivery_notes
          )
        `)
        .in('order_id', orderIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
        
      if (schedulesError) throw schedulesError;
      
      // Fetch delivery addresses and pickup locations
      const addressIds = schedulesData?.map(s => s.order.delivery_address_id).filter(Boolean) || [];
      const locationIds = schedulesData?.map(s => s.order.pickup_location_id).filter(Boolean) || [];
      const userIds = schedulesData?.map(s => s.order.user_id).filter(Boolean) || [];
      
      const [addressesResponse, locationsResponse, customersResponse] = await Promise.all([
        // Fetch delivery addresses
        addressIds.length > 0 ? supabase
          .from('delivery_addresses')
          .select('id, address_line1, city, state')
          .in('id', addressIds) : { data: [], error: null },
          
        // Fetch pickup locations
        locationIds.length > 0 ? supabase
          .from('vendor_locations')
          .select('id, name, address')
          .in('id', locationIds) : { data: [], error: null },
          
        // Fetch customer details
        userIds.length > 0 ? supabase
          .from('profiles')
          .select(`
            id, 
            full_name, 
            phone_number,
            email:auth.users!profiles_id_fkey(email)
          `)
          .in('id', userIds) : { data: [], error: null }
      ]);
      
      if (addressesResponse.error) throw addressesResponse.error;
      if (locationsResponse.error) throw locationsResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      
      // Create lookup maps
      const addressMap = new Map(addressesResponse.data?.map(addr => [addr.id, addr]));
      const locationMap = new Map(locationsResponse.data?.map(loc => [loc.id, loc]));
      const customerMap = new Map(customersResponse.data?.map(cust => [
        cust.id, 
        {
          ...cust,
          email: cust.email?.[0]?.email || 'N/A'
        }
      ]));
      
      // Process delivery schedules
      const processedDeliveries = schedulesData?.map(schedule => ({
        id: schedule.id,
        order_id: schedule.order_id,
        delivery_date: schedule.created_at,
        time_slot: '9:00 AM - 12:00 PM', // Mock data
        status: schedule.status,
        notes: schedule.notes,
        created_at: schedule.created_at,
        order: schedule.order,
        delivery_address: schedule.order.delivery_address_id ? 
          addressMap.get(schedule.order.delivery_address_id) : undefined,
        pickup_location: schedule.order.pickup_location_id ?
          locationMap.get(schedule.order.pickup_location_id) : undefined,
        customer: schedule.order.user_id ?
          customerMap.get(schedule.order.user_id) : undefined
      }));
      
      setDeliveries(processedDeliveries || []);
    } catch (error: any) {
      console.error('Error fetching deliveries:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (deliveryId: string, newStatus: DeliverySchedule['status']) => {
    try {
      const { error } = await supabase
        .from('delivery_tracking')
        .update({ status: newStatus })
        .eq('id', deliveryId);
        
      if (error) throw error;
      
      setSuccessMessage(`Delivery status updated to ${newStatus}`);
      fetchDeliveries();
      
      if (selectedDelivery && selectedDelivery.id === deliveryId) {
        setSelectedDelivery({
          ...selectedDelivery,
          status: newStatus
        });
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating delivery status:', error);
      setError(error.message);
    }
  };

  const handleViewDetails = (delivery: DeliverySchedule) => {
    setSelectedDelivery(delivery);
    setIsViewingDetails(true);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = 
      delivery.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
    const matchesStatus = selectedStatus === 'all' || delivery.status === selectedStatus;
    const matchesDeliveryType = selectedDeliveryType === 'all' || delivery.order.delivery_type === selectedDeliveryType;
    
    return matchesSearch && matchesStatus && matchesDeliveryType;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatus = (currentStatus: DeliverySchedule['status']) => {
    switch (currentStatus) {
      case 'scheduled':
        return 'in_progress';
      case 'in_progress':
        return 'completed';
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Schedules</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search deliveries..."
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

      {/* Calendar Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Delivery Calendar</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const prevWeek = addDays(selectedDate, -7);
                setSelectedDate(prevWeek);
                generateWeekDates();
              }}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              Previous Week
            </button>
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                generateWeekDates();
              }}
              className="p-2 rounded-md bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            >
              Today
            </button>
            <button
              onClick={() => {
                const nextWeek = addDays(selectedDate, 7);
                setSelectedDate(nextWeek);
                generateWeekDates();
              }}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              Next Week
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <button
                key={index}
                onClick={() => handleDateChange(date)}
                className={`p-4 rounded-lg text-center ${
                  isSelected ? 'bg-yellow-500 text-white' :
                  isToday ? 'bg-yellow-100 text-yellow-800' :
                  'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium mb-1">
                  {format(date, 'EEE')}
                </div>
                <div className="text-lg font-bold">
                  {format(date, 'd')}
                </div>
                <div className="text-xs">
                  {format(date, 'MMM')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-sm animate-fadeIn">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
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

      {/* Deliveries List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Deliveries for {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No deliveries scheduled for this date
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDeliveries.map((delivery) => (
              <div key={delivery.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center">
                      <span className="text-lg font-medium text-gray-900">Order #{delivery.order_id.slice(0, 8)}</span>
                      <span className={`ml-3 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(delivery.delivery_date)} • {delivery.time_slot}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(delivery)}
                      className="px-3 py-1 text-sm text-yellow-600 hover:text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-50"
                    >
                      View Details
                    </button>
                    {getNextStatus(delivery.status) && (
                      <button
                        onClick={() => handleUpdateStatus(delivery.id, getNextStatus(delivery.status)!)}
                        className="px-3 py-1 text-sm text-green-600 hover:text-green-700 border border-green-200 rounded-md hover:bg-green-50"
                      >
                        Mark as {getNextStatus(delivery.status)!.replace('_', ' ')}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Customer</p>
                      <p className="text-sm text-gray-900">{delivery.customer?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{delivery.customer?.phone_number || 'No phone'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    {delivery.order.delivery_type === 'pickup' ? (
                      <>
                        <Package className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Pickup Location</p>
                          <p className="text-sm text-gray-900">{delivery.pickup_location?.name || 'Not specified'}</p>
                          <p className="text-xs text-gray-500">{delivery.pickup_location?.address || ''}</p>
                        </div>
                      </>
                    ) : delivery.order.delivery_type === 'delivery' ? (
                      <>
                        <Truck className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                          <p className="text-sm text-gray-900">{delivery.delivery_address?.address_line1 || 'Not specified'}</p>
                          <p className="text-xs text-gray-500">
                            {delivery.delivery_address ? 
                              `${delivery.delivery_address.city}, ${delivery.delivery_address.state}` : 
                              ''}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Clock className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Stockpile</p>
                          <p className="text-sm text-gray-900">Items will be stored</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Notes</p>
                      <p className="text-sm text-gray-900">
                        {delivery.notes || delivery.order.delivery_notes || 'No special instructions'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery Details Modal */}
      {isViewingDetails && selectedDelivery && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Delivery Details</h3>
                <p className="text-sm text-gray-500">
                  Order #{selectedDelivery.order_id.slice(0, 8)}
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
                <h4 className="text-lg font-medium text-gray-900 mb-4">Delivery Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDelivery.status)}`}>
                      {selectedDelivery.status.replace('_', ' ')}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {formatDate(selectedDelivery.delivery_date)} • {selectedDelivery.time_slot}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      {selectedDelivery.order.delivery_type === 'pickup' ? (
                        <>
                          <Package className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Pickup Location</p>
                            <p className="text-sm text-gray-900">{selectedDelivery.pickup_location?.name || 'Not specified'}</p>
                            <p className="text-sm text-gray-500">{selectedDelivery.pickup_location?.address || ''}</p>
                          </div>
                        </>
                      ) : selectedDelivery.order.delivery_type === 'delivery' ? (
                        <>
                          <Truck className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                            <p className="text-sm text-gray-900">{selectedDelivery.delivery_address?.address_line1 || 'Not specified'}</p>
                            <p className="text-sm text-gray-500">
                              {selectedDelivery.delivery_address ? 
                                `${selectedDelivery.delivery_address.city}, ${selectedDelivery.delivery_address.state}` : 
                                ''}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Clock className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Stockpile</p>
                            <p className="text-sm text-gray-900">Items will be stored for later pickup</p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Notes</p>
                        <p className="text-sm text-gray-900">
                          {selectedDelivery.notes || selectedDelivery.order.delivery_notes || 'No special instructions'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Name</p>
                        <p className="text-sm text-gray-900">{selectedDelivery.customer?.full_name || 'Unknown'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone</p>
                        <p className="text-sm text-gray-900">{selectedDelivery.customer?.phone_number || 'No phone number'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        <p className="text-sm text-gray-900">{selectedDelivery.customer?.email || 'No email'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h4 className="text-lg font-medium text-gray-900 mt-6 mb-4">Update Status</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-3">
                    {getNextStatus(selectedDelivery.status) && (
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedDelivery.id, getNextStatus(selectedDelivery.status)!);
                        }}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as {getNextStatus(selectedDelivery.status)!.replace('_', ' ')}
                      </button>
                    )}
                    
                    {selectedDelivery.status !== 'cancelled' && selectedDelivery.status !== 'completed' && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to cancel this delivery?')) {
                            handleUpdateStatus(selectedDelivery.id, 'cancelled');
                          }
                        }}
                        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Delivery
                      </button>
                    )}
                  </div>
                </div>
              </div>
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

export default VendorDelivery;