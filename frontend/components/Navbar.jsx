// frontend/components/Navbar.jsx
'use client';
import { useAuth } from '../lib/auth';
import Link from 'next/link';

export default function Navbar() {
  const { usuario, setUsuario } = useAuth();

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rol_id');
    setUsuario(null);
  };

  return (
    <nav className="bg-blue-800 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">LabSync</h1>
      {usuario && (
        <div className="flex items-center">
          <span className="mr-4">{usuario.nombre}</span>
          <button onClick={cerrarSesion} className="btn-primary">
            Cerrar Sesión
          </button>
        </div>
      )}
    </nav>
  );
}