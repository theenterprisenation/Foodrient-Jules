import React from 'react';
import { ShoppingCart, Package, Edit, Trash2 } from 'lucide-react';
import type { FeaturedDeal } from '../store/featuredDealsStore';
import { useAuthStore } from '../store/authStore';

interface FeaturedDealCardProps {
  deal: FeaturedDeal;
  onEdit?: (deal: FeaturedDeal) => void;
  onDelete?: (id: string) => void;
}

export const FeaturedDealCard: React.FC<FeaturedDealCardProps> = ({ deal, onEdit, onDelete }) => {
  const { user } = useAuthStore();
  const userRole = user?.role;
  const isAdmin = userRole === 'administrator' || userRole === 'supervisor';

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="relative">
        <img
          src={deal.image_url}
          alt={deal.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-sm">
          Special Deal
        </div>
        {isAdmin && (
          <div className="absolute top-2 left-2 flex gap-2">
            <button
              onClick={() => onEdit?.(deal)}
              className="p-1 bg-white rounded-full text-green-600 hover:text-green-700 shadow-sm"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete?.(deal.id)}
              className="p-1 bg-white rounded-full text-red-600 hover:text-red-700 shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900">{deal.name}</h3>
        <div className="mt-2 flex items-baseline">
          <span className="text-xl font-bold text-yellow-600">₦{deal.base_price}</span>
          <span className="ml-2 text-sm text-gray-500">per {deal.unit}</span>
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <Package className="h-4 w-4 mr-1" />
          <span>Options: {deal.options}</span>
        </div>
        <button className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to cart
        </button>
      </div>
    </div>
  );
};