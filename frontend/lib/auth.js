'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Función para obtener el rol en formato string
  const getRoleName = (rolId) => {
    switch (rolId) {
      case 1:
        return 'alumno';
      case 2:
        return 'docente';
      case 3:
        return 'almacen';
      case 4:
        return 'administrador';
      default:
        return 'unknown';
    }
  };

  // Función para verificar y actualizar permisos del usuario
  const actualizarPermisos = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !usuario) return;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/permisos-chat`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        setUsuario(prevUsuario => ({
          ...prevUsuario,
          permisos: {
            acceso_chat: response.data.acceso_chat,
            modificar_stock: response.data.modificar_stock
          }
        }));
      }
    } catch (error) {
      console.error('Error al actualizar permisos:', error);
    }
  };

  // Función de login
  const login = async (correo_institucional, contrasena) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        correo_institucional,
        contrasena,
      });

      const { token, usuario: userData } = response.data;

      // Guardar token en localStorage
      localStorage.setItem('token', token);

      // Configurar usuario con permisos y rol
      const usuarioCompleto = {
        ...userData,
        rol: userData.rol || getRoleName(userData.rol_id),
        permisos: userData.permisos || null
      };

      setUsuario(usuarioCompleto);

      return { success: true };
    } catch (error) {
      console.error('Error de login:', error);
      const errorMessage = error.response?.data?.error || 'Error al iniciar sesión';
      return { success: false, error: errorMessage };
    }
  };

  // Función de logout
  const logout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
    router.push('/login');
  };

  // Función para verificar si el usuario está autenticado
  const verificarAutenticacion = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Verificar la validez del token y obtener permisos actualizados
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/permisos-chat`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        // Decodificar el token para obtener información básica del usuario
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        
        const usuarioCompleto = {
          id: tokenData.id,
          nombre: tokenData.nombre,
          correo: tokenData.correo_institucional,
          rol_id: tokenData.rol_id,
          rol: response.data.rol,
          permisos: {
            acceso_chat: response.data.acceso_chat,
            modificar_stock: response.data.modificar_stock
          }
        };

        setUsuario(usuarioCompleto);
      }
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      // Si hay error, limpiar el token inválido
      localStorage.removeItem('token');
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar si el usuario puede modificar stock
  const puedeModificarStock = () => {
    if (!usuario) return false;
    
    // Administradores siempre pueden
    if (usuario.rol_id === 4) return true;
    
    // Usuarios de almacén solo si tienen el permiso
    if (usuario.rol_id === 3 && usuario.permisos?.modificar_stock) return true;
    
    return false;
  };

  // Función para verificar si el usuario puede acceder al chat
  const puedeAccederChat = () => {
    if (!usuario) return false;
    
    // Alumnos siempre pueden
    if (usuario.rol_id === 1) return true;
    
    // Administradores siempre pueden
    if (usuario.rol_id === 4) return true;
    
    // Usuarios de almacén solo si tienen el permiso
    if (usuario.rol_id === 3 && usuario.permisos?.acceso_chat) return true;
    
    // Docentes no tienen acceso al chat
    return false;
  };

  // Función para verificar si el usuario puede hacer solicitudes
  const puedeHacerSolicitudes = () => {
    if (!usuario) return false;
    
    // Administradores no pueden hacer solicitudes
    if (usuario.rol_id === 4) return false;
    
    // Alumnos y docentes siempre pueden
    if (usuario.rol_id === 1 || usuario.rol_id === 2) return true;
    
    // Usuarios de almacén solo si NO tienen permisos de modificar stock
    if (usuario.rol_id === 3 && !usuario.permisos?.modificar_stock) return true;
    
    return false;
  };

  // Función para verificar si el usuario puede ver detalles de materiales
  const puedeVerDetalles = () => {
    if (!usuario) return false;
    
    // Administradores solo pueden ver reactivos, no interactuar
    if (usuario.rol_id === 4) return false;
    
    // Usuarios de almacén sin permisos no pueden interactuar
    if (usuario.rol_id === 3 && !usuario.permisos?.modificar_stock) return false;
    
    // Todos los demás sí pueden
    return true;
  };

  // Efecto para verificar autenticación al cargar
  useEffect(() => {
    verificarAutenticacion();
  }, []);

  // Efecto para actualizar permisos periódicamente (opcional)
  useEffect(() => {
    if (usuario && usuario.rol_id === 3) {
      const interval = setInterval(actualizarPermisos, 5 * 60 * 1000); // Cada 5 minutos
      return () => clearInterval(interval);
    }
  }, [usuario]);

  const value = {
    usuario,
    loading,
    login,
    logout,
    actualizarPermisos,
    puedeModificarStock,
    puedeAccederChat,
    puedeHacerSolicitudes,
    puedeVerDetalles
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
