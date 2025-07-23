'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import axios from 'axios';

export default function Configuracion() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);

  // Verificar que el usuario es administrador
  if (!usuario || usuario.rol_id !== 4) {
    router.push('/login');
    return null;
  }

  // Cargar lista de usuarios al montar el componente
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/usuarios`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Excluir al administrador actual
        setUsuarios(response.data.filter(u => u.correo_institucional !== usuario.correo));
        setLoadingUsuarios(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar usuarios');
        setLoadingUsuarios(false);
      }
    };
    fetchUsuarios();
  }, [usuario.correo]);

  // Manejar agregar usuario
  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones en el frontend
    if (!nombre || !correo || !rol) {
      setError('Nombre, correo y rol son obligatorios');
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
    if (contrasena && contrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/adminAddUser`,
        { nombre, correo_institucional: correo, rol, contrasena },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(response.data.mensaje || 'Usuario agregado exitosamente');
      setNombre('');
      setCorreo('');
      setContrasena('');
      setRol('');
      // Actualizar la lista de usuarios
      const updatedUsuarios = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/usuarios`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsuarios(updatedUsuarios.data.filter(u => u.correo_institucional !== usuario.correo));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al agregar usuario');
      console.error('Error en adminAddUser:', err.response?.data);
    }
  };

  // Manejar eliminar usuario
  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/deleteUser/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Usuario eliminado exitosamente');
      setUsuarios(usuarios.filter(u => u.id !== userId));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar usuario');
      console.error('Error en deleteUser:', err.response?.data);
    }
  };

  return (
    <div className="container-fluid bg-white bg-opacity-95 rounded-4 shadow-lg p-3 p-md-4">
      <h2 className="fw-bold text-dark mb-4">Configuración</h2>
      
      {/* Mensajes de éxito o error */}
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

      {/* Formulario para agregar usuario */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="card-title fw-semibold text-dark mb-3">Agregar nuevo usuario</h3>
          <form onSubmit={handleAddUser}>
            <div className="mb-3">
              <label htmlFor="nombre" className="form-label fw-semibold text-dark">Nombre completo</label>
              <input
                type="text"
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="form-control"
                placeholder="Nombre completo"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="correo" className="form-label fw-semibold text-dark">Correo institucional</label>
              <input
                type="email"
                id="correo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="form-control"
                placeholder="ejemplo@utsjr.edu.mx"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="contrasena" className="form-label fw-semibold text-dark">Contraseña (opcional)</label>
              <input
                type="password"
                id="contrasena"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="form-control"
                placeholder="Dejar en blanco para generar automáticamente"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="rol" className="form-label fw-semibold text-dark">Rol</label>
              <select
                id="rol"
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="form-control"
                required
              >
                <option value="">Selecciona un rol</option>
                <option value="docente">Docente</option>
                <option value="almacen">Almacen</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-100">
              Agregar usuario
            </button>
          </form>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="card">
        <div className="card-body">
          <h3 className="card-title fw-semibold text-dark mb-3">Usuarios existentes</h3>
          {loadingUsuarios ? (
            <p>Cargando usuarios...</p>
          ) : usuarios.length === 0 ? (
            <p>No hay usuarios para mostrar.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td>{u.nombre}</td>
                      <td>{u.correo_institucional}</td>
                      <td>{u.rol_id === 1 ? 'Alumno' : u.rol_id === 2 ? 'Docente' : u.rol_id === 3 ? 'Almacen' : 'Administrador'}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
