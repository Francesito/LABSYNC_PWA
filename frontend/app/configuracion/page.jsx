//frontend/app/configuracion/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';

export default function Configuracion() {
  const { usuario } = useAuth();
  const [usuariosAlmacen, setUsuariosAlmacen] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    correo_institucional: '',
    rol_id: ''
  });
  const [correoBloqueo, setCorreoBloqueo] = useState('');
  const [correoEliminacion, setCorreoEliminacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const roles = [
    { id: 2, nombre: 'docente' },
    { id: 3, nombre: 'almacen' },
    { id: 4, nombre: 'administrador' }
  ];

  // Verificar que el usuario es administrador
  if (!usuario || usuario.rol_id !== 4) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  // Generar contraseña aleatoria
  const generarContrasenaAleatoria = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Cargar usuarios de almacén
  const cargarUsuariosAlmacen = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/usuarios-almacen`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsuariosAlmacen(data);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      mostrarMensaje('error', 'Error al cargar la lista de usuarios');
    }
  };

  // Agregar nuevo usuario
  const agregarUsuario = async () => {
    
    if (!nuevoUsuario.nombre || !nuevoUsuario.correo_institucional || !nuevoUsuario.rol_id) {
      mostrarMensaje('error', 'Todos los campos son obligatorios');
      return;
    }

    if (!nuevoUsuario.correo_institucional.endsWith('@utsjr.edu.mx')) {
      mostrarMensaje('error', 'El correo debe ser institucional (@utsjr.edu.mx)');
      return;
    }

    setLoading(true);
    try {
      const contrasenaAleatoria = generarContrasenaAleatoria();
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/crear-usuario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...nuevoUsuario,
          contrasena: contrasenaAleatoria,
          activo: true
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        mostrarMensaje('success', 'Usuario creado exitosamente. Se ha enviado un enlace de restablecimiento de contraseña al correo.');
        setNuevoUsuario({ nombre: '', correo_institucional: '', rol_id: '' });
        cargarUsuariosAlmacen();
      } else {
        mostrarMensaje('error', data.error || 'Error al crear usuario');
      }
    } catch (error) {
      console.error('Error al crear usuario:', error);
      mostrarMensaje('error', 'Error de conexión al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar permisos de usuario
  const actualizarPermisos = async (usuarioId, campo, valor) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/actualizar-permisos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: usuarioId,
          campo,
          valor
        })
      });

      if (response.ok) {
        // Actualizar estado local
        setUsuariosAlmacen(usuarios =>
          usuarios.map(user =>
            user.id === usuarioId ? { ...user, [campo]: valor } : user
          )
        );
        mostrarMensaje('success', 'Permisos actualizados correctamente');
      } else {
        const data = await response.json();
        mostrarMensaje('error', data.error || 'Error al actualizar permisos');
      }
    } catch (error) {
      console.error('Error al actualizar permisos:', error);
      mostrarMensaje('error', 'Error de conexión al actualizar permisos');
    }
  };

  // Bloquear usuario
  const bloquearUsuario = async () => {
    
    if (!correoBloqueo) {
      mostrarMensaje('error', 'Ingrese un correo electrónico');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/bloquear-usuario`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ correo_institucional: correoBloqueo })
      });

      const data = await response.json();
      
      if (response.ok) {
        mostrarMensaje('success', 'Usuario bloqueado exitosamente');
        setCorreoBloqueo('');
        cargarUsuariosAlmacen();
      } else {
        mostrarMensaje('error', data.error || 'Error al bloquear usuario');
      }
    } catch (error) {
      console.error('Error al bloquear usuario:', error);
      mostrarMensaje('error', 'Error de conexión al bloquear usuario');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar usuario
  const eliminarUsuario = async () => {
    
    if (!correoEliminacion) {
      mostrarMensaje('error', 'Ingrese un correo electrónico');
      return;
    }

    if (!confirm('¿Está seguro que desea eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/eliminar-usuario`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ correo_institucional: correoEliminacion })
      });

      const data = await response.json();
      
      if (response.ok) {
        mostrarMensaje('success', 'Usuario eliminado exitosamente');
        setCorreoEliminacion('');
        cargarUsuariosAlmacen();
      } else {
        mostrarMensaje('error', data.error || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      mostrarMensaje('error', 'Error de conexión al eliminar usuario');
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  useEffect(() => {
    cargarUsuariosAlmacen();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 ml-64 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Sistema activo</span>
          </div>
        </div>

        {/* Mensajes */}
        {mensaje.texto && (
          <div className={`mb-6 p-4 rounded-lg border-l-4 ${
            mensaje.tipo === 'success' 
              ? 'bg-green-50 border-green-500 text-green-700' 
              : 'bg-red-50 border-red-500 text-red-700'
          }`}>
            <div className="flex items-center">
              {mensaje.tipo === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {mensaje.texto}
            </div>
          </div>
        )}

        {/* Formulario para agregar usuario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Agregar Nuevo Usuario
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={nuevoUsuario.nombre}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Nombre completo del usuario"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Institucional
                </label>
                <input
                  type="email"
                  id="correo"
                  value={nuevoUsuario.correo_institucional}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, correo_institucional: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="usuario@utsjr.edu.mx"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="rol" className="block text-sm font-medium text-gray-700 mb-2">
                  Rol del Usuario
                </label>
                <select
                  id="rol"
                  value={nuevoUsuario.rol_id}
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, rol_id: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Seleccionar rol</option>
                  {roles.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Crear Usuario
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lista de usuarios de almacén */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Personal de Almacén ({usuariosAlmacen.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {usuariosAlmacen.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                No hay usuarios de almacén registrados
              </div>
            ) : (
              usuariosAlmacen.map((user) => (
                <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                          {user.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{user.nombre}</h3>
                          <p className="text-gray-600">{user.correo_institucional}</p>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.activo 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.activo ? 'Activo' : 'Bloqueado'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-8">
                      {/* Acceso al chat */}
                      <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Acceso al Chat
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={user.acceso_chat || false}
                            onChange={(e) => actualizarPermisos(user.id, 'acceso_chat', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600">
                            {user.acceso_chat && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                      
                      {/* Modificación de stock */}
                      <div className="text-center">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Modificar Stock
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={user.modificar_stock || false}
                            onChange={(e) => actualizarPermisos(user.id, 'modificar_stock', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600">
                            {user.modificar_stock && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Secciones de bloqueo y eliminación */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bloqueo de cuenta */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Bloquear Usuario
            </h3>
            <p className="text-gray-600 mb-4">El usuario no podrá acceder al sistema</p>
            
            <div className="space-y-4">
              <input
                type="email"
                value={correoBloqueo}
                onChange={(e) => setCorreoBloqueo(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                placeholder="correo@utsjr.edu.mx"
                required
              />
              <button
                onClick={bloquearUsuario}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Bloqueando...' : 'Bloquear Usuario'}
              </button>
            </div>
          </div>

          {/* Eliminación de cuenta */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar Usuario
            </h3>
            <p className="text-red-600 mb-4">⚠️ Esta acción no se puede deshacer</p>
            
            <div className="space-y-4">
              <input
                type="email"
                value={correoEliminacion}
                onChange={(e) => setCorreoEliminacion(e.target.value)}
                className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                placeholder="correo@utsjr.edu.mx"
                required
              />
              <button
                onClick={eliminarUsuario}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Eliminando...' : 'Eliminar Usuario'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
