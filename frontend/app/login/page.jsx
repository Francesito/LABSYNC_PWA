'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        correo_institucional: correo,
        contrasena,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('nombre', response.data.nombre);
      router.push('/catalog');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-vh-100 d-flex font-sans position-relative" style={{
      backgroundImage: 'url(/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      {/* Overlay oscuro */}
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%)',
        zIndex: 1
      }}></div>

      <div className="row w-100 m-0 position-relative" style={{ zIndex: 2 }}>
        {/* Sección izquierda - Welcome Back */}
        <div className="col-12 col-md-6 d-flex flex-column justify-content-center align-items-center p-4 p-md-5 text-white">
          <div className="text-center" style={{ maxWidth: '480px' }}>
            <h1 className="display-4 fw-bold mb-4 text-white">Bienvenido<br /></h1>
            <p className="lead mb-4 text-white-50">
              Inicia sesión para acceder a tu cuenta y disfrutar de todos los servicios que LabSync tiene para ti.
            </p>
          </div>
        </div>

        {/* Sección derecha - Formulario */}
        <div className="col-12 col-md-6 d-flex flex-column justify-content-center p-4 p-md-5">
          <div className="w-100" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="mb-4">
              <h2 className="fw-bold text-white mb-1">Inicia Sesión</h2>
              <p className="text-white-50 small">Introduce tus credenciales para ingresar a tu cuenta.</p>
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center mb-4 rounded shadow-sm">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email Address */}
              <div className="mb-4">
                <label htmlFor="correo" className="form-label fw-semibold text-white mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  id="correo"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="form-control bg-transparent border-white text-white"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1) !important',
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    padding: '12px 16px',
                    fontSize: '16px'
                  }}
                  placeholder="ejemplo@utsjr.edu.mx"
                  required
                />
              </div>

              {/* Password */}
              <div className="mb-4">
                <label htmlFor="contrasena" className="form-label fw-semibold text-white mb-2">Contraseña</label>
                <div className="position-relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="contrasena"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    className="form-control bg-transparent border-white text-white pe-5"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1) !important',
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: 'white',
                      padding: '12px 16px',
                      fontSize: '16px'
                    }}
                    placeholder="Ingresa tu contraseña"
                    required
                  />
                  <button
                    type="button"
                    className="btn position-absolute top-50 end-0 translate-middle-y me-3 p-0 border-0 bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ color: 'rgba(255,255,255,0.7)' }}
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
                  color: 'white',
                  borderRadius: '4px',
                  padding: '12px',
                  fontSize: '16px'
                }}
              >
                Iniciar Sesión 
              </button>
            </form>

            <div className="text-center mb-4">
              <Link href="/forgot-password" className="text-white text-decoration-none">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <p className="text-center text-white-50">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="text-white fw-bold text-decoration-none">Regístrate</Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .form-control:focus {
          background-color: rgba(255,255,255,0.1) !important;
          border-color: rgba(255,255,255,0.5) !important;
          color: white !important;
          box-shadow: 0 0 0 0.2rem rgba(255,255,255,0.25) !important;
        }
        
        .form-control::placeholder {
          color: rgba(255,255,255,0.5) !important;
        }
        
        .form-check-input:checked {
          background-color: #d4634a !important;
          border-color: #d4634a !important;
        }
        
        .form-check-input:focus {
          border-color: rgba(255,255,255,0.5) !important;
          box-shadow: 0 0 0 0.2rem rgba(255,255,255,0.25) !important;
        }
      `}</style>
    </div>
  );
}
