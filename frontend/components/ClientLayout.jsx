'use client';

import { useAuth } from '../lib/auth';
import Sidebar from './Sidebar';
import { useState } from 'react';

export default function ClientLayout({ children }) {
  const { usuario } = useAuth();
  const isAuthenticated = !!usuario;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!isAuthenticated) {
    // Para páginas no autenticadas (login/registro), renderizar directamente sin contenedores
    return children;
  }

  // Para páginas autenticadas, usar el layout con sidebar y container
  return (
    <div className="d-flex">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main
        className="flex-grow-1 p-3 p-md-4 animate-fade-in transition-all duration-300"
        style={{ marginLeft: isSidebarOpen ? '16rem' : '0' }}
      >
        <div className="container-fluid bg-white bg-opacity-95 rounded-4 shadow-lg p-3 p-md-4 min-vh-100">
          {children}
        </div>
      </main>
    </div>
  );
}
