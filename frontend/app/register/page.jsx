'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function Register() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('alumno');
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
        rol,
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
        {/* Sección izquierda - Bienvenida */}
        <div className="col-12 col-md-6 d-flex flex-column justify-content-center align-items-center p-4 p-md-5 text-white">
          <div className="text-center" style={{ maxWidth: '480px' }}>
            <h1 className="display-4 fw-bold mb-4 text-white">Únete a<br />LabSync</h1>
            <p className="lead mb-4 text-white-50">
              Crea tu cuenta para acceder a todas las funcionalidades que LabSync tiene para ti.
            </p>
          </div>
        </div>

        {/* Sección derecha - Formulario */}
       <div className="col-12 col-md-6 offset-md-6 d-flex flex-column justify-content-center p-4 p-md-5">
          <div className="w-100" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="mb-4">
              <h2 className="fw-bold text-white mb-1">Crear cuenta</h2>
              <p className="text-white-50 small">Completa los datos para crear tu cuenta en LabSync</p>
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
                <label htmlFor="nombre" className="form-label fw-semibold text-white mb-2">Nombre Completo</label>
                <input
                  type="text"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="form-control bg-transparent border-white text-white"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1) !important',
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    padding: '12px 16px',
                    fontSize: '16px'
                  }}
                  placeholder="Ingresa tu nombre"
                  required
                />
              </div>

              {/* Correo */}
              <div className="mb-4">
                <label htmlFor="correo" className="form-label fw-semibold text-white mb-2">Correo Institucional</label>
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

              {/* Contraseña */}
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
                    placeholder="Crea una contraseña"
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

              {/* Rol */}
              <div className="mb-4">
                <label className="form-label fw-semibold text-white mb-3">Selecciona tu rol</label>
                <div className="d-flex gap-2">
                  {[
                    { value: 'alumno', label: 'Alumno', color: 'primary' },
                    { value: 'docente', label: 'Docente', color: 'secondary' },
                    { value: 'almacen', label: 'Almacén', color: 'dark' },
                  ].map(({ value, label, color }) => (
                    <div key={value} className="flex-grow-1">
                      <input
                        type="radio"
                        name="rol"
                        id={`rol-${value}`}
                        value={value}
                        checked={rol === value}
                        onChange={() => setRol(value)}
                        className="d-none"
                      />
                      <label
                        htmlFor={`rol-${value}`}
                        className={`w-100 btn fw-semibold text-center d-block`}
                        style={{
                          backgroundColor: rol === value ? '#d4634a' : 'rgba(255,255,255,0.1)',
                          borderColor: rol === value ? '#d4634a' : 'rgba(255,255,255,0.3)',
                          color: 'white',
                          border: '1px solid',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          padding: '12px 8px',
                          fontSize: '14px'
                        }}
                      >
                        {label}
                      </label>
                    </div>
                  ))}
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
                Crear cuenta
              </button>
            </form>

            <p className="text-center text-white-50">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-white fw-bold text-decoration-none">Inicia sesión</Link>
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
        
        label:hover {
          background-color: rgba(255,255,255,0.15) !important;
        }
      `}</style>
    </div>
  );
}
