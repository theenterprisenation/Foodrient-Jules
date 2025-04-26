import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Package, 
  ShoppingBag, 
  Users, 
  BarChart, 
  LogOut,
  Home
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getBasePath = () => {
    switch (user?.role) {
      case 'customer': return '/customer';
      case 'vendor': return '/vendor';
      case 'manager': return '/manager';
      case 'coordinator': return '/coordinator';
      case 'chief': return '/chief';
      default: return '/';
    }
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: `${getBasePath()}/dashboard` },
    { icon: MessageSquare, label: 'Messages', path: `${getBasePath()}/messages` },
    { icon: Package, label: 'Products', path: `${getBasePath()}/products` },
    { icon: ShoppingBag, label: 'Orders', path: `${getBasePath()}/orders` },
    { icon: Users, label: 'Customers', path: `${getBasePath()}/customers` },
    { icon: BarChart, label: 'Analytics', path: `${getBasePath()}/analytics` },
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