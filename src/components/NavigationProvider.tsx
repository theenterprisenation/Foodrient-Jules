import React, { useEffect } from 'react';
import { useNavigate as useReactNavigate } from 'react-router-dom';
import { setNavigate } from '../utils/navigation';

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const navigate = useReactNavigate();
  
  useEffect(() => {
    // Set the navigation function once on mount
    setNavigate(navigate);
    
    // Clean up on unmount
    return () => setNavigate(() => {
      console.warn('Navigation is no longer available');
    });
  }, [navigate]);
  
  return <>{children}</>;
};