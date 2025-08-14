//frontend/components/AuthLayout.js
'use client';
import { AuthProvider, useAuth } from '../lib/auth';
import Sidebar from './Sidebar';
import { useState } from 'react';

function AuthenticatedLayout({ children }) {
  const { usuario } = useAuth();
  const isAuthenticated = !!usuario;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!isAuthenticated) {
    // Para páginas no autenticadas (login/registro), renderizar directamente sin contenedores
    return children;
  }

  // Para páginas autenticadas, usar el layout con sidebar
  return (
   <div className={`flex ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
  <main className="flex-1 w-full overflow-x-hidden p-3 md:p-4 transition-all duration-300">
        <div className="container-fluid bg-white bg-opacity-95 rounded-4 shadow-lg p-3 md:p-4 min-vh-100">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AuthLayout({ children }) {
  return (
    <AuthProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthProvider>
  );
}
