//frontend/components/ClientLayout.jsx
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
    <>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main
        className={`transition-all duration-300 p-3 md:p-4 animate-fade-in ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
        style={{ width: isSidebarOpen ? 'calc(100% - 16rem)' : '100%' }}
      >
        <div className="container-fluid bg-white bg-opacity-95 rounded-4 shadow-lg p-3 md:p-4 min-vh-100">
          {children}
        </div>
      </main>
    </>
  );
}
