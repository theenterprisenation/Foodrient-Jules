import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NavigationProvider } from './components/NavigationProvider';
import { AuthProvider } from './components/AuthProvider';
import { useAuth } from './components/AuthProvider'
import { AppRouter } from './components/AppRouter';
import ErrorBoundary from './components/ErrorBoundary';

// Components
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <NavigationProvider>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <Navbar />
              <main className="flex-grow">
                <AppRouter />
              </main>
              <Footer />
            </div>
          </AuthProvider>
        </NavigationProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;