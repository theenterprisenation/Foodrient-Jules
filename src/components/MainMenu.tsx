import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Info, Phone, HelpCircle, Tag, UserPlus, BookOpen } from 'lucide-react';

export const MainMenu = () => {
  const location = useLocation();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end space-x-6 h-12">
          <Link
            to="/about"
            className={`inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 ${
              location.pathname === '/about' ? 'border-yellow-500' : 'border-transparent hover:border-yellow-500'
            }`}
          >
            <Info className="h-3.5 w-3.5 mr-1" />
            About Us
          </Link>
          <Link
            to="/products"
            className={`inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 ${
              location.pathname === '/products' ? 'border-yellow-500' : 'border-transparent hover:border-yellow-500'
            }`}
          >
            <Tag className="h-3.5 w-3.5 mr-1" />
            Browse Deals
          </Link>
          <Link
            to="/blog"
            className={`inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 ${
              location.pathname === '/blog' ? 'border-yellow-500' : 'border-transparent hover:border-yellow-500'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            Blog
          </Link>
          <Link
            to="/faq"
            className={`inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 ${
              location.pathname === '/faq' ? 'border-yellow-500' : 'border-transparent hover:border-yellow-500'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1" />
            FAQ
          </Link>
          <Link
            to="/contact"
            className={`inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 ${
              location.pathname === '/contact' ? 'border-yellow-500' : 'border-transparent hover:border-yellow-500'
            }`}
          >
            <Phone className="h-3.5 w-3.5 mr-1" />
            Contact
          </Link>
          <Link
            to="/vendor-signup"
            className={`inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 ${
              location.pathname === '/vendor-signup' ? 'border-yellow-500' : 'border-transparent hover:border-yellow-500'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Vendor Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};