'use client';

import { useAuth } from '../lib/auth';
import Sidebar from './Sidebar';

export default function ClientLayout({ children }) {
  const { usuario } = useAuth();
  const isAuthenticated = !!usuario;

  if (!isAuthenticated) {
    // Para páginas no autenticadas (login/registro), renderizar directamente sin contenedores
    return children;
  }

  // Para páginas autenticadas, usar el layout con sidebar y container
  return (
    <div className="d-flex">
      <Sidebar />
      <main className="flex-grow-1 p-3 p-md-4 animate-fade-in">
        <div className="container-fluid bg-white bg-opacity-95 rounded-4 shadow-lg p-3 p-md-4 min-vh-100">
          {children}
        </div>
      </main>
    </div>
  );
}