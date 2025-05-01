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
  Mail,
  Store,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface DeliverySchedule {
  id: string;
  order_id: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
  vendor?: {
    id: string;
    business_name: string;
  };
}

const CoordinatorDelivery = () => {
  const [deliveries, setDeliveries] = useState<DeliverySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliverySchedule | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [vendors, setVendors] = useState<{id: string; business_name: string}[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    generateWeekDates();
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [selectedDate]);

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
            delivery_notes,
            order_items!inner(
              product:products!inner(
                vendor_id,
                vendor:vendors(
                  id,
                  business_name
                )
              )
            )
          )
        `)
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
      const processedDeliveries = schedulesData?.map(schedule => {
        // Get vendor from the first order item
        const vendor = schedule.order.order_items?.[0]?.product?.vendor || null;
        
        return {
          id: schedule.id,
          order_id: schedule.order_id,
          status: schedule.status,
          location: schedule.location,
          notes: schedule.notes,
          created_at: schedule.created_at,
          updated_at: schedule.updated_at,
          order: schedule.order,
          delivery_address: schedule.order.delivery_address_id ? 
            addressMap.get(schedule.order.delivery_address_id) : undefined,
          pickup_location: schedule.order.pickup_location_id ?
            locationMap.get(schedule.order.pickup_location_id) : undefined,
          customer: schedule.order.user_id ?
            customerMap.get(schedule.order.user_id) : undefined,
          vendor: vendor
        };
      }) || [];
      
      setDeliveries(processedDeliveries);
      
      // Extract unique locations for filtering
      const uniqueLocations = new Set<string>();
      processedDeliveries.forEach(delivery => {
        if (delivery.location) uniqueLocations.add(delivery.location);
        if (delivery.delivery_address) {
          uniqueLocations.add(`${delivery.delivery_address.city}, ${delivery.delivery_address.state}`);
        }
        if (delivery.pickup_location) {
          uniqueLocations.add(delivery.pickup_location.address);
        }
      });
      
      setLocations(Array.from(uniqueLocations));
    } catch (error: any) {
      console.error('Error fetching deliveries:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (delivery: DeliverySchedule) => {
    setSelectedDelivery(delivery);
    setIsViewingDetails(true);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleExportDeliveries = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'Order ID', 'Customer', 'Vendor', 'Delivery Type', 'Location', 'Status'];
      const csvContent = [
        headers.join(','),
        ...filteredDeliveries.map(delivery => [
          format(new Date(delivery.created_at), 'yyyy-MM-dd'),
          delivery.order_id,
          `"${delivery.customer?.full_name || 'Unknown'}"`,
          `"${delivery.vendor?.business_name || 'Unknown'}"`,
          delivery.order.delivery_type,
          `"${delivery.location || 
            (delivery.delivery_address ? 
              `${delivery.delivery_address.address_line1}, ${delivery.delivery_address.city}` : 
              (delivery.pickup_location ? delivery.pickup_location.address : 'Unknown')
            )}"`,
          delivery.status
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `deliveries-${format(selectedDate, 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setSuccessMessage('Deliveries exported successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error exporting deliveries:', error);
      setError(error.message);
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = 
      delivery.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (delivery.vendor?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
    const matchesStatus = selectedStatus === 'all' || delivery.status === selectedStatus;
    const matchesDeliveryType = selectedDeliveryType === 'all' || delivery.order.delivery_type === selectedDeliveryType;
    const matchesVendor = selectedVendor === 'all' || delivery.vendor?.id === selectedVendor;
    
    const deliveryLocation = 
      delivery.location || 
      (delivery.delivery_address ? 
        `${delivery.delivery_address.city}, ${delivery.delivery_address.state}` : 
        (delivery.pickup_location ? delivery.pickup_location.address : '')
      );
    
    const matchesLocation = selectedLocation === 'all' || deliveryLocation.includes(selectedLocation);
    
    return matchesSearch && matchesStatus && matchesDeliveryType && matchesVendor && matchesLocation;
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">All Delivery Schedules</h1>
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
          <button
            onClick={handleExportDeliveries}
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
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm animate-fadeIn">
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
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
                    <div className="flex items-center mt-1">
                      <Store className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">{delivery.vendor?.business_name || 'Unknown Vendor'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(delivery.created_at)} • {formatTime(delivery.created_at)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(delivery)}
                      className="px-3 py-1 text-sm text-yellow-600 hover:text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-50"
                    >
                      View Details
                    </button>
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
                      {formatDate(selectedDelivery.created_at)} • {formatTime(selectedDelivery.created_at)}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Store className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Vendor</p>
                        <p className="text-sm text-gray-900">{selectedDelivery.vendor?.business_name || 'Unknown'}</p>
                      </div>
                    </div>
                    
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
                    
                    <div className="flex items-start">
                      <DollarSign className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Order Amount</p>
                        <p className="text-sm text-gray-900">₦{selectedDelivery.order.total_amount.toLocaleString()}</p>
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
                
                <h4 className="text-lg font-medium text-gray-900 mt-6 mb-4">Delivery Timeline</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-6">
                    <div className="relative flex items-start">
                      <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center z-10">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">Order Created</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedDelivery.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="relative flex items-start">
                      <div className={`h-5 w-5 rounded-full ${
                        selectedDelivery.status === 'scheduled' || 
                        selectedDelivery.status === 'in_progress' || 
                        selectedDelivery.status === 'completed' ? 
                        'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center z-10`}>
                        {(selectedDelivery.status === 'scheduled' || 
                          selectedDelivery.status === 'in_progress' || 
                          selectedDelivery.status === 'completed') && 
                          <CheckCircle className="h-3 w-3 text-white" />
                        }
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">Scheduled</p>
                        <p className="text-xs text-gray-500">{formatDate(selectedDelivery.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="relative flex items-start">
                      <div className={`h-5 w-5 rounded-full ${
                        selectedDelivery.status === 'in_progress' || 
                        selectedDelivery.status === 'completed' ? 
                        'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center z-10`}>
                        {(selectedDelivery.status === 'in_progress' || 
                          selectedDelivery.status === 'completed') && 
                          <CheckCircle className="h-3 w-3 text-white" />
                        }
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">In Progress</p>
                        <p className="text-xs text-gray-500">
                          {selectedDelivery.status === 'in_progress' || selectedDelivery.status === 'completed' ? 
                            formatDate(selectedDelivery.updated_at) : 'Pending'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="relative flex items-start">
                      <div className={`h-5 w-5 rounded-full ${
                        selectedDelivery.status === 'completed' ? 
                        'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center z-10`}>
                        {selectedDelivery.status === 'completed' && 
                          <CheckCircle className="h-3 w-3 text-white" />
                        }
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">Completed</p>
                        <p className="text-xs text-gray-500">
                          {selectedDelivery.status === 'completed' ? 
                            formatDate(selectedDelivery.updated_at) : 'Pending'
                          }
                        </p>
                      </div>
                    </div>
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

export default CoordinatorDelivery;