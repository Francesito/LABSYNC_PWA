

// File: frontend/lib/auth.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import jwtDecode from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        const decoded = jwtDecode(token);

        // Convertir rol_id a texto si es necesario
        let rolNombre = decoded.rol || decoded.rol_id;
        if (typeof rolNombre === 'number') {
          switch (rolNombre) {
            case 1:
              rolNombre = 'alumno';
              break;
            case 2:
              rolNombre = 'docente';
              break;
            case 3:
              rolNombre = 'almacen';
              break;
            default:
              rolNombre = 'desconocido';
          }
        }

        setUsuario({
          id: decoded.id,
          nombre: decoded.nombre,
          correo: decoded.correo_institucional || decoded.correo,
          rol: rolNombre,
        });

        // Redirecciones por rol
      if (pathname === '/login' || pathname === '/register') {
  router.push('/catalog');
} else if (pathname.startsWith('/reset-password') || pathname === '/forgot-password' || pathname.startsWith('/verificar')) {
  // No redirigir estas páginas públicas
  return;
} else if (rolNombre === 'docente' && pathname === '/chat') {
  router.push('/catalog');
} else if (
  (rolNombre === 'alumno' || rolNombre === 'almacen') &&
  pathname === '/solicitudes/pendientes'
) {
  router.push('/solicitudes');
}
      } catch (error) {
        console.error('Error decodificando token:', error);
        localStorage.removeItem('token');
        setUsuario(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
   } else if (!['/login', '/register', '/forgot-password', '/reset-password', '/verificar'].includes(pathname)) {
  router.push('/login');
}
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ usuario, setUsuario }}>
      <div className="flex min-h-screen">
        <main className="flex-1 bg-light p-1">
          {children}
        </main>
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
