//frontend/app/chat/page.jsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import axios from 'axios';

export default function Chat() {
  const { usuario } = useAuth();
  const [contactos, setContactos] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const router = useRouter();
  const chatContainerRef = useRef(null);

  // this env var already includes "/api"
  const BASE = process.env.NEXT_PUBLIC_API_URL; // e.g. "http://localhost:5000/api"

  useEffect(() => {
    if (!usuario) {
      // No hacer nada si usuario aún no está cargado
      return;
    }
    
    // Docentes no pueden usar el chat
    if (usuario.rol === 'docente') {
      setError('Los docentes no tienen acceso al chat');
      router.push('/catalog');
      return;
    }
    // Solo alumnos y almacenistas pueden usar el chat
    if (usuario.rol !== 'alumno' && usuario.rol !== 'almacen') {
      setError('No tienes permisos para usar el chat');
      router.push('/catalog');
      return;
    }
    cargarContactos();
  }, [usuario, router]);

  async function cargarContactos() {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token de autenticación no encontrado');
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data } = await axios.get(
        `${BASE}/messages/users`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setContactos(data);
      
      // Si no hay contactos y es almacenista, mostrar mensaje informativo
      if (data.length === 0 && usuario.rol === 'almacen') {
        setError('No hay alumnos que hayan iniciado conversación contigo aún');
      }
    } catch (err) {
      console.error('[Chat] cargarContactos:', err);
      if (err.response?.status === 401) {
        setError('Sesión expirada. Inicia sesión nuevamente');
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError(err.response?.data?.error || 'Error al cargar contactos');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedUser) {
      cargarMensajes();
    }
  }, [selectedUser]);

  async function cargarMensajes() {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token de autenticación no encontrado');
      router.push('/login');
      return;
    }

    try {
      setLoadingMensajes(true);
      setError('');

      const { data } = await axios.get(
        `${BASE}/messages/${selectedUser.id}`,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      setMensajes(data);
    } catch (err) {
      console.error('[Chat] cargarMensajes:', err);
      if (err.response?.status === 401) {
        setError('Sesión expirada. Inicia sesión nuevamente');
        localStorage.removeItem('token');
        router.push('/login');
      } else if (err.response?.status === 403) {
        setError('No tienes permisos para ver mensajes con este usuario');
      } else {
        setError(err.response?.data?.error || 'Error al cargar mensajes');
      }
    } finally {
      setLoadingMensajes(false);
    }
  }

  // scroll down on new mensaje
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [mensajes]);

  async function handleEnviarMensaje() {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token de autenticación no encontrado');
      router.push('/login');
      return;
    }

    if (!nuevoMensaje.trim()) {
      setError('Escribe un mensaje antes de enviar');
      return;
    }

    if (!selectedUser) {
      setError('Selecciona un usuario para enviar el mensaje');
      return;
    }

    try {
      setError('');
      
      const { data } = await axios.post(
        `${BASE}/messages/send`,
        { 
          contenido: nuevoMensaje.trim(), 
          receptor_id: selectedUser.id 
        },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      // Agregar el mensaje a la lista local
      setMensajes(prevMensajes => [...prevMensajes, data]);
      setNuevoMensaje('');
      
      // Si es el primer mensaje de un almacenista, recargar contactos
      if (usuario.rol === 'almacen') {
        cargarContactos();
      }
    } catch (err) {
      console.error('[Chat] handleEnviarMensaje:', err);
      if (err.response?.status === 401) {
        setError('Sesión expirada. Inicia sesión nuevamente');
        localStorage.removeItem('token');
        router.push('/login');
      } else if (err.response?.status === 403) {
        setError('No tienes permisos para enviar mensajes a este usuario');
      } else {
        setError(err.response?.data?.error || 'Error al enviar mensaje');
      }
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensaje();
    }
  }

  // Formatear fecha del mensaje
  function formatearFecha(fecha) {
    const ahora = new Date();
    const fechaMensaje = new Date(fecha);
    const diferencia = ahora - fechaMensaje;
    const diasDiferencia = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (diasDiferencia === 0) {
      return fechaMensaje.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diasDiferencia === 1) {
      return 'Ayer ' + fechaMensaje.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return fechaMensaje.toLocaleDateString() + ' ' + fechaMensaje.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  return (
    <div className="ml-64 bg-white p-4 min-h-screen">
      {/* Mostrar loading mientras se carga el usuario */}
      {!usuario ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Verificando autenticación...</p>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="text-3xl fw-bold text-dark">
              <i className="bi bi-chat-dots-fill me-2" />
              {usuario?.rol === 'alumno' ? 'Chat con Almacén' : 'Chat con Alumnos'}
            </h1>
            <small className="text-muted">
              <i className="bi bi-info-circle me-1" />
              Los mensajes se eliminan automáticamente después de 7 días
            </small>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center mb-4">
              <i className="bi bi-exclamation-triangle-fill me-2" />
              {error}
            </div>
          )}

          <div className="row">
            {/* ───── CONTACTOS ───── */}
            <div className="col-12 col-md-4 col-lg-3 bg-light shadow p-3 mb-3 mb-md-0 rounded">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">
                  <i className="bi bi-people-fill me-2" />
                  {usuario?.rol === 'alumno' ? 'Almacenistas' : 'Alumnos'}
                </h5>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={cargarContactos}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-clockwise" />
                </button>
              </div>

              {loading ? (
                <div className="text-center p-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="small text-muted mt-2">Cargando contactos...</p>
                </div>
              ) : contactos.length === 0 ? (
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2" />
                  {usuario?.rol === 'alumno' 
                    ? 'No hay almacenistas disponibles' 
                    : 'No hay conversaciones iniciadas aún'
                  }
                </div>
              ) : (
                <div className="list-group">
                  {contactos.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`list-group-item list-group-item-action d-flex align-items-center ${
                        selectedUser?.id === c.id ? 'active' : ''
                      }`}
                      onClick={() => setSelectedUser(c)}
                    >
                      <div className="me-2">
                        <div
                          className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: 36, height: 36 }}
                        >
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="text-start">
                        <strong>{c.nombre}</strong>
                        <div className="small text-muted">{c.rol}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ───── CHAT WINDOW ───── */}
            <div className="col-12 col-md-8 col-lg-9 bg-light shadow p-3 rounded">
              {selectedUser ? (
                <>
                  <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                    <div
                      className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: 40, height: 40 }}
                    >
                      {selectedUser.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="mb-0 fw-bold">{selectedUser.nombre}</h5>
                      <small className="text-muted">{selectedUser.rol}</small>
                    </div>
                  </div>

                  <div
                    ref={chatContainerRef}
                    className="border rounded p-3 mb-3 bg-white"
                    style={{ height: 400, overflowY: 'auto' }}
                  >
                    {loadingMensajes ? (
                      <div className="text-center p-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Cargando mensajes...</span>
                        </div>
                        <p className="small text-muted mt-2">Cargando conversación...</p>
                      </div>
                    ) : mensajes.length === 0 ? (
                      <div className="text-center text-muted p-4">
                        <i className="bi bi-chat-square-text fs-1" />
                        <p className="mt-2">No hay mensajes. Envía uno para iniciar la conversación.</p>
                        <small className="text-muted">
                          Recuerda: Los mensajes se eliminan automáticamente después de 7 días
                        </small>
                      </div>
                    ) : (
                      mensajes.map((m) => (
                        <div
                          key={m.id}
                          className={`mb-3 ${m.emisor_id === usuario?.id ? 'text-end' : 'text-start'}`}
                        >
                          <div
                            className={`d-inline-block p-3 rounded ${
                              m.emisor_id === usuario?.id 
                                ? 'bg-primary text-white' 
                                : 'bg-white text-dark border'
                            }`}
                            style={{ maxWidth: '80%' }}
                          >
                            <p className="mb-1">{m.contenido}</p>
                            <small
                              className={`d-block text-xs ${
                                m.emisor_id === usuario?.id ? 'text-white-50' : 'text-muted'
                              }`}
                            >
                              {formatearFecha(m.fecha_envio)}
                            </small>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="input-group">
                    <textarea
                      rows={1}
                      style={{ resize: 'none' }}
                      className="form-control bg-light border rounded-start"
                      placeholder="Escribe un mensaje..."
                      value={nuevoMensaje}
                      onChange={(e) => setNuevoMensaje(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={loadingMensajes}
                    />
                    <button
                      className="btn btn-primary rounded-end"
                      onClick={handleEnviarMensaje}
                      disabled={!nuevoMensaje.trim() || loadingMensajes}
                    >
                      <i className="bi bi-send-fill" />
                    </button>
                  </div>
                </>
              ) : (
                <div
                  className="text-center text-muted d-flex align-items-center justify-content-center"
                  style={{ minHeight: 300 }}
                >
                  <div>
                    <i className="bi bi-chat-left-text fs-1" />
                    <p className="mt-3">
                      {contactos.length === 0 
                        ? 'No hay contactos disponibles' 
                        : 'Selecciona un contacto para comenzar a chatear'
                      }
                    </p>
                    <small className="text-muted">
                      {usuario?.rol === 'alumno' 
                        ? 'Puedes chatear con cualquier almacenista' 
                        : 'Solo puedes ver alumnos que te hayan escrito'
                      }
                    </small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}