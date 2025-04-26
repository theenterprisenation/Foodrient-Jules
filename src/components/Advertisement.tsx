import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { Advertisement as AdvertisementType } from '../store/advertisementStore';

interface AdvertisementProps {
  ad: AdvertisementType;
  className?: string;
}

export const Advertisement: React.FC<AdvertisementProps> = ({ ad, className = '' }) => {
  return (
    <a
      href={ad.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block relative overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      <img
        src={ad.image_url}
        alt={ad.title}
        className="w-full h-40 object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
        <div className="flex items-center justify-between w-full text-white">
          <span className="font-medium">{ad.title}</span>
          <ExternalLink className="h-5 w-5" />
        </div>
      </div>
    </a>
  );
};