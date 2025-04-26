import React from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import type { Product } from '../types';
import { useCartStore } from '../store/cartStore';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCartStore();

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.base_price,
      quantity: product.min_quantity,
      unit: product.unit,
      image: product.image_url,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      {product.image_url && (
        <div className="relative h-48">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {product.has_price_tiers && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Group Buy Available
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            {product.category}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{product.description}</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-500">
            <Package className="h-4 w-4 mr-2" />
            Available: {product.available_quantity} {product.unit}
          </div>
          <div className="text-sm text-gray-500">
            Min Order: {product.min_quantity} {product.unit}
          </div>
        </div>
        <div className="mt-4">
          <div className="text-xl font-bold text-yellow-600">
            ₦{product.base_price.toLocaleString()}/{product.unit}
          </div>
        </div>
        <button
          onClick={handleAddToCart}
          className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </button>
      </div>
    </div>
  );
};