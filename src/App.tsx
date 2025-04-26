import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Components
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';

// Public Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import About from './pages/About';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import VendorTerms from './pages/VendorTerms';
import PublicProducts from './pages/PublicProducts';
import GroupBuyList from './pages/GroupBuyList';
import LeaderBoard from './pages/LeaderBoard';
import VendorShops from './pages/VendorShops';

// Role-Based Dashboards
import CustomerDashboard from './pages/dashboards/CustomerDashboard';
import VendorDashboard from './pages/dashboards/VendorDashboard';
import ManagerDashboard from './pages/dashboards/ManagerDashboard';
import CoordinatorDashboard from './pages/dashboards/CoordinatorDashboard';
import ChiefDashboard from './pages/dashboards/ChiefDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/vendor-terms" element={<VendorTerms />} />
            <Route path="/products" element={<PublicProducts />} />
            <Route path="/group-buys" element={<GroupBuyList />} />
            <Route path="/leaderboard" element={<LeaderBoard />} />
            <Route path="/vendors" element={<VendorShops />} />

            {/* Customer Dashboard */}
            <Route
              path="/customer/*"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Vendor Dashboard */}
            <Route
              path="/vendor/*"
              element={
                <ProtectedRoute allowedRoles={['vendor']}>
                  <VendorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Manager Dashboard */}
            <Route
              path="/manager/*"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Coordinator Dashboard */}
            <Route
              path="/coordinator/*"
              element={
                <ProtectedRoute allowedRoles={['coordinator']}>
                  <CoordinatorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Chief Dashboard */}
            <Route
              path="/chief/*"
              element={
                <ProtectedRoute allowedRoles={['chief']}>
                  <ChiefDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;