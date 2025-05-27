import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Menu, 
  X,
  MessageSquare,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart,
  LogOut,
  User,
  Search
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { items, total } = useCartStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const menuItems = user ? [
    { icon: LayoutDashboard, label: 'Dashboard', path: `${getBasePath()}/dashboard` },
    { icon: MessageSquare, label: 'Messages', path: `${getBasePath()}/messages` },
   /* { icon: Package, label: 'Products', path: `${getBasePath()}/products` }, */
   { icon: ShoppingCart, label: 'Orders', path: `${getBasePath()}/orders` }
   /* { icon: Users, label: 'Customers', path: `${getBasePath()}/customers` }, */
   /* { icon: BarChart, label: 'Analytics', path: `${getBasePath()}/analytics` } */
  ] : [];
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
    setIsMenuOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Primary Navigation */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-yellow-500" />
              <span className="ml-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-yellow-600">Foodrient</span>
            </Link>
            
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              <div className="relative">
                <form onSubmit={handleSearch} className="flex">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10 pr-4 py-1 border border-gray-300 rounded-full focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                  <button
                    type="submit"
                    className="absolute right-2 top-1 px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full hover:bg-yellow-600"
                  >
                    Search
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {!user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/cart"
                  className="text-neutral-700 hover:text-yellow-500 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <div className="relative">
                    <ShoppingCart className="h-6 w-6" />
                    {items.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        {items.length}
                      </span>
                    )}
                  </div>
                  <span className="ml-2">₦{total().toLocaleString()}</span>
                </Link>
                <Link
                  to="/auth"
                  className="flex items-center bg-yellow-500 text-white px-4 py-2 rounded-full hover:bg-yellow-600 transition-colors"
                >
                  <User className="h-4 w-4 mr-1" />
                  <span className="text-sm">Sign In / Sign Up</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/cart"
                  className="text-neutral-700 hover:text-yellow-500 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <div className="relative">
                    <ShoppingCart className="h-6 w-6" />
                    {items.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        {items.length}
                      </span>
                    )}
                  </div>
                  <span className="ml-2">₦{total().toLocaleString()}</span>
                </Link>
                {/* Menu Button */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center text-gray-700 hover:text-yellow-500 focus:outline-none"
                  >
                    {isMenuOpen ? (
                      <X className="h-6 w-6" />
                    ) : (
                      <Menu className="h-6 w-6" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50">
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                            <span className="text-yellow-800 font-medium">
                              {user.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-700">{user.email}</p>
                            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Menu Items */}
                     <Link
                       to="/cart"
                       className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50"
                       onClick={() => setIsMenuOpen(false)}
                     >
                       <ShoppingCart className="h-5 w-5 mr-3" />
                       Cart
                     </Link>
                      {menuItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.label}
                        </Link>
                      ))}
                      
                      {/* Sign Out Button */}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;