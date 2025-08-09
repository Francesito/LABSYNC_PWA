'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { obtenerAdeudos, obtenerAdeudosConFechaEntrega } from '../../lib/api';
import axios from 'axios';

// Iconos modernos
const FileTextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PackageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-12">
    <div className="relative">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
      </div>
    </div>
  </div>
);

/* ===========================
   Helpers de normalización
   =========================== */
function unidadFromTipo(tipo) {
  const t = (tipo || '').toLowerCase();
  if (t === 'liquido') return 'ml';
  if (t === 'solido') return 'g';
  return 'u'; // equipo / laboratorio / fallback
}

function normalizarAdeudo(a) {
  return {
    id: a.id || `${a.solicitud_id || ''}-${a.material_id || ''}`,
    solicitud_id: a.solicitud_id ?? a.id_solicitud ?? a.solicitud ?? a.solicitudId,
    solicitud_item_id: a.solicitud_item_id ?? a.item_id ?? a.id_item ?? a.itemId ?? `${a.solicitud_id || ''}-${a.material_id || ''}`,
    material_id: a.material_id ?? a.id_material ?? a.materialId ?? null,
    tipo: a.tipo ?? a.clase ?? a.category ?? null,
    folio: a.folio ?? a.solicitud_folio ?? a.codigo ?? '—',
    nombre_material: a.nombre_material ?? a.material_nombre ?? a.nombre ?? a.descripcion ?? null,
    cantidad: a.cantidad_pendiente ?? a.cantidad ?? a.qty ?? 0,
    unidad: a.unidad ?? unidadFromTipo(a.tipo),
    fecha_entrega: a.fecha_entrega ?? a.fecha ?? null,
  };
}

function normalizarListaAdeudos(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(normalizarAdeudo);
}

// Helper para obtener el nombre del material desde la API
async function obtenerNombreMaterial(materialId, tipo) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const { data: material } = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/materials/${materialId}?tipo=${encodeURIComponent(tipo)}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    );
    return material?.nombre || null;
  } catch (error) {
    console.warn(`Error al obtener material ${materialId} tipo ${tipo}:`, error);
    return null;
  }
}

export default function Adeudos() {
  const { usuario } = useAuth();
  const [adeudos, setAdeudos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (usuario === null) return; // Espera a auth

    if (!usuario) {
      router.push('/login');
      return;
    }

    if (!['alumno', 'docente'].includes(usuario.rol)) {
      setError('Acceso denegado: Solo alumnos y docentes pueden ver adeudos');
      setLoading(false);
      return;
    }

    const loadAdeudos = async () => {
      try {
        setLoading(true);
        setError('');

        // 1) Obtener adeudos básicos
        let data;
        try {
          data = await obtenerAdeudosConFechaEntrega();
        } catch (_) {
          data = await obtenerAdeudos();
        }

        // 2) Normalizar datos
        const adeudosNormalizados = normalizarListaAdeudos(data);
        
        if (adeudosNormalizados.length === 0) {
          setAdeudos([]);
          setLoading(false);
          return;
        }

        // 3) Identificar materiales sin nombre
        const materialesSinNombre = adeudosNormalizados.filter(
          a => (!a.nombre_material || a.nombre_material.trim() === '') && a.material_id && a.tipo
        );

        // 4) Obtener nombres faltantes
        if (materialesSinNombre.length > 0) {
          console.log(`Obteniendo nombres para ${materialesSinNombre.length} materiales...`);
          
          const nombrePromises = materialesSinNombre.map(async (adeudo) => {
            const nombre = await obtenerNombreMaterial(adeudo.material_id, adeudo.tipo);
            return {
              id: adeudo.id,
              material_id: adeudo.material_id,
              tipo: adeudo.tipo,
              nombre: nombre
            };
          });

          const nombresObtenidos = await Promise.all(nombrePromises);
          
          // 5) Actualizar adeudos con nombres obtenidos
          const adeudosConNombres = adeudosNormalizados.map(adeudo => {
            if (!adeudo.nombre_material || adeudo.nombre_material.trim() === '') {
              const nombreInfo = nombresObtenidos.find(
                n => n.material_id === adeudo.material_id && n.tipo === adeudo.tipo
              );
              if (nombreInfo && nombreInfo.nombre) {
                return { ...adeudo, nombre_material: nombreInfo.nombre };
              }
            }
            return adeudo;
          });

          setAdeudos(adeudosConNombres);
        } else {
          setAdeudos(adeudosNormalizados);
        }

      } catch (err) {
        console.error('Error al cargar adeudos:', err);
        setError('Error al cargar los adeudos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    loadAdeudos();
  }, [usuario, router]);

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    try {
      const today = new Date();
      const dueDate = new Date(dateString);
      return dueDate < today;
    } catch {
      return false;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  if (loading) {
    return (
      <div className="ml-64 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="pt-8">
          <LoadingSpinner />
          <p className="text-center text-slate-600 mt-4">Cargando adeudos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-64 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header moderno */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm">
              <FileTextIcon />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-1">
                Adeudos Pendientes
              </h1>
              <p className="text-slate-600">
                Gestiona tus materiales en préstamo
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 animate-fade-in">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 p-1 bg-red-100 rounded-lg">
                <AlertTriangleIcon />
              </div>
              <div>
                <h3 className="text-red-900 font-semibold mb-1">Error al cargar adeudos</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && adeudos.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center animate-fade-in">
            <div className="flex justify-center mb-6">
              <CheckCircleIcon />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              ¡Todo al día! 🎉
            </h3>
            <p className="text-slate-600 text-lg">
              No tienes adeudos pendientes en este momento.
            </p>
          </div>
        )}

        {/* Adeudos List */}
        {!error && adeudos.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <PackageIcon />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Total de Adeudos
                    </h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {adeudos.length}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">Materiales en préstamo</p>
                  <p className="text-lg font-semibold text-slate-700">
                    {adeudos.reduce((sum, a) => sum + (a.cantidad || 0), 0)} unidades
                  </p>
                </div>
              </div>
            </div>

            {/* Adeudos Grid */}
            <div className="grid gap-4">
              {adeudos.map((adeudo, index) => {
                const isLate = isOverdue(adeudo.fecha_entrega);
                return (
                  <div
                    key={adeudo.id || index}
                    className={`bg-white rounded-xl shadow-sm border transition-all duration-300 hover:shadow-md animate-slide-up ${
                      isLate 
                        ? 'border-red-200 bg-red-50' 
                        : 'border-slate-200 hover:border-blue-200'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        {/* Folio y Estado */}
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${isLate ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <FileTextIcon />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Folio</p>
                            <p className="font-semibold text-slate-900">{adeudo.folio}</p>
                          </div>
                        </div>

                        {/* Badge de estado */}
                        {isLate && (
                          <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                            <ClockIcon />
                            <span>Vencido</span>
                          </div>
                        )}
                      </div>

                      {/* Información del material */}
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <p className="text-sm text-slate-500 mb-1">Material</p>
                          <p className="font-semibold text-slate-900 text-lg">
                            {adeudo.nombre_material || `Material ID: ${adeudo.material_id} (${adeudo.tipo})`}
                          </p>
                          {adeudo.tipo && (
                            <span className="inline-block mt-2 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium uppercase">
                              {adeudo.tipo}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between md:justify-end items-center space-x-6">
                          {/* Cantidad */}
                          <div className="text-center">
                            <p className="text-sm text-slate-500 mb-1">Cantidad</p>
                            <div className="flex items-center space-x-1">
                              <span className="text-2xl font-bold text-blue-600">
                                {adeudo.cantidad || 0}
                              </span>
                              <span className="text-sm text-slate-500 font-medium">
                                {adeudo.unidad}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fecha de entrega */}
                      {adeudo.fecha_entrega && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center space-x-2 text-sm">
                            <ClockIcon />
                            <span className="text-slate-500">Entregado el:</span>
                            <span className={`font-medium ${isLate ? 'text-red-600' : 'text-slate-700'}`}>
                              {formatDate(adeudo.fecha_entrega)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Estilos CSS */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
