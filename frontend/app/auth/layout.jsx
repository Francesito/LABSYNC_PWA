'use client';
import { AuthProvider, useAuth } from '../../lib/auth';
import Sidebar from '../../components/Sidebar';
import { useState } from 'react';

function AuthenticatedLayout({ children }) {
  const { usuario } = useAuth();
  const isAuthenticated = !!usuario;
   const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="d-flex">
          {isAuthenticated && (
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      )}
      <main
        className="flex-grow-1 p-3 p-md-4 animate-fade-in transition-all duration-300"
        style={{ marginLeft: isAuthenticated && isSidebarOpen ? '16rem' : '0' }}
      >
        <div className="container-fluid bg-white bg-opacity-95 rounded-4 shadow-lg p-3 p-md-4 min-vh-100">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <AuthProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthProvider>
  );
}
