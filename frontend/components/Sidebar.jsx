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
      color: 'from-purple-500 to-pink-500',
      hoverBg: 'hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50',
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
      color: 'from-blue-500 to-cyan-500',
      hoverBg: 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50',
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
      color: 'from-amber-500 to-orange-500',
      hoverBg: 'hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50',
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
      color: 'from-emerald-500 to-teal-500',
      hoverBg: 'hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50',
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
      color: 'from-indigo-500 to-purple-500',
      hoverBg: 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50',
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
      color: 'from-slate-500 to-gray-600',
      hoverBg: 'hover:bg-gradient-to-r hover:from-slate-50 hover:to-gray-50',
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

  // Función para obtener el nombre del rol con colores
  const getRoleName = (rolId) => {
    const roles = {
      1: { name: 'Alumno', color: 'bg-blue-100 text-blue-700' },
      2: { name: 'Docente', color: 'bg-green-100 text-green-700' },
      3: { name: 'Almacén', color: 'bg-purple-100 text-purple-700' },
      4: { name: 'Administrador', color: 'bg-orange-100 text-orange-700' }
    };
    return roles[rolId] || { name: 'Usuario', color: 'bg-gray-100 text-gray-700' };
  };

  const rolInfo = getRoleName(usuario.rol_id);

  return (
    <aside className="w-72 h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border-r border-slate-200/60 flex flex-col fixed z-20 shadow-xl shadow-slate-200/50">
      {/* Header con gradiente colorido */}
      <div className="p-6 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 backdrop-blur-sm border-b border-slate-100 relative overflow-hidden">
        {/* Efecto de fondo animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 animate-pulse"></div>
        
        <div className="relative flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-4 ring-white/50">
              <span className="text-xl font-bold text-white drop-shadow-lg">
                {getInitials(usuario.nombre)}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full border-3 border-white shadow-lg animate-pulse"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-800 truncate mb-1">
              {usuario.nombre}
            </h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${rolInfo.color} border border-current/20`}>
              {rolInfo.name}
            </span>
          </div>
        </div>
      </div>

      {/* Navegación colorida y dinámica */}
      <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Menú Principal
        </h4>
        {navItems
          .filter(item => item.visible === undefined || item.visible)
          .map(({ href, label, icon, color, hoverBg }) => (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-4 px-4 py-4 text-sm font-semibold text-slate-600 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 border border-transparent hover:border-white ${hoverBg} overflow-hidden`}
            >
              {/* Barra lateral colorida */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${color} transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 rounded-r-full`}></div>
              
              {/* Icono con gradiente */}
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br ${color} text-white shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                {icon}
              </div>
              
              <span className="group-hover:translate-x-2 transition-all duration-300 group-hover:text-slate-800">
                {label}
              </span>
              
              {/* Efecto de brillo */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </Link>
          ))}
      </nav>

      {/* Footer mejorado */}
      <div className="p-6 border-t border-slate-100 bg-gradient-to-r from-red-50/50 to-pink-50/50">
        <button
          onClick={handleLogout}
          className="group relative flex items-center gap-3 w-full px-4 py-4 text-sm font-bold text-red-600 hover:text-white rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg border-2 border-red-200 hover:border-red-500 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-500 hover:to-pink-500 overflow-hidden"
        >
          <svg className="w-5 h-5 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="group-hover:translate-x-1 transition-transform duration-300 relative z-10">
            Cerrar Sesión
          </span>
          
          {/* Efecto de ondas */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
        </button>
      </div>
    </aside>
  );
}
