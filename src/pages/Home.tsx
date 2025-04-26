import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ChevronDown, Store, TrendingUp, Package, Users, Clock, Info, Phone, HelpCircle, Tag, UserPlus } from 'lucide-react';
import { useGroupBuyStore } from '../store/groupBuyStore';
import { useFeaturedDealsStore } from '../store/featuredDealsStore';
import { GroupBuyCard } from '../components/GroupBuyCard';
import { FeaturedDealCard } from '../components/FeaturedDealCard';
import { HeroHeader } from '../components/HeroHeader';

const Home = () => {
  const { groupBuys, isLoading: groupBuysLoading, error: groupBuysError, fetchGroupBuys } = useGroupBuyStore();
  const { 
    deals, 
    isLoading: dealsLoading, 
    error: dealsError, 
    fetchDeals,
    updateDeal,
    deleteDeal 
  } = useFeaturedDealsStore();

  useEffect(() => {
    fetchGroupBuys();
    fetchDeals();
  }, [fetchGroupBuys, fetchDeals]);

  const handleEditDeal = async (deal: any) => {
    console.log('Edit deal:', deal);
  };

  const handleDeleteDeal = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      await deleteDeal(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Menu */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end space-x-6 h-12">
            <Link
              to="/about"
              className="inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 border-transparent hover:border-yellow-500"
            >
              <Info className="h-3.5 w-3.5 mr-1" />
              About Us
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 border-transparent hover:border-yellow-500"
            >
              <Tag className="h-3.5 w-3.5 mr-1" />
              Browse Deals
            </Link>
            <Link
              to="/faq"
              className="inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 border-transparent hover:border-yellow-500"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              FAQ
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 border-transparent hover:border-yellow-500"
            >
              <Phone className="h-3.5 w-3.5 mr-1" />
              Contact
            </Link>
            <Link
              to="/vendor-signup"
              className="inline-flex items-center px-1 text-xs font-medium text-gray-900 border-b-2 border-transparent hover:border-yellow-500"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Vendor Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <HeroHeader />

      {/* Featured Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Store className="h-6 w-6 text-yellow-500 mr-2" />
            Featured Deals
          </h2>
          <div className="flex items-center space-x-4">
            <button className="inline-flex items-center px-4 py-2 border border-yellow-200 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-white hover:bg-yellow-50">
              Filter
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-yellow-200 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-white hover:bg-yellow-50">
              Sort by
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {dealsLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : dealsError ? (
            <div className="col-span-full text-center text-red-600 py-12">
              {dealsError}
            </div>
          ) : deals.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-12">
              No featured deals available at the moment.
            </div>
          ) : (
            deals.map((deal) => (
              <FeaturedDealCard
                key={deal.id}
                deal={deal}
                onEdit={handleEditDeal}
                onDelete={handleDeleteDeal}
              />
            ))
          )}
        </div>
      </div>

      {/* Promotional Banner */}
      <div id="how-it-works" className="bg-yellow-50 border-y border-yellow-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-yellow-800">Save More with Group Buying</h2>
            <p className="mt-4 text-lg text-yellow-700">
              Join forces with other buyers to unlock wholesale prices. The more people join, the lower the price gets!
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-red-500">30%</div>
                <div className="mt-2 text-gray-600">Average Savings</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-green-500">1000+</div>
                <div className="mt-2 text-gray-600">Active Members</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-yellow-500">100%</div>
                <div className="mt-2 text-gray-600">Quality Guaranteed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Group Buys */}
      <div id="featured-deals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Active Group Buys</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {groupBuysLoading ? (
            <div className="col-span-full flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : groupBuysError ? (
            <div className="col-span-full text-center text-red-600">
              {groupBuysError}
            </div>
          ) : groupBuys.length === 0 ? (
            <div className="col-span-full text-center text-gray-500">
              No active group buys at the moment. Check back soon!
            </div>
          ) : (
            groupBuys.map((groupBuy) => (
              <GroupBuyCard key={groupBuy.id} groupBuy={groupBuy} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;