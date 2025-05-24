import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Info, Phone, HelpCircle, Tag, UserPlus, BookOpen, Menu, X } from 'lucide-react';

export const MainMenu = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-14">
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-yellow-400 focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
          
          {/* Desktop menu */}
          <div className="hidden md:flex justify-end space-x-6 w-full">
            <Link
              to="/about"
              className={`inline-flex items-center px-3 py-1 my-3 text-sm font-medium rounded-full transition-all duration-200 ${
                location.pathname === '/about' 
                  ? 'bg-white text-yellow-600 shadow-md' 
                  : 'text-white hover:bg-yellow-400 hover:text-white'
              }`}
            >
              <Info className="h-3.5 w-3.5 mr-1" />
              About Us
            </Link>
            <Link
              to="/products"
              className={`inline-flex items-center px-3 py-1 my-3 text-sm font-medium rounded-full transition-all duration-200 ${
                location.pathname === '/products' 
                  ? 'bg-white text-yellow-600 shadow-md' 
                  : 'text-white hover:bg-yellow-400 hover:text-white'
              }`}
            >
              <Tag className="h-3.5 w-3.5 mr-1" />
              Browse Deals
            </Link>
            <Link
              to="/blog"
              className={`inline-flex items-center px-3 py-1 my-3 text-sm font-medium rounded-full transition-all duration-200 ${
                location.pathname === '/blog' 
                  ? 'bg-white text-yellow-600 shadow-md' 
                  : 'text-white hover:bg-yellow-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              Blog
            </Link>
            <Link
              to="/auth/vendor"
              className={`inline-flex items-center px-3 py-1 my-3 text-sm font-medium rounded-full transition-all duration-200 ${
                location.pathname === '/auth/vendor' 
                  ? 'bg-white text-yellow-600 shadow-md' 
                  : 'text-white hover:bg-yellow-400 hover:text-white'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Become a Vendor
            </Link>
            <Link
              to="/faq"
              className={`inline-flex items-center px-3 py-1 my-3 text-sm font-medium rounded-full transition-all duration-200 ${
                location.pathname === '/faq' 
                  ? 'bg-white text-yellow-600 shadow-md' 
                  : 'text-white hover:bg-yellow-400 hover:text-white'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              FAQ
            </Link>
            <Link
              to="/contact"
              className={`inline-flex items-center px-3 py-1 my-3 text-sm font-medium rounded-full transition-all duration-200 ${
                location.pathname === '/contact' 
                  ? 'bg-white text-yellow-600 shadow-md' 
                  : 'text-white hover:bg-yellow-400 hover:text-white'
              }`}
            >
              <Phone className="h-3.5 w-3.5 mr-1" />
              Contact
            </Link>
          </div>
        </div>
        
        {/* Mobile menu, show/hide based on menu state */}
        {isMenuOpen && (
          <div className="md:hidden py-2 space-y-2 pb-3">
            <Link
              to="/about"
              className={`block px-4 py-2 text-base font-medium rounded-md ${
                location.pathname === '/about' 
                  ? 'bg-white text-yellow-600' 
                  : 'text-white hover:bg-yellow-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Info className="h-4 w-4 inline mr-2" />
              About Us
            </Link>
            <Link
              to="/products"
              className={`block px-4 py-2 text-base font-medium rounded-md ${
                location.pathname === '/products' 
                  ? 'bg-white text-yellow-600' 
                  : 'text-white hover:bg-yellow-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Tag className="h-4 w-4 inline mr-2" />
              Browse Deals
            </Link>
            <Link
              to="/blog"
              className={`block px-4 py-2 text-base font-medium rounded-md ${
                location.pathname === '/blog' 
                  ? 'bg-white text-yellow-600' 
                  : 'text-white hover:bg-yellow-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <BookOpen className="h-4 w-4 inline mr-2" />
              Blog
            </Link>
            <Link
              to="/auth/vendor"
              className={`block px-4 py-2 text-base font-medium rounded-md ${
                location.pathname === '/auth/vendor' 
                  ? 'bg-white text-yellow-600' 
                  : 'text-white hover:bg-yellow-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <UserPlus className="h-4 w-4 inline mr-2" />
              Become a Vendor
            </Link>
            <Link
              to="/faq"
              className={`block px-4 py-2 text-base font-medium rounded-md ${
                location.pathname === '/faq' 
                  ? 'bg-white text-yellow-600' 
                  : 'text-white hover:bg-yellow-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <HelpCircle className="h-4 w-4 inline mr-2" />
              FAQ
            </Link>
            <Link
              to="/contact"
              className={`block px-4 py-2 text-base font-medium rounded-md ${
                location.pathname === '/contact' 
                  ? 'bg-white text-yellow-600' 
                  : 'text-white hover:bg-yellow-400'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Phone className="h-4 w-4 inline mr-2" />
              Contact
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};