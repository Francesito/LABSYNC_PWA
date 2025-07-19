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
  const [keepSignedIn, setKeepSignedIn] = useState(false);
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
    <div className="min-vh-100 d-flex align-items-center justify-content-center position-relative" style={{
      background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* Geometric shapes decoration */}
      <div className="position-absolute" style={{
        top: '10%',
        left: '10%',
        width: '80px',
        height: '80px',
        background: 'linear-gradient(45deg, #f39c12, #e67e22)',
        transform: 'rotate(45deg)',
        opacity: 0.1
      }}></div>
      
      <div className="position-absolute" style={{
        bottom: '15%',
        right: '15%',
        width: '60px',
        height: '60px',
        background: 'linear-gradient(45deg, #3498db, #2980b9)',
        borderRadius: '50%',
        opacity: 0.1
      }}></div>

      {/* Logo */}
      <div className="position-absolute top-0 start-0 p-4">
        <div className="d-flex align-items-center">
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(45deg, #f39c12, #e67e22)',
            marginRight: '12px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '20px',
              height: '20px',
              background: 'linear-gradient(45deg, #3498db, #2980b9)',
              transform: 'translate(-50%, -50%)'
            }}></div>
          </div>
          <h3 className="text-white fw-bold mb-0" style={{ fontSize: '28px' }}>
            UTSJR ID
          </h3>
        </div>
      </div>

      {/* Main login card */}
      <div className="position-relative" style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        padding: '60px 50px',
        width: '100%',
        maxWidth: '450px',
        margin: '0 20px'
      }}>
        
        <div className="text-center mb-5">
          <h2 className="fw-normal mb-0" style={{ 
            color: '#2c3e50', 
            fontSize: '32px',
            fontWeight: '300'
          }}>
            Inicia Sesión
          </h2>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-4 rounded" style={{
            backgroundColor: '#f8d7da',
            borderColor: '#f5c6cb',
            color: '#721c24',
            border: '1px solid #f5c6cb'
          }}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email Address */}
          <div className="mb-4">
            <label htmlFor="correo" className="form-label fw-normal mb-2" style={{
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              id="correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="form-control"
              style={{
                border: '2px solid #e1e8ed',
                borderRadius: '6px',
                padding: '14px 16px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#2c3e50',
                transition: 'border-color 0.2s ease'
              }}
              placeholder=""
              required
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label htmlFor="contrasena" className="form-label fw-normal mb-2" style={{
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              Contraseña
            </label>
            <div className="position-relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="contrasena"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="form-control"
                style={{
                  border: '2px solid #e1e8ed',
                  borderRadius: '6px',
                  padding: '14px 16px',
                  paddingRight: '50px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  color: '#2c3e50',
                  transition: 'border-color 0.2s ease'
                }}
                placeholder=""
                required
              />
              <button
                type="button"
                className="btn position-absolute top-50 end-0 translate-middle-y me-3 p-0 border-0 bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: '#7f8c8d' }}
              >
                <i className={`bi ${showPassword ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`}></i>
              </button>
            </div>
          </div>

          {/* Keep me signed in */}
          <div className="mb-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="keepSignedIn"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                style={{
                  borderColor: '#d1d9e0',
                  marginTop: '2px'
                }}
              />
              <label className="form-check-label" htmlFor="keepSignedIn" style={{
                color: '#5a6c7d',
                fontSize: '14px',
                marginLeft: '8px'
              }}>
                Mantenerme conectado
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn w-100 fw-semibold mb-4"
            style={{
              backgroundColor: '#4A90E2',
              borderColor: '#4A90E2',
              color: 'white',
              borderRadius: '6px',
              padding: '14px',
              fontSize: '16px',
              border: 'none',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#357ABD'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#4A90E2'}
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="text-center mb-4">
          <Link 
            href="/forgot-password" 
            className="text-decoration-none"
            style={{
              color: '#4A90E2',
              fontSize: '14px'
            }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <p className="text-center mb-0" style={{
          color: '#5a6c7d',
          fontSize: '14px'
        }}>
          ¿No tienes cuenta?{' '}
          <Link 
            href="/register" 
            className="text-decoration-none fw-semibold"
            style={{
              color: '#4A90E2'
            }}
          >
            Regístrate
          </Link>
        </p>

        <div className="text-center mt-4">
          <Link 
            href="/privacy-policy" 
            className="text-decoration-none"
            style={{
              color: '#95a5a6',
              fontSize: '12px'
            }}
          >
            Política de privacidad ↗
          </Link>
        </div>
      </div>

      <style jsx>{`
        .form-control:focus {
          border-color: #4A90E2 !important;
          box-shadow: 0 0 0 0.2rem rgba(74, 144, 226, 0.25) !important;
          background-color: #ffffff !important;
          color: #2c3e50 !important;
        }
        
        .form-control::placeholder {
          color: #bdc3c7 !important;
        }
        
        .form-check-input:checked {
          background-color: #4A90E2 !important;
          border-color: #4A90E2 !important;
        }
        
        .form-check-input:focus {
          border-color: #4A90E2 !important;
          box-shadow: 0 0 0 0.2rem rgba(74, 144, 226, 0.25) !important;
        }

        .form-control:hover {
          border-color: #bdc3c7 !important;
        }
      `}</style>
    </div>
  );
}
