import { useNavigate as useReactNavigate } from 'react-router-dom';

// This is a singleton pattern to make navigation available outside of React components
let navigateFunction: ((to: string, options?: { replace?: boolean }) => void) = () => {
  console.warn('Navigation function not set. Make sure to use NavigationProvider.');
};

export const setNavigate = (navigate: (to: string, options?: { replace?: boolean }) => void) => {
  navigateFunction = navigate;
};

export const navigate = (to: string, options?: { replace?: boolean }) => {
  // Prevent navigation to the same route to avoid loops
  if (window.location.pathname === to) {
    console.log('Already on this route, skipping navigation');
    return;
  }
  
  navigateFunction(to, options);
};

// Hook to use in components
export const useNavigate = () => {
  const navigate = useReactNavigate();
  setNavigate(navigate);
  return navigate;
};