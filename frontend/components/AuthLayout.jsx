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
  <>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main
        className={`flex-grow-1 p-3 md:p-4 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : ''
        }`}
      >
        <div className="container-fluid bg-white bg-opacity-95 rounded-4 shadow-lg p-3 md:p-4 min-vh-100">
          {children}
        </div>
      </main>
     </>
  );
}

export default function AuthLayout({ children }) {
  return (
    <AuthProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthProvider>
  );
}
