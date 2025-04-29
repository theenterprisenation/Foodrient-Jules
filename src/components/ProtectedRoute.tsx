import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasRole } from '../utils/auth-helpers';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();
  const [hasAccess, setHasAccess] = React.useState<boolean | null>(null);
  const [accessChecked, setAccessChecked] = React.useState(false);

  React.useEffect(() => {
    const checkAccess = async () => {
      if (user) {
        const access = await hasRole(allowedRoles);
        setHasAccess(access);
      }
      setAccessChecked(true);
    };

    checkAccess();
  }, [user, allowedRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but preserve the intended destination
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (accessChecked && !hasAccess) {
    // User is logged in but doesn't have the right role
    // Redirect to home or a "not authorized" page
    return <Navigate to="/" replace />;
  }

  return accessChecked ? <>{children}</> : null;
};

export default ProtectedRoute;