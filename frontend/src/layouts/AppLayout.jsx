import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../context/AuthContext';

export const AppLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-small text-txt-muted">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
