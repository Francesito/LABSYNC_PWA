// File: frontend/lib/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,  // <-- quitar el "/api" extra
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
  
  try {
    // Primero intentamos obtener adeudos con fecha de entrega
    const { data } = await API.get(
      '/adeudos/usuario/detallado',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  } catch (error) {
    // Si el endpoint detallado no existe, usamos el original
    console.warn('Endpoint detallado no disponible, usando endpoint básico');
    const { data } = await API.get(
      '/adeudos/usuario',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
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
  
  try {
    // Intentamos obtener los adeudos básicos
    const { data: adeudos } = await API.get(
      '/adeudos/usuario',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('Adeudos básicos obtenidos:', adeudos); // Debug
    
    // Si no hay adeudos, retornamos array vacío
    if (!adeudos || adeudos.length === 0) {
      return [];
    }
    
    // Para cada adeudo, obtenemos los detalles de la solicitud para obtener la fecha de entrega
    const adeudosConFecha = await Promise.all(
      adeudos.map(async (adeudo) => {
        try {
          console.log(`Obteniendo detalle para solicitud ${adeudo.solicitud_id}`); // Debug
          
          const { data: detalleSolicitud } = await API.get(
            `/materials/solicitudes/${adeudo.solicitud_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          console.log(`Detalle solicitud ${adeudo.solicitud_id}:`, detalleSolicitud); // Debug
          
          // Buscar la fecha de entrega en diferentes campos posibles
          let fechaEntrega = null;
          
          if (detalleSolicitud.fecha_entrega) {
            fechaEntrega = detalleSolicitud.fecha_entrega;
          } else if (detalleSolicitud.updated_at && detalleSolicitud.estado === 'entregado') {
            fechaEntrega = detalleSolicitud.updated_at;
          } else if (detalleSolicitud.fecha_aprobacion && detalleSolicitud.estado === 'entregado') {
            fechaEntrega = detalleSolicitud.fecha_aprobacion;
          }
          
          // También verificar si hay fecha en el objeto adeudo
          if (!fechaEntrega && adeudo.fecha_entrega) {
            fechaEntrega = adeudo.fecha_entrega;
          }
          
          // Si aún no tenemos fecha, intentar desde préstamos
          if (!fechaEntrega) {
            fechaEntrega = await obtenerFechaEntregaPrestamo(adeudo.solicitud_id);
          }
          
          console.log(`Fecha entrega encontrada para ${adeudo.solicitud_id}: ${fechaEntrega}`); // Debug
          
          return {
            ...adeudo,
            fecha_entrega: fechaEntrega,
            estado_solicitud: detalleSolicitud.estado
          };
        } catch (error) {
          console.warn(`No se pudo obtener detalle para solicitud ${adeudo.solicitud_id}:`, error);
          return {
            ...adeudo,
            fecha_entrega: null,
            estado_solicitud: 'desconocido'
          };
        }
      })
    );
    
    console.log('Adeudos con fecha final:', adeudosConFecha); // Debug
    return adeudosConFecha;
  } catch (error) {
    console.error('Error obteniendo adeudos con fecha de entrega:', error);
    throw error;
  }
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