'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { obtenerAdeudos, obtenerAdeudosConFechaEntrega } from '../../lib/api';
import axios from 'axios';

// Iconos SVG
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

const HashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
    solicitud_id: a.solicitud_id ?? a.id_solicitud ?? a.solicitud ?? a.solicitudId,
    solicitud_item_id:
      a.solicitud_item_id ?? a.item_id ?? a.id_item ?? a.itemId ?? `${a.solicitud_id || ''}-${a.material_id || ''}`,
    material_id: a.material_id ?? a.id_material ?? a.materialId ?? null,
    tipo: a.tipo ?? a.clase ?? a.category ?? null,
    folio: a.folio ?? a.solicitud_folio ?? a.codigo ?? '—',
    nombre_material: a.nombre_material ?? a.material_nombre ?? a.nombre ?? a.descripcion ?? '(Sin nombre)',
    cantidad: a.cantidad_pendiente ?? a.cantidad ?? a.qty ?? 0,
    unidad: a.unidad ?? unidadFromTipo(a.tipo),
    fecha_entrega: a.fecha_entrega ?? a.fecha ?? null,
  };
}

function normalizarListaAdeudos(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(normalizarAdeudo);
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
      setError('Acceso denegado');
      setLoading(false);
      return;
    }

    const loadAdeudos = async () => {
      try {
        setLoading(true);

        // 1) Traer adeudos (intenta endpoint con fecha y si no, el básico)
        let data;
        try {
          data = await obtenerAdeudosConFechaEntrega();
        } catch (_) {
          data = await obtenerAdeudos();
        }

        // 2) Normalizar
        const base = normalizarListaAdeudos(data);

        setAdeudos(base);
        setError('');

        // 3) Rellenar nombres faltantes consultando /api/materials/:id?tipo=...
        const faltan = base.filter(
          (a) =>
            (!a.nombre_material || a.nombre_material === '(Sin nombre)') &&
            a.material_id &&
            a.tipo
        );

        if (faltan.length > 0) {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          const uniquePairs = Array.from(
            new Set(faltan.map((x) => `${x.material_id}|${x.tipo}`))
          ).map((key) => {
            const [material_id, tipo] = key.split('|');
            return { material_id, tipo };
          });

          const nombreCache = {};

          await Promise.all(
            uniquePairs.map(async ({ material_id, tipo }) => {
              try {
                const { data: mat } = await axios.get(
                  `${process.env.NEXT_PUBLIC_API_URL}/api/materials/${material_id}?tipo=${encodeURIComponent(
                    tipo
                  )}`,
                  token ? { headers: { Authorization: `Bearer ${token}` } } : {}
                );
                if (mat && mat.nombre) {
                  nombreCache[`${material_id}|${tipo}`] = mat.nombre;
                }
              } catch (e) {
                // sin drama: si falla, deja "(Sin nombre)"
              }
            })
          );

          if (Object.keys(nombreCache).length > 0) {
            setAdeudos((prev) =>
              prev.map((a) => {
                if (!a.nombre_material || a.nombre_material === '(Sin nombre)') {
                  const key = `${a.material_id}|${a.tipo}`;
                  const nom = nombreCache[key];
                  if (nom) {
                    return { ...a, nombre_material: nom };
                  }
                }
                return a;
              })
            );
          }
        }
      } catch (err) {
        console.error('Error al cargar adeudos:', err);
        setError('No se pudo cargar adeudos');
      } finally {
        setLoading(false);
      }
    };

    loadAdeudos();
  }, [usuario, router]);

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    const dueDate = new Date(dateString);
    return dueDate < today;
  };

  if (loading) {
    return (
      <div className="ml-64 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="ml-64 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileTextIcon />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Adeudos Pendientes</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Gestiona y visualiza todos tus adeudos de materiales pendientes
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-6 animate-fadeIn">
            <div className="flex items-center">
              <AlertTriangleIcon />
              <div className="ml-3">
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && adeudos.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center animate-fadeIn">
            <CheckCircleIcon />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              ¡Excelente trabajo!
            </h3>
            <p className="text-gray-600 text-lg">
              No tienes adeudos pendientes en este momento.
            </p>
          </div>
        )}

        {/* Adeudos Table */}
        {!error && adeudos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
            {/* Stats Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <PackageIcon />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Total de Adeudos
                    </h3>
                    <p className="text-blue-600 font-medium">
                      {adeudos.length} {adeudos.length === 1 ? 'elemento' : 'elementos'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <HashIcon />
                        <span>Folio</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <PackageIcon />
                        <span>Material</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidad
                    </th>
                    {/* Estado: removido */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adeudos.map((a, index) => (
                    <tr
                      key={`${a.solicitud_id}-${a.solicitud_item_id}-${index}`}
                      className={`hover:bg-gray-50 transition-colors duration-200 animate-slideIn ${
                        isOverdue(a.fecha_entrega) ? 'bg-red-50' : ''
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-blue-100 p-2 rounded-lg mr-3">
                            <FileTextIcon />
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {a.folio}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {a.nombre_material}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {a.cantidad}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {a.unidad}
                        </span>
                      </td>

                      {/* Columna de Estado eliminada */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
