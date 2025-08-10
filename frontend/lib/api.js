// File: frontend/lib/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`, 
});

// --- Solicitudes (alumno/docente) ---
export async function obtenerSolicitudes() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');
  const { data } = await API.get(
    '/materials/usuario/solicitudes',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function aprobarSolicitud(id) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');
  await API.post(
    `/materials/solicitud/${id}/aprobar`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function rechazarSolicitud(id) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');
  await API.post(
    `/materials/solicitud/${id}/rechazar`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// --- Adeudos (alumno/docente) ---
export async function obtenerAdeudos() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');

  // Primero intenta el endpoint que ya incluye fecha_entrega
  try {
    const { data } = await API.get(
      '/materials/adeudos/entrega',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data; // ← incluye nombre_material y fecha_entrega
  } catch (e) {
    // Fallback al básico
    const { data } = await API.get(
      '/materials/adeudos',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data; // ← incluye nombre_material
  }
}

// --- Función adicional para obtener fecha de entrega desde préstamos ---
export async function obtenerFechaEntregaPrestamo(solicitudId) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');
  
  try {
    // Intentar obtener desde préstamos entregados
    const { data: prestamos } = await API.get(
      '/materials/solicitudes/entregadas',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const prestamo = prestamos.find(p => p.solicitud_id === solicitudId || p.id === solicitudId);
    if (prestamo) {
      return prestamo.fecha_entrega || prestamo.updated_at || prestamo.created_at;
    }
    
    return null;
  } catch (error) {
    console.warn('No se pudo obtener fecha desde préstamos:', error);
    return null;
  }
}

// --- Función mejorada para obtener adeudos con fecha de entrega ---
export async function obtenerAdeudosConFechaEntrega() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');

  // Usa directamente el endpoint correcto del backend
  const { data } = await API.get(
    '/materials/adeudos/entrega',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data; // ← ya viene nombre_material + fecha_entrega desde el backend
}

// --- Préstamos entregados (almacenista) ---
export async function obtenerPrestamosEntregados() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');
  const { data } = await API.get(
    '/materials/solicitudes/entregadas',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

// --- Detalle de una solicitud entregada (almacenista) ---
export async function obtenerDetalleSolicitud(solicitudId) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');
  const { data } = await API.get(
    `/materials/solicitudes/${solicitudId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

// --- Ajustar adeudo tras devolución parcial (almacenista) ---
export async function actualizarAdeudo(solicitudId, entregados) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay token de autenticación');
  const { data } = await API.post(
    `/adeudos/ajustar/${solicitudId}`,
    { entregados },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return data;
}
