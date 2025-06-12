import React, { useState, useEffect } from 'react';
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
  Share2,
  Truck,
  Menu,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { navigate } from '../utils/navigation';
import { useMinimalAuth } from '../hooks/useMinimalAuth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { safeLoading } = useMinimalAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if screen is mobile on initial render and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  // Early return if auth is still loading
  if (safeLoading) {
    return null;
  }

  // Early return if no user after loading
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Session Expired</h2>
          <p className="text-gray-600 mb-6">
            Your session has expired or you're not authenticated. Please sign in again.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // Get the base path based on user role (lowercase for consistency)
  const basePath = (() => {
    const role = user.role?.toLowerCase() || '';
    const roleMap = {
      'customer': '/customer',
      'vendor': '/vendor',
      'manager': '/manager',
      'coordinator': '/coordinator',
      'chief': '/chief'
    };
    return roleMap[role] || '/';
  })();

  // Define menu items based on user role (lowercase comparison)
  const menuItems = (() => {
    const role = user.role?.toLowerCase() || '';
    
    if (role === 'chief') return [
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
       { icon: MessageSquare, label: 'Chief Inbox', path: `${basePath}/chiefinbox` },
      { icon: PieChart, label: 'Analytics & Reports', path: `${basePath}/analytics` },
      { icon: Settings, label: 'System Settings', path: `${basePath}/settings` },
    ];
    
    if (role === 'coordinator') return [
      { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
      { icon: Users, label: 'Managers', path: `${basePath}/managers` },
      { icon: DollarSign, label: 'Payments', path: `${basePath}/payments` },
      { icon: Package, label: 'Products & Deals', path: `${basePath}/products` },
      { icon: Truck, label: 'Delivery Schedules', path: `${basePath}/delivery` },
      { icon: Star, label: 'Reviews', path: `${basePath}/reviews` },
      { icon: Store, label: 'Vendors', path: `${basePath}/vendors` },
      { icon: MessageSquare, label: 'Messages', path: `${basePath}/messages` },
       { icon: MessageSquare, label: 'Coord Inbox', path: `${basePath}/coordinatorinbox` },
      { icon: BarChart, label: 'Analytics', path: `${basePath}/analytics` },
      { icon: Settings, label: 'Settings', path: `${basePath}/settings` },
    ];
    
    if (role === 'manager') return [
      { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
      { icon: Store, label: 'My Vendors', path: `${basePath}/vendors` },
      { icon: DollarSign, label: 'Commissions', path: `${basePath}/commissions` },
      { icon: Wallet, label: 'PEPS', path: `${basePath}/peps` },
      { icon: MessageSquare, label: 'Messages', path: `${basePath}/messages` },
      { icon: Settings, label: 'Settings', path: `${basePath}/settings` },
    ];
    
    if (role === 'vendor') return [
      { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
      { icon: Package, label: 'Products', path: `${basePath}/products` },
      { icon: ShoppingBag, label: 'Orders', path: `${basePath}/orders` },
      { icon: DollarSign, label: 'Payments', path: `${basePath}/payments` },
      { icon: Truck, label: 'Delivery', path: `${basePath}/delivery` },
      { icon: Star, label: 'Reviews', path: `${basePath}/reviews` },
      { icon: Wallet, label: 'PEPS', path: `${basePath}/peps` },
      { icon: MessageSquare, label: 'Messages', path: `${basePath}/messages` },
      { icon: BarChart, label: 'Analytics', path: `${basePath}/analytics` },
      { icon: Settings, label: 'Settings', path: `${basePath}/settings` },
    ];
    
    if (role === 'customer') return [
      { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
      { icon: ShoppingBag, label: 'My Orders', path: `${basePath}/orders` },
      { icon: MapPin, label: 'My Addresses', path: `${basePath}/addresses` },
      { icon: Heart, label: 'Favorite Vendors', path: `${basePath}/favorites` },
      { icon: Star, label: 'My Reviews', path: `${basePath}/reviews` },
      { icon: MessageSquare, label: 'Messages', path: `${basePath}/messages` },
      { icon: Share2, label: 'Referrals', path: `${basePath}/referrals` },
      { icon: Wallet, label: 'PEPS', path: `${basePath}/peps` },
      { icon: Settings, label: 'Settings', path: `${basePath}/settings` },
    ];
    
    return [
      { icon: Home, label: 'Dashboard', path: `${basePath}/dashboard` },
    ];
  })();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Overlay for Mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed md:relative z-50 h-full transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white shadow-lg`}
      >
        <div className="h-full flex flex-col">
          {/* Toggle Button (Desktop) */}
          {!isMobile && (
            <button 
              onClick={toggleSidebar}
              className="absolute -right-3 top-20 bg-white rounded-full p-1 shadow-md border border-gray-200"
            >
              {isSidebarOpen ? (
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className={`${isSidebarOpen ? 'text-left' : 'text-center'}`}>
              <div className={`font-semibold text-gray-900 ${isSidebarOpen ? '' : 'text-xs'} truncate`}>
                {isSidebarOpen ? user?.email : user?.email?.charAt(0)}
              </div>
              <div className={`text-sm text-gray-500 capitalize ${isSidebarOpen ? '' : 'hidden'}`}>
                {user?.role}
              </div>
              {user?.role?.toLowerCase() === 'chief' && isSidebarOpen && (
                <div className="mt-1 text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full inline-block">
                  Administrator
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md text-sm ${
                      location.pathname === item.path
                        ? 'bg-yellow-50 text-yellow-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => isMobile && setIsSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className={`${isSidebarOpen ? '' : 'hidden'}`}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sign Out Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className={`flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg ${
                isSidebarOpen ? '' : 'justify-center'
              }`}
            >
              <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className={`${isSidebarOpen ? '' : 'hidden'}`}>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full">
        {/* Mobile Hamburger Menu Button - Positioned above content */}
        {isMobile && (
          <div className="sticky top-0 z-30 bg-gray-50 pt-4 pl-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg bg-white shadow-lg text-gray-700 hover:bg-gray-100
                        border border-gray-200 transition-all duration-200 hover:shadow-md
                        focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
            >
              {isSidebarOpen ? (
                <X className="h-6 w-6 text-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" />
              )}
            </button>
          </div>
        )}

        <div className="p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};