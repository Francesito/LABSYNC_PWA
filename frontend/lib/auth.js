//frontend/lib/auth.js
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Función para decodificar JWT manualmente (sin librerías externas)
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decodificando JWT:', error);
    return null;
  }
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Función para limpiar la sesión
  const limpiarSesion = () => {
    localStorage.removeItem('token');
    setUsuario(null);
  };

  // Función para verificar si el token ha expirado
  const tokenExpirado = (decoded) => {
    if (!decoded.exp) return false;
    const now = Date.now() / 1000;
    return decoded.exp < now;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Rutas públicas que no requieren autenticación
    const rutasPublicas = ['/login', '/register', '/forgot-password'];
    const esRutaPublica = rutasPublicas.includes(pathname) || 
                         pathname.startsWith('/reset-password') || 
                         pathname.startsWith('/verificar');

    if (token) {
      try {
        const decoded = decodeJWT(token);
        
        if (!decoded) {
          console.error('Token inválido');
          limpiarSesion();
          if (!esRutaPublica) {
            router.push('/login');
          }
          setLoading(false);
          return;
        }

        // Verificar si el token ha expirado
        if (tokenExpirado(decoded)) {
          console.error('Token expirado');
          limpiarSesion();
          if (!esRutaPublica) {
            router.push('/login');
          }
          setLoading(false);
          return;
        }

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
            case 4:
              rolNombre = 'administrador';
              break;
            default:
              rolNombre = 'desconocido';
          }
        }

        const usuarioData = {
          id: decoded.id,
          nombre: decoded.nombre,
          correo: decoded.correo_institucional || decoded.correo,
          rol: rolNombre,
          rol_id: decoded.rol_id,
        };

        setUsuario(usuarioData);

        // Redirecciones basadas en el estado de autenticación y rol
        if (esRutaPublica && pathname !== '/reset-password' && !pathname.startsWith('/reset-password')) {
          router.push('/catalog');
        } else if (rolNombre === 'docente' && pathname === '/chat') {
          router.push('/catalog');
        } else if (
          (rolNombre === 'alumno' || rolNombre === 'almacen') &&
          pathname === '/solicitudes/pendientes'
        ) {
          router.push('/solicitudes');
        } else if (rolNombre !== 'administrador' && pathname === '/configuracion') {
          router.push('/catalog');
        }

      } catch (error) {
        console.error('Error procesando token:', error);
        limpiarSesion();
        if (!esRutaPublica) {
          router.push('/login');
        }
      }
    } else {
      // No hay token
      if (!esRutaPublica) {
        router.push('/login');
      }
    }
    
    setLoading(false);
  }, [pathname, router]);

  // Función para login
  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUsuario(userData);
    router.push('/catalog');
  };

  // Función para logout
  const logout = () => {
    limpiarSesion();
    router.push('/login');
  };

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      usuario, 
      setUsuario, 
      login, 
      logout,
      loading 
    }}>
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
