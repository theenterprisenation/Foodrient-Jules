import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  MessageSquare,
  Package,
  ShoppingBag,
  Users,
  BarChart,
  LogOut,
  Home,
  Settings,
  FileText,
  Image,
  UserCheck,
  Store,
  Wallet,
  PieChart,
  DollarSign,
  MapPin,
  Heart,
  Star,
  Share2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { navigate } from '../utils/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  // Get the base path based on user role
  const basePath = (() => {
    if (!user) return '/';
    const roleMap = {
      'customer': '/customer',
      'vendor': '/vendor',
      'manager': '/manager',
      'coordinator': '/coordinator',
      'chief': '/chief'
    };
    return roleMap[user.role] || '/';
  })();

  // Define menu items based on user role
  const menuItems = user?.role === 'chief' ? [
    { icon: Home, label: 'Overview', path: `${basePath}/overview` },
    { icon: Users, label: 'Managers & Coordinators', path: `${basePath}/managers` },
    { icon: DollarSign, label: 'Payments', path: `${basePath}/payments` },
    { icon: Package, label: 'Products & Deals', path: `${basePath}/products` },
    { icon: Truck, label: 'Delivery Schedules', path: `${basePath}/delivery` },
    { icon: Star, label: 'Reviews', path: `${basePath}/reviews` },
    { icon: FileText, label: 'Blog Posts', path: `${basePath}/blog` },
    { icon: Image, label: 'Adverts', path: `${basePath}/adverts` },
    { icon: UserCheck, label: 'Vendor Assignment', path: `${basePath}/vendor-assignment` },
    { icon: Store, label: 'Vendor Management', path: `${basePath}/vendor-management` },
    { icon: Wallet, label: 'Peps Management', path: `${basePath}/peps` },
    { icon: MessageSquare, label: 'Messaging', path: `${basePath}/messaging` },
    { icon: PieChart, label: 'Analytics & Reports', path: `${basePath}/analytics` },
    { icon: Settings, label: 'System Settings', path: `${basePath}/settings` },
  ] : user?.role === 'coordinator' ? [
    { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
    { icon: Users, label: 'Managers', path: `${basePath}/managers` },
    { icon: DollarSign, label: 'Payments', path: `${basePath}/payments` },
    { icon: Package, label: 'Products & Deals', path: `${basePath}/products` },
    { icon: Truck, label: 'Delivery Schedules', path: `${basePath}/delivery` },
    { icon: Star, label: 'Reviews', path: `${basePath}/reviews` },
    { icon: Store, label: 'Vendors', path: `${basePath}/vendors` },
    { icon: MessageSquare, label: 'Messages', path: `${basePath}/messages` },
    { icon: BarChart, label: 'Analytics', path: `${basePath}/analytics` },
    { icon: Settings, label: 'Settings', path: `${basePath}/settings` },
  ] : user?.role === 'manager' ? [
    { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
    { icon: Store, label: 'My Vendors', path: `${basePath}/vendors` },
    { icon: DollarSign, label: 'Commissions', path: `${basePath}/commissions` },
    { icon: Wallet, label: 'PEPS', path: `${basePath}/peps` },
    { icon: MessageSquare, label: 'Messages', path: `${basePath}/messages` },
    { icon: Settings, label: 'Settings', path: `${basePath}/settings` },
  ] : user?.role === 'vendor' ? [
    { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
    { icon: Package, label: 'Products', path: `${basePath}/products` },
    { icon: ShoppingBag, label: 'Orders', path: `${basePath}/orders` },
    { icon: MessageSquare, label: 'Messages', path: `${basePath}/messages` },
    { icon: BarChart, label: 'Analytics', path: `${basePath}/analytics` },
    { icon: Settings, label: 'Settings', path: `${basePath}/settings` },
  ] : user?.role === 'customer' ? [
    { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
    { icon: ShoppingBag, label: 'My Orders', path: `${basePath}/orders` },
    { icon: MapPin, label: 'My Addresses', path: `${basePath}/addresses` },
    { icon: Heart, label: 'Favorite Vendors', path: `${basePath}/favorites` },
    { icon: Star, label: 'My Reviews', path: `${basePath}/reviews` },
    { icon: MessageSquare, label: 'Messages', path: `${basePath}/messages` },
    { icon: Share2, label: 'Referrals', path: `${basePath}/referrals` },
    { icon: Wallet, label: 'PEPS', path: `${basePath}/peps` },
    { icon: Settings, label: 'Settings', path: `${basePath}/settings` },
  ] : [
    { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="h-full flex flex-col">
          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="font-semibold text-gray-900">{user?.email}</div>
            <div className="text-sm text-gray-500 capitalize">{user?.role}</div>
            {user?.role === 'chief' && (
              <div className="mt-1 text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full inline-block">
                Administrator
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm ${
                      location.pathname === item.path
                        ? 'bg-yellow-50 text-yellow-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sign Out Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};