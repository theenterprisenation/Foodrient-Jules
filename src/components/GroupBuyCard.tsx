import React from 'react';
import { format } from 'date-fns';
import { Users, Clock, ShoppingBag, TrendingUp } from 'lucide-react';
import type { GroupBuy } from '../types';
import { useAuthStore } from '../store/authStore';
import { useGroupBuyStore } from '../store/groupBuyStore';

interface GroupBuyCardProps {
  groupBuy: GroupBuy;
}

export const GroupBuyCard: React.FC<GroupBuyCardProps> = ({ groupBuy }) => {
  const { user } = useAuthStore();
  const { joinGroupBuy } = useGroupBuyStore();
  const [quantity, setQuantity] = React.useState(groupBuy.product?.min_quantity || 1);

  const progress = (groupBuy.current_participants / groupBuy.min_participants) * 100;
  const remainingSpots = groupBuy.max_participants ? 
    groupBuy.max_participants - groupBuy.current_participants : 
    'Unlimited';
  const daysLeft = Math.ceil((new Date(groupBuy.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  // Calculate current tier price
  const getCurrentTierPrice = () => {
    if (!groupBuy.price_tiers) return groupBuy.product?.base_price;
    
    const tiers = JSON.parse(groupBuy.price_tiers as string);
    const currentParticipants = groupBuy.current_participants;
    
    const applicableTier = tiers
      .sort((a: any, b: any) => b.participants - a.participants)
      .find((tier: any) => currentParticipants >= tier.participants);
    
    return applicableTier ? applicableTier.price : groupBuy.product?.base_price;
  };

  const currentPrice = getCurrentTierPrice();
  const savings = groupBuy.product ? 
    ((groupBuy.product.base_price - currentPrice) / groupBuy.product.base_price) * 100 : 
    0;

  const handleJoin = async () => {
    if (!user) return;
    try {
      await joinGroupBuy(groupBuy.id, quantity);
    } catch (error) {
      console.error('Failed to join group buy:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative">
        <img
          src={groupBuy.product?.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e'}
          alt={groupBuy.product?.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">
          {groupBuy.status}
        </div>
        {savings > 0 && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" />
            {Math.round(savings)}% Off
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900">{groupBuy.product?.name}</h3>
        <p className="mt-2 text-gray-600">{groupBuy.product?.description}</p>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <Users className="h-5 w-5 mr-2" />
              <span>{groupBuy.current_participants} joined</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Clock className="h-5 w-5 mr-2" />
              <span>{daysLeft} days left</span>
            </div>
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">
                  Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-yellow-600">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-yellow-200">
              <div
                style={{ width: `${progress}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-500"
              ></div>
            </div>
          </div>

          {/* Price Tiers */}
          {groupBuy.price_tiers && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Price Tiers</h4>
              <div className="space-y-2">
                {JSON.parse(groupBuy.price_tiers as string).map((tier: any, index: number) => (
                  <div
                    key={index}
                    className={`flex justify-between text-sm ${
                      groupBuy.current_participants >= tier.participants
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    <span>{tier.participants}+ participants</span>
                    <span>₦{tier.price}/{groupBuy.product?.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ₦{currentPrice}/{groupBuy.product?.unit}
              </div>
              {savings > 0 && (
                <div className="text-sm text-green-600">
                  Save {Math.round(savings)}% off retail
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {typeof remainingSpots === 'number' ? 
                `${remainingSpots} spots left` : 
                'Unlimited spots'
              }
            </div>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min={groupBuy.product?.min_quantity}
                max={groupBuy.product?.max_quantity || undefined}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
              />
              <button
                onClick={handleJoin}
                className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center justify-center"
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Join Group Buy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};