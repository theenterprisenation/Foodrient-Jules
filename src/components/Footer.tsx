import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, ShoppingBag, UserPlus } from 'lucide-react';

export const Footer = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Platform Pitch */}
          <div>
            <div className="flex items-center mb-4">
              <ShoppingBag className="h-8 w-8 text-yellow-500" />
              <span className="ml-2 text-2xl font-bold text-white">Foodrient</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Join Nigeria's first group food buying platform. Save money, reduce waste, and enjoy quality groceries through the power of collective purchasing.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => handleNavigation('/about')} className="text-gray-400 hover:text-white transition-colors">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/faq')} className="text-gray-400 hover:text-white transition-colors">
                  FAQ
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/contact')} className="text-gray-400 hover:text-white transition-colors">
                  Contact Us
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/blog')} className="text-gray-400 hover:text-white transition-colors">
                  Blog
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/vendor-signup')} className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Become a Vendor
                </button>
              </li>
            </ul>
          </div>

          {/* Service Conditions */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => handleNavigation('/privacy-policy')} className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/terms')} className="text-gray-400 hover:text-white transition-colors">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/vendor-terms')} className="text-gray-400 hover:text-white transition-colors">
                  Vendor Terms
                </button>
              </li>
            </ul>
          </div>

          {/* Browse Deals */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Browse</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => handleNavigation('/products')} className="text-gray-400 hover:text-white transition-colors">
                  All Products
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/group-buys')} className="text-gray-400 hover:text-white transition-colors">
                  Group Buys
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/leaderboard')} className="text-gray-400 hover:text-white transition-colors">
                  Leaders Board
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigation('/vendors')} className="text-gray-400 hover:text-white transition-colors">
                  Vendor Shops
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-sm text-gray-400 text-center">
            © {new Date().getFullYear()} Foodrient. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};