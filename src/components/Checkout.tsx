import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, CreditCard, AlertCircle, MapPin, Truck, Package, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { usePaymentStore } from '../store/paymentStore';
import { supabase } from '../lib/supabase';

interface CheckoutProps {
  onClose?: () => void;
}

interface DeliveryAddress {
  id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
}

interface VendorLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

export const Checkout: React.FC<CheckoutProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, total, clearCart } = useCartStore();
  const { processPayment } = usePaymentStore();
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'peps' | 'mixed'>('cash');
  const [pepsAmount, setPepsAmount] = useState(0);
  const [availablePeps, setAvailablePeps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery' | 'stockpile'>('pickup');
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<VendorLocation | null>(null);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [acceptedDeliveryFee, setAcceptedDeliveryFee] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAddresses();
      fetchLocations();
      fetchPepsBalance();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_locations')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchPepsBalance = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setAvailablePeps(profile?.points_balance || 0);
    } catch (error) {
      console.error('Error fetching PEPS balance:', error);
    }
  };

  const calculateDeliveryFee = async () => {
    if (!selectedAddress || !selectedLocation) return;

    try {
      const { data, error } = await supabase
        .rpc('calculate_delivery_fee', {
          vendor_lat: selectedLocation.latitude,
          vendor_lng: selectedLocation.longitude,
          delivery_lat: selectedAddress.latitude,
          delivery_lng: selectedAddress.longitude
        });

      if (error) throw error;
      setDeliveryFee(data);
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
    }
  };

  useEffect(() => {
    if (deliveryType === 'delivery' && selectedAddress && selectedLocation) {
      calculateDeliveryFee();
    } else {
      setDeliveryFee(0);
      setAcceptedDeliveryFee(false);
    }
  }, [deliveryType, selectedAddress, selectedLocation]);

  const handlePepsAmountChange = (amount: number) => {
    const validAmount = Math.min(Math.max(0, amount), availablePeps);
    setPepsAmount(validAmount);
    
    if (validAmount === 0) {
      setPaymentMethod('cash');
    } else if (validAmount >= total()) {
      setPaymentMethod('peps');
    } else {
      setPaymentMethod('mixed');
    }
  };

  const getFinalTotal = () => {
    return total() + (acceptedDeliveryFee ? deliveryFee : 0);
  };

  const handleCheckout = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: getFinalTotal(),
          payment_method: paymentMethod,
          peps_amount: pepsAmount,
          status: 'pending',
          payment_status: 'pending',
          delivery_type: deliveryType,
          delivery_address_id: selectedAddress?.id,
          pickup_location_id: selectedLocation?.id,
          delivery_fee: acceptedDeliveryFee ? deliveryFee : 0
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // If using PEPS, deduct points
      if (pepsAmount > 0) {
        const { error: pepsError } = await supabase
          .from('affiliate_points')
          .insert({
            user_id: user.id,
            points: -pepsAmount,
            transaction_type: 'spent',
            source: 'order',
            reference_id: order.id
          });

        if (pepsError) throw pepsError;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ points_balance: availablePeps - pepsAmount })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      // If there's remaining amount to be paid with cash
      const cashAmount = getFinalTotal() - pepsAmount;
      if (cashAmount > 0) {
        const paymentUrl = await processPayment(
          order.id,
          user.email!,
          items
        );
        window.location.href = paymentUrl;
      } else {
        // If fully paid with PEPS, update order status
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'paid'
          })
          .eq('id', order.id);

        if (updateError) throw updateError;

        clearCart();
        if (onClose) onClose();
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h2>

      {/* Order Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between">
              <div>
                <p className="text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} {item.unit} × ₦{item.price}
                </p>
              </div>
              <p className="text-gray-900">₦{(item.quantity * item.price).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Options */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Options</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="pickup"
                checked={deliveryType === 'pickup'}
                onChange={(e) => setDeliveryType(e.target.value as any)}
                className="form-radio text-yellow-500"
              />
              <span className="ml-2">Pickup from Location</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="delivery"
                checked={deliveryType === 'delivery'}
                onChange={(e) => setDeliveryType(e.target.value as any)}
                className="form-radio text-yellow-500"
              />
              <span className="ml-2">Door-Step Delivery</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="stockpile"
                checked={deliveryType === 'stockpile'}
                onChange={(e) => setDeliveryType(e.target.value as any)}
                className="form-radio text-yellow-500"
              />
              <span className="ml-2">Stockpile</span>
            </label>
          </div>

          {deliveryType === 'pickup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Pickup Location
              </label>
              <select
                value={selectedLocation?.id || ''}
                onChange={(e) => {
                  const location = locations.find(l => l.id === e.target.value);
                  setSelectedLocation(location || null);
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              >
                <option value="">Select a location</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name} - {location.address}
                  </option>
                ))}
              </select>
            </div>
          )}

          {deliveryType === 'delivery' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Delivery Address
              </label>
              <select
                value={selectedAddress?.id || ''}
                onChange={(e) => {
                  const address = addresses.find(a => a.id === e.target.value);
                  setSelectedAddress(address || null);
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              >
                <option value="">Select an address</option>
                {addresses.map(address => (
                  <option key={address.id} value={address.id}>
                    {address.address_line1}, {address.city}
                  </option>
                ))}
              </select>

              {deliveryFee > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">
                    Delivery Fee: ₦{deliveryFee.toLocaleString()}
                  </p>
                  <p className="text-xs text-yellow-700 mb-4">
                    This delivery cost is calculated for Intra State only. Please negotiate with Vendor for Inter State deliveries. It is also advised that you buy from vendors close to you to save cost on delivery.
                  </p>
                  {!acceptedDeliveryFee && (
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setDeliveryType('pickup')}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => setAcceptedDeliveryFee(true)}
                        className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PEPS Payment Option */}
      {availablePeps > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pay with PEPS</h3>
          <div className="bg-yellow-50 rounded-lg p-4 mb-4">
            <div className="flex items-center text-yellow-800">
              <Wallet className="h-5 w-5 mr-2" />
              <p>Available PEPS: {availablePeps.toLocaleString()}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PEPS Amount to Use
            </label>
            <input
              type="number"
              min="0"
              max={Math.min(availablePeps, getFinalTotal())}
              value={pepsAmount}
              onChange={(e) => handlePepsAmountChange(parseInt(e.target.value) || 0)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            />
          </div>
        </div>
      )}

      {/* Payment Method Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-gray-600">
            <span>Subtotal</span>
            <span>₦{total().toLocaleString()}</span>
          </div>
          
          {acceptedDeliveryFee && deliveryFee > 0 && (
            <div className="flex justify-between items-center text-gray-600">
              <span>Delivery Fee</span>
              <span>₦{deliveryFee.toLocaleString()}</span>
            </div>
          )}

          {pepsAmount > 0 && (
            <div className="flex justify-between items-center text-yellow-600">
              <div className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                <span>PEPS Payment</span>
              </div>
              <span>-₦{pepsAmount.toLocaleString()}</span>
            </div>
          )}

          {getFinalTotal() - pepsAmount > 0 && (
            <div className="flex justify-between items-center text-blue-600">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                <span>Cash Payment</span>
              </div>
              <span>₦{(getFinalTotal() - pepsAmount).toLocaleString()}</span>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center font-bold text-lg text-gray-900">
              <span>Total</span>
              <span>₦{getFinalTotal().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <div className="flex items-center text-red-800">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={isLoading || (deliveryType === 'delivery' && !acceptedDeliveryFee)}
        className="w-full bg-yellow-500 text-white py-3 px-4 rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Complete Purchase'}
      </button>
    </div>
  );
};