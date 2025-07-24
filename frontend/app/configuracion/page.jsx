'use client';
import { useAuth } from '../../lib/auth';

export default function Configuracion() {
  const { usuario } = useAuth();

  // Verificar que el usuario es administrador (solo estructura, sin redirección)
  if (!usuario || usuario.rol_id !== 4) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Contenido principal desplazado al lado del sidebar */}
      <main className="flex-1 ml-64 p-3 p-md-4 bg-white bg-opacity-95 rounded-4 shadow-lg">
        <h2 className="fw-bold text-dark mb-4">Configuración</h2>

        {/* Placeholder para mensajes de éxito o error */}
        <div className="mb-4">
          <div className="alert alert-danger d-flex align-items-center rounded shadow-sm">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Placeholder para mensaje de error
          </div>
          <div className="alert alert-success d-flex align-items-center rounded shadow-sm">
            <i className="bi bi-check-circle-fill me-2"></i>
            Placeholder para mensaje de éxito
          </div>
        </div>

        {/* Placeholder para formulario de agregar usuario */}
        <div className="card mb-4">
          <div className="card-body">
            <h3 className="card-title fw-semibold text-dark mb-3">Agregar nuevo usuario</h3>
            <form>
              <div className="mb-3">
                <label htmlFor="nombre" className="form-label fw-semibold text-dark">Nombre completo</label>
                <input
                  type="text"
                  id="nombre"
                  className="form-control"
                  placeholder="Nombre completo"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="correo" className="form-label fw-semibold text-dark">Correo institucional</label>
                <input
                  type="email"
                  id="correo"
                  className="form-control"
                  placeholder="ejemplo@utsjr.edu.mx"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="contrasena" className="form-label fw-semibold text-dark">Contraseña (opcional)</label>
                <input
                  type="password"
                  id="contrasena"
                  className="form-control"
                  placeholder="Dejar en blanco para generar automáticamente"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="rol" className="form-label fw-semibold text-dark">Rol</label>
                <select
                  id="rol"
                  className="form-control"
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

        {/* Placeholder para tabla de usuarios */}
        <div className="card">
          <div className="card-body">
            <h3 className="card-title fw-semibold text-dark mb-3">Usuarios existentes</h3>
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
                  <tr>
                    <td>Placeholder Nombre</td>
                    <td>placeholder@utsjr.edu.mx</td>
                    <td>Docente</td>
                    <td>
                      <button className="btn btn-danger btn-sm">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>Placeholder Nombre</td>
                    <td>placeholder2@utsjr.edu.mx</td>
                    <td>Almacen</td>
                    <td>
                      <button className="btn btn-danger btn-sm">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
