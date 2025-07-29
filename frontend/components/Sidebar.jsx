'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function Sidebar() {
  const router = useRouter();
  const { usuario, setUsuario } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUsuario(null);
    router.push('/login');
  };

  if (!usuario) return null;

  // Definimos el array de ítems con sus condiciones de visibilidad corregidas
  const navItems = [
    { 
      href: '/catalog', 
      label: 'Catálogo', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      visible: [1, 2, 3, 4].includes(usuario.rol_id), // Visible para todos los roles
    },
    { 
      href: '/solicitudes', 
      label: 'Solicitudes', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      visible: [1, 2, 3].includes(usuario.rol_id), // Visible para alumnos, docentes y almacén
    },
    {
      href: '/adeudos',
      label: 'Adeudos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      visible: [1, 2].includes(usuario.rol_id), // Visible solo para alumnos y docentes
    },
    {
      href: '/prestamos',
      label: 'Préstamos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      visible: usuario.rol_id === 3, // Visible solo para almacén
    },
    {
      href: '/chat',
      label: 'Chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      visible: [1, 2, 3].includes(usuario.rol_id), // Visible para alumnos, docentes y almacén
    },
    {
      href: '/configuracion',
      label: 'Configuración',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      visible: usuario.rol_id === 4, // Visible solo para administrador
    },
  ];

  // Función para obtener las iniciales del nombre
  const getInitials = (nombre) => {
    if (!nombre) return 'U';
    return nombre.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Función para obtener el nombre del rol
  const getRoleName = (rolId) => {
    const roles = {
      1: 'Alumno',
      2: 'Docente',
      3: 'Almacén',
      4: 'Administrador'
    };
    return roles[rolId] || 'Usuario';
  };

  return (
    <aside className="w-72 h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl flex flex-col fixed z-20 border-r border-slate-700/50">
      {/* Header con perfil de usuario mejorado */}
      <div className="px-6 py-8 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 flex items-center justify-center ring-4 ring-slate-600/30 shadow-lg transition-all duration-300 group-hover:ring-slate-500/50 group-hover:shadow-xl">
              <span className="text-2xl font-bold text-white drop-shadow-sm">
                {getInitials(usuario.nombre)}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-3 border-slate-800 shadow-lg animate-pulse"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white truncate mb-1 drop-shadow-sm">
              {usuario.nombre}
            </h3>
            <p className="text-sm text-slate-300 truncate mb-1">
              {usuario.correo}
            </p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30">
              {getRoleName(usuario.rol_id)}
            </span>
          </div>
        </div>
      </div>

      {/* Navegación principal mejorada */}
      <nav className="flex-1 px-6 py-8 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Navegación
        </h4>
        {navItems
          .filter(item => item.visible === undefined || item.visible)
          .map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 py-4 px-4 rounded-2xl transition-all duration-300 text-slate-300 hover:text-white hover:bg-slate-700/50 hover:shadow-lg hover:shadow-slate-900/20 backdrop-blur-sm border border-transparent hover:border-slate-600/30 relative overflow-hidden"
            >
              {/* Efecto hover de fondo */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              
              <div className="relative flex items-center justify-center w-8 h-8 text-slate-400 group-hover:text-white transition-all duration-300 group-hover:scale-110">
                {icon}
              </div>
              <span className="relative font-semibold text-sm tracking-wide group-hover:translate-x-1 transition-transform duration-300">
                {label}
              </span>
              
              {/* Indicador de hover */}
              <div className="absolute right-4 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"></div>
            </Link>
          ))}
      </nav>

      {/* Footer con botón de logout mejorado */}
      <div className="px-6 py-6 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <button
          onClick={handleLogout}
          className="group flex items-center justify-center gap-3 w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-red-900/30 hover:-translate-y-1 active:translate-y-0 border border-red-500/30"
        >
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="tracking-wide">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
