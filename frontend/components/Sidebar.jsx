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
    <aside className="w-64 h-screen bg-gradient-to-b from-slate-50 to-white border-r border-slate-200/60 flex flex-col fixed z-20 shadow-sm">
      {/* Header elegante */}
      <div className="p-6 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
              <span className="text-lg font-bold text-white">
                {getInitials(usuario.nombre)}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-sm"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-800 truncate">
              {usuario.nombre}
            </h3>
            <p className="text-sm text-slate-500 truncate">
              {getRoleName(usuario.rol_id)}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación con vida */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems
          .filter(item => item.visible === undefined || item.visible)
          .map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 rounded-xl hover:text-slate-900 hover:bg-white hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 border border-transparent hover:border-slate-200/50"
            >
              <span className="text-slate-400 group-hover:text-blue-500 transition-colors duration-300 group-hover:scale-110 transform">
                {icon}
              </span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">
                {label}
              </span>
            </Link>
          ))}
      </nav>

      {/* Footer con estilo */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md border border-transparent hover:border-red-100"
        >
          <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="group-hover:translate-x-1 transition-transform duration-300">
            Cerrar Sesión
          </span>
        </button>
      </div>
    </aside>
  );
}
