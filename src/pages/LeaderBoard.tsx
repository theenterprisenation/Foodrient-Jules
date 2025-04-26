import React, { useEffect, useState } from 'react';
import { Trophy, Users, ShoppingBag, Star, Medal, Crown } from 'lucide-react';
import { MainMenu } from '../components/MainMenu';
import { supabase } from '../lib/supabase';

interface LeaderStats {
  id: string;
  full_name: string;
  points_balance: number;
  referral_count: number;
  total_orders: number;
}

const LeaderBoard = () => {
  const [topReferrers, setTopReferrers] = useState<LeaderStats[]>([]);
  const [topBuyers, setTopBuyers] = useState<LeaderStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'referrals' | 'orders'>('referrals');

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch top referrers - using the correct foreign key relationship
      const { data: referrers, error: referrersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          points_balance,
          referral_count:referrals!referrals_referrer_id_fkey(count)
        `)
        .order('points_balance', { ascending: false })
        .limit(10);

      if (referrersError) throw referrersError;

      // Fetch top buyers - using bulk_orders as suggested by the error
      const { data: buyers, error: buyersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          total_orders:bulk_orders(count)
        `)
        .order('total_orders', { ascending: false })
        .limit(10);

      if (buyersError) throw buyersError;

      setTopReferrers(referrers || []);
      setTopBuyers(buyers || []);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLeaderCard = (rank: number, data: any, type: 'referrals' | 'orders') => {
    const getMetrics = () => {
      switch (type) {
        case 'referrals':
          return {
            value: data.points_balance?.toLocaleString() || '0',
            label: 'PEPS',
            subValue: `${data.referral_count || 0} referrals`
          };
        case 'orders':
          return {
            value: data.total_orders || 0,
            label: 'Orders',
            subValue: 'Completed orders'
          };
      }
    };

    const metrics = getMetrics();
    const isTopThree = rank <= 3;

    return (
      <div className={`transform transition-all duration-300 hover:scale-105 ${
        isTopThree ? 'bg-gradient-to-br' : 'bg-white'
      } ${
        rank === 1 ? 'from-yellow-400 to-yellow-600' :
        rank === 2 ? 'from-gray-300 to-gray-500' :
        rank === 3 ? 'from-amber-600 to-amber-800' :
        ''
      } rounded-lg shadow-lg p-6 relative overflow-hidden`}>
        {/* Rank Badge */}
        <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center ${
          rank === 1 ? 'bg-yellow-500' :
          rank === 2 ? 'bg-gray-400' :
          rank === 3 ? 'bg-amber-700' :
          'bg-gray-200'
        } ${isTopThree ? 'text-white' : 'text-gray-600'}`}>
          {rank === 1 && <Crown className="h-5 w-5" />}
          {rank === 2 && <Medal className="h-5 w-5" />}
          {rank === 3 && <Trophy className="h-5 w-5" />}
          {rank > 3 && <span className="font-bold">{rank}</span>}
        </div>

        {/* User Info */}
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 flex items-center justify-center">
            <span className="text-2xl font-bold text-yellow-800">
              {data.full_name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <h3 className={`font-bold ${isTopThree ? 'text-white' : 'text-gray-900'}`}>
              {data.full_name || 'Anonymous User'}
            </h3>
            <p className={`text-sm ${isTopThree ? 'text-white/80' : 'text-gray-500'}`}>
              {metrics.subValue}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-4">
          <div className={`text-2xl font-bold ${isTopThree ? 'text-white' : 'text-gray-900'}`}>
            {metrics.value}
          </div>
          <div className={`text-sm ${isTopThree ? 'text-white/80' : 'text-gray-500'}`}>
            {metrics.label}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-yellow-50">
      <MainMenu />
      
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                Foodrient Leaders
              </span>
            </h1>
            <p className="mt-4 text-xl text-gray-600">
              Celebrating our top performers and community champions
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg shadow-sm p-1">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('referrals')}
                  className={`flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                    activeTab === 'referrals'
                      ? 'bg-yellow-500 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Users className="h-5 w-5 mr-2" />
                  Top Referrers
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
                    activeTab === 'orders'
                      ? 'bg-yellow-500 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Top Buyers
                </button>
              </div>
            </div>
          </div>

          {/* Leaderboard Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeTab === 'referrals' ? topReferrers : topBuyers)
                .map((user, index) => (
                  renderLeaderCard(index + 1, user, activeTab)
                ))}
            </div>
          )}

          {/* Achievement Badges */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Achievement Badges
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Crown, name: 'Elite Referrer', description: 'Top 1% of referrers', color: 'bg-yellow-500' },
                { icon: Star, name: 'Power Buyer', description: '100+ orders completed', color: 'bg-blue-500' },
                { icon: Trophy, name: 'Community Champion', description: '50+ successful referrals', color: 'bg-green-500' },
                { icon: Medal, name: 'Early Adopter', description: 'Joined in first month', color: 'bg-purple-500' }
              ].map((badge) => (
                <div key={badge.name} className="bg-white rounded-lg shadow-lg p-6 text-center transform transition-transform hover:scale-105">
                  <div className={`w-16 h-16 mx-auto rounded-full ${badge.color} flex items-center justify-center mb-4`}>
                    <badge.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">{badge.name}</h3>
                  <p className="text-sm text-gray-500 mt-2">{badge.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderBoard;