'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import axios from 'axios';

export default function Configuracion() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Verificar que el usuario es administrador
  if (!usuario || usuario.rol_id !== 4) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones en el frontend
    if (!nombre || !correo || !rol) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (!correo.endsWith('@utsjr.edu.mx')) {
      setError('El correo debe ser institucional (@utsjr.edu.mx)');
      return;
    }
    if (!['docente', 'almacen'].includes(rol)) {
      setError('Rol inválido. Selecciona docente o almacen.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/adminAddUser`,
        { nombre, correo_institucional: correo, rol },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(response.data.mensaje || 'Usuario agregado exitosamente');
      setNombre('');
      setCorreo('');
      setRol('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al agregar usuario');
      console.error('Error en adminAddUser:', err.response?.data);
    }
  };

  return (
    <div className="min-vh-100 d-flex font-sans position-relative" style={{
      backgroundImage: 'url(/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <div className="row w-100 m-0 position-relative" style={{ zIndex: 2 }}>
        <div className="col-12 col-md-6 offset-md-3 d-flex flex-column justify-content-center p-4 p-md-5">
          <div className="w-100" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="mb-4">
              <h2 className="fw-bold text-dark mb-1">Configuración</h2>
              <p className="text-dark-50 small">Agregar nuevo usuario (docente o almacen)</p>
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center mb-4 rounded shadow-sm">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success d-flex align-items-center mb-4 rounded shadow-sm">
                <i className="bi bi-check-circle-fill me-2"></i>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="nombre" className="form-label fw-semibold text-dark mb-2">Nombre completo</label>
                <input
                  type="text"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="form-control bg-white border-dark text-dark"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#000000',
                    color: '#000000',
                    padding: '12px 16px',
                    fontSize: '16px'
                  }}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="correo" className="form-label fw-semibold text-dark mb-2">Correo institucional</label>
                <input
                  type="email"
                  id="correo"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="form-control bg-white border-dark text-dark"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#000000',
                    color: '#000000',
                    padding: '12px 16px',
                    fontSize: '16px'
                  }}
                  placeholder="ejemplo@utsjr.edu.mx"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="rol" className="form-label fw-semibold text-dark mb-2">Rol</label>
                <select
                  id="rol"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="form-control bg-white border-dark text-dark"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#000000',
                    color: '#000000',
                    padding: '12px 16px',
                    fontSize: '16px'
                  }}
                  required
                >
                  <option value="">Selecciona un rol</option>
                  <option value="docente">Docente</option>
                  <option value="almacen">Almacen</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn w-100 fw-semibold mb-4"
                style={{
                  backgroundColor: '#d4634a',
                  borderColor: '#d4634a',
                  color: '#ffffff',
                  borderRadius: '4px',
                  padding: '12px',
                  fontSize: '16px'
                }}
              >
                Agregar usuario
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .form-control:focus {
          background-color: #ffffff !important;
          border-color: #000000 !important;
          color: #000000 !important;
          box-shadow: 0 0 0 0.2rem rgba(0,0,0,0.25) !important;
        }
        .form-control::placeholder {
          color: #6c757d !important;
        }
        select.form-control {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg fill='black' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
          background-repeat: no-repeat;
          background-position-x: 98%;
          background-position-y: 50%;
        }
      `}</style>
    </div>
  );
}