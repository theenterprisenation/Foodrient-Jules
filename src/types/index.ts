export * from './user';

export interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  min_quantity: number;
  max_quantity: number | null;
  available_quantity: number;
  unit: string;
  category: string;
  status: 'active' | 'inactive' | 'deleted';
  has_price_tiers: boolean;
  price_tiers: string | null;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
}

export interface PriceTier {
  participants: number;
  price: number;
}

export interface GroupBuy {
  id: string;
  product_id: string;
  start_date: string;
  end_date: string;
  target_quantity: number;
  current_quantity: number;
  price_tiers: PriceTier[];
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  group_buy_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
  updated_at: string;
  group_buy?: GroupBuy;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  product?: Product;
}