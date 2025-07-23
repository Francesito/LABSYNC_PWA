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

  // Definimos el array de ítems con sus condiciones de visibilidad
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
      visible: [1, 2].includes(usuario.rol_id), // Visible solo para alumnos y docentes
    },
    {
      href: '/adeudos',
      label: 'Adeudos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      visible: [1, 2].includes(usuario.rol_id), // Visible para alumnos y docentes
    },
    {
      href: '/prestamos',
      label: 'Préstamos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      visible: usuario.rol_id === 3, // Visible solo para almacen
    },
    {
      href: '/chat',
      label: 'Chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      visible: [1, 3].includes(usuario.rol_id), // Visible para alumnos y almacen
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

  return (
    <aside className="w-64 h-screen bg-slate-900 text-white shadow-xl flex flex-col fixed z-10 animate-slide-in">
      {/* Header con perfil de usuario */}
      <div className="px-6 py-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-slate-600">
              <span className="text-xl font-bold text-white">
                {getInitials(usuario.nombre)}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">
              {usuario.nombre}
            </h3>
            <p className="text-sm text-slate-400 truncate">
              {usuario.correo_institucional}
            </p>
          </div>
          <button className="p-1 hover:bg-slate-800 rounded-full transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems
          .filter(item => item.visible === undefined || item.visible)
          .map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-slate-800 transition-all duration-200 text-slate-300 hover:text-white group relative"
            >
              <div className="flex items-center justify-center w-6 h-6 text-slate-400 group-hover:text-white transition-colors">
                {icon}
              </div>
              <span className="font-medium">{label}</span>
            </Link>
          ))}
      </nav>

      {/* Footer con botón de logout */}
      <div className="px-4 py-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
