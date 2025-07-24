'use client';
import { useAuth } from '../../lib/auth';
import { useState } from 'react';

export default function Configuracion() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: 'Usuario 1', correo: 'usuario1@utsjr.edu.mx', rol: 'Almacenista', acceso: true, modificacion: true },
    { id: 2, nombre: 'Usuario 2', correo: 'usuario2@utsjr.edu.mx', rol: 'Almacenista', acceso: true, modificacion: true }
  ]);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', correo: '', rol: '' });
  const [correoBloqueo, setCorreoBloqueo] = useState('');
  const [correoEliminacion, setCorreoEliminacion] = useState('');

  // Verificar que el usuario es administrador
  if (!usuario || usuario.rol_id !== 4) {
    return null;
  }

  const toggleAcceso = (id) => {
    setUsuarios(usuarios.map(user => 
      user.id === id ? { ...user, acceso: !user.acceso } : user
    ));
  };

  const toggleModificacion = (id) => {
    setUsuarios(usuarios.map(user => 
      user.id === id ? { ...user, modificacion: !user.modificacion } : user
    ));
  };

  const agregarUsuario = () => {
    if (nuevoUsuario.nombre && nuevoUsuario.correo && nuevoUsuario.rol) {
      const nuevo = {
        id: Date.now(),
        ...nuevoUsuario,
        acceso: true,
        modificacion: true
      };
      setUsuarios([...usuarios, nuevo]);
      setNuevoUsuario({ nombre: '', correo: '', rol: '' });
    }
  };

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 ml-64 p-6 bg-gray-50">
        {/* Header con título y botón de agregar */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Listado de Usuarios</h1>
          <button 
            onClick={agregarUsuario}
            className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
          >
            <span className="text-xl font-bold">+</span>
          </button>
        </div>

        {/* Lista de usuarios existentes */}
        <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden">
          {usuarios.map((user) => (
            <div key={user.id} className="flex items-center p-4 border-b border-gray-200 last:border-b-0">
              {/* Checkbox de selección */}
              <input 
                type="checkbox" 
                className="w-5 h-5 mr-4 rounded border-2 border-gray-300"
              />
              
              {/* Nombre del usuario */}
              <div className="flex-1">
                <span className="text-lg font-medium text-gray-900">{user.rol}</span>
              </div>
              
              {/* Acceso a chat */}
              <div className="flex flex-col items-center mx-8">
                <span className="text-sm font-medium text-gray-700 mb-2">Acceso a chat</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={user.acceso}
                    onChange={() => toggleAcceso(user.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500">
                    {user.acceso && (
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
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-gray-700 mb-2">Modificación de stock</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={user.modificacion}
                    onChange={() => toggleModificacion(user.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500">
                    {user.modificacion && (
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
          ))}
        </div>

        {/* Formulario para agregar nuevo usuario */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            {/* Campos del formulario */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={nuevoUsuario.nombre}
                onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre completo"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electronico</label>
              <input
                type="email"
                value={nuevoUsuario.correo}
                onChange={(e) => setNuevoUsuario({...nuevoUsuario, correo: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="correo@utsjr.edu.mx"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <input
                type="text"
                value={nuevoUsuario.rol}
                onChange={(e) => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Rol del usuario"
              />
            </div>
            
            {/* Botón de agregar */}
            <div className="flex items-end">
              <button 
                onClick={agregarUsuario}
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
              >
                <span className="text-lg font-bold">+</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sección de bloqueo y eliminación */}
        <div className="grid grid-cols-2 gap-8">
          {/* Bloqueo de cuenta */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bloqueo de cuenta por correo electronico</h3>
            <div className="flex items-center gap-4">
              <input
                type="email"
                value={correoBloqueo}
                onChange={(e) => setCorreoBloqueo(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Correo electrónico"
              />
            </div>
          </div>

          {/* Eliminación de cuenta */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Eliminacion de cuenta por correo electronico</h3>
            <div className="flex items-center gap-4">
              <input
                type="email"
                value={correoEliminacion}
                onChange={(e) => setCorreoEliminacion(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Correo electrónico"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
