'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function Register() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        nombre,
        correo_institucional: correo,
        contrasena,
        rol: 'alumno', // Set default role to alumno
      });
      setError('');
      alert('Usuario registrado. Verifica tu correo.');
      router.push('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar usuario');
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
        {/* Sección derecha - Formulario */}
        <div className="col-12 col-md-6 offset-md-6 d-flex flex-column justify-content-center p-4 p-md-5">
          <div className="w-100" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="mb-4">
              <h2 className="fw-bold text-dark mb-1">Crear cuenta</h2>
              <p className="text-dark-50 small">Completa los datos para crear tu cuenta en LabSync</p>
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center mb-4 rounded shadow-sm">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Nombre */}
              <div className="mb-4">
                <label htmlFor="nombre" className="form-label fw-semibold text-dark mb-2">Nombre Completo</label>
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
                  placeholder="Ingresa tu nombre"
                  required
                />
              </div>

              {/* Correo */}
              <div className="mb-4">
                <label htmlFor="correo" className="form-label fw-semibold text-dark mb-2">Correo Institucional</label>
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

              {/* Contraseña */}
              <div className="mb-4">
                <label htmlFor="contrasena" className="form-label fw-semibold text-dark mb-2">Contraseña</label>
                <div className="position-relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="contrasena"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    className="form-control bg-white border-dark text-dark pe-5"
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: '#000000',
                      color: '#000000',
                      padding: '12px 16px',
                      fontSize: '16px'
                    }}
                    placeholder="Crea una contraseña"
                    required
                  />
                  <button
                    type="button"
                    className="btn position-absolute top-50 end-0 translate-middle-y me-3 p-0 border-0 bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ color: '#000000' }}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`}></i>
                  </button>
                </div>
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
                Crear cuenta
              </button>
            </form>

            <p className="text-center text-dark-50">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-dark fw-bold text-decoration-none">Inicia sesión</Link>
            </p>
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
      `}</style>
    </div>
  );
}
