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
    <div className="position-relative" style={{
      minHeight: '100vh',
      background: '#2d3748',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>

      {/* Contenedor principal con perspectiva */}
      <div style={{
        width: '100%',
        maxWidth: '600px',
        perspective: '1200px'
      }}>
        
        {/* Card principal con distorsión/perspectiva */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '60px 50px 50px 50px',
          width: '100%',
          boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.25)',
          transform: 'perspective(1200px) rotateX(-8deg) rotateY(2deg)',
          transformOrigin: 'center center',
          position: 'relative'
        }}>
          
          {/* Logo centrado en la parte superior */}
          <div className="text-center" style={{
            marginBottom: '40px'
          }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{
                height: '60px',
                width: 'auto'
              }}
            />
          </div>

          <h1 style={{
            fontSize: '54px',
            fontWeight: '300',
            color: '#1a202c',
            marginBottom: '40px',
            marginTop: '0',
            lineHeight: '1.1',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            Inicia Sesión
          </h1>

          {error && (
            <div className="alert alert-danger d-flex align-items-center mb-4" style={{
              backgroundColor: '#fee2e2',
              borderColor: '#fecaca',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Address */}
            <div className="mb-4">
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '500',
                color: '#2d3748',
                marginBottom: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                Correo Electrónico
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  outline: 'none',
                  transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                  backgroundColor: '#ffffff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4299e1';
                  e.target.style.boxShadow = '0 0 0 3px rgba(66, 153, 225, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '500',
                color: '#2d3748',
                marginBottom: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                Contraseña
              </label>
              <div className="position-relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    paddingRight: '56px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    outline: 'none',
                    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                    backgroundColor: '#ffffff'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4299e1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(66, 153, 225, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#718096',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`}></i>
                </button>
              </div>
            </div>

            {/* Keep me signed in */}
            <div className="mb-5">
              <div className="d-flex align-items-center">
                <input
                  type="checkbox"
                  id="keepSignedIn"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    marginRight: '12px',
                    accentColor: '#4299e1'
                  }}
                />
                <label htmlFor="keepSignedIn" style={{
                  fontSize: '16px',
                  color: '#2d3748',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  cursor: 'pointer'
                }}>
                  Mantenerme conectado
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              style={{
                width: '100%',
                padding: '16px 32px',
                backgroundColor: '#4299e1',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: '600',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease-in-out',
                marginBottom: '32px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#3182ce'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#4299e1'}
            >
              Iniciar Sesión
            </button>
          </form>

          <div style={{ marginBottom: '20px' }}>
            <Link 
              href="/forgot-password"
              style={{
                color: '#4299e1',
                textDecoration: 'none',
                fontSize: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <span style={{
              color: '#2d3748',
              fontSize: '16px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              ¿No tienes cuenta? </span>
            <Link 
              href="/register"
              style={{
                color: '#4299e1',
                textDecoration: 'none',
                fontSize: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              Regístrate
            </Link>
          </div>

          <div>
            <Link 
              href="/privacy-policy"
              style={{
                color: '#a0aec0',
                textDecoration: 'none',
                fontSize: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              Política de privacidad ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
