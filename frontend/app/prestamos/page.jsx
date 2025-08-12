'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import {
  obtenerPrestamosEntregados,
  obtenerDetalleSolicitud,
  actualizarAdeudo
} from '../../lib/api';

const parseDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDate = (str) => {
  const date = parseDate(str);
  return date ? date.toLocaleDateString() : 'Sin fecha';
};

const isOverdue = (str) => {
  const date = parseDate(str);
  if (!date) return false;
  const today = new Date();
  return date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

export default function Prestamos() {
  const { usuario } = useAuth();
  const [prestamos, setPrestamos] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // 1) Al montar, cargar sólo si es almacenista
  useEffect(() => {
    if (usuario === null) return; 
    if (usuario.rol !== 'almacen') {
      router.push('/login');
      return;
    }
    loadPrestamos();
  }, [usuario, router]);

  // 2) Traer y agrupar por solicitud_id
const loadPrestamos = async () => {
  setLoading(true);
  try {
    const data = await obtenerPrestamosEntregados();
    const grouped = Object.values(
      data.reduce((acc, item) => {
        if (!acc[item.solicitud_id]) {
          acc[item.solicitud_id] = {
            solicitud_id: item.solicitud_id,
            folio: item.folio,
            nombre_alumno: item.nombre_alumno,
             profesor: item.profesor,
            fecha_devolucion: item.fecha_devolucion,
          };
        }
        return acc;
      }, {})
    );
    setPrestamos(grouped);
    return grouped;
  } catch (err) {
    console.error('Error cargando préstamos:', err);
    alert('No se pudieron cargar los préstamos entregados');
    return [];
  } finally {
    setLoading(false);
  }
};

  // 3) Filtrar por folio
  const filtered = prestamos.filter(p =>
    p.folio.toLowerCase().includes(filter.toLowerCase())
  );

  // 4) Abrir modal y cargar detalle
  const openModal = async solicitud_id => {
    try {
      const det = await obtenerDetalleSolicitud(solicitud_id);
      setDetalle(det);
      setSelectedSolicitud(solicitud_id);
      setShowModal(true);
    } catch (err) {
      console.error('Error al obtener detalle:', err);
      alert('No se pudo obtener el detalle del préstamo');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setDetalle(null);
    setSelectedSolicitud(null);
  };

const handleSave = async () => {
  setSaving(true);
  try {
    const entregados = detalle.items
      .filter(item => item.entregado)
      .map(item => item.item_id);

    await actualizarAdeudo(selectedSolicitud, entregados);

    // recarga la lista y comprueba si el préstamo sigue existiendo
    const grouped = await loadPrestamos();
    if (!grouped.some(g => g.solicitud_id === selectedSolicitud)) {
      return closeModal();
    }

    // si aún existe, recarga detalle; y si ya no hay ítems, cierra también
    const nuevoDetalle = await obtenerDetalleSolicitud(selectedSolicitud);
    if (nuevoDetalle.items.length === 0) {
      return closeModal();
    }
    setDetalle(nuevoDetalle);

  } catch (err) {
    console.error('Error al guardar devolución:', err);
    alert('No se pudo guardar la devolución');
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="ml-64 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-800 text-white px-8 py-12">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-slate-700 rounded-xl">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold">Préstamos Entregados</h1>
            <p className="text-slate-300 mt-2">Gestiona las devoluciones de materiales</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Barra de búsqueda */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-full max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por folio..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all duration-200"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-600"></div>
          </div>
        )}
{/* Cards Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {filtered.map((sol, index) => {
    const overdue = isOverdue(sol.fecha_devolucion);
    const nombre = sol.nombre_alumno || sol.profesor;

    return (
      <div
        key={sol.solicitud_id}
        onClick={() => openModal(sol.solicitud_id)}
        className={`bg-white rounded-xl shadow-sm hover:shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 animate-fadeInUp ${overdue ? 'border-2 border-red-500' : ''}`}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-slate-600 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-2xl font-bold text-slate-800">
              {sol.folio}
            </div>
            <div className="flex items-center space-x-2 text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm">{nombre}</span>
            </div>
           <div className="text-sm text-slate-600">Devolver: {formatDate(sol.fecha_devolucion)}</div>
            {overdue && (
              <div className="text-xs text-red-600 font-semibold">Vencido</div>
            )}
          </div>
        </div>
      </div>
    );
  })}
</div>


        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="p-4 bg-slate-100 rounded-xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-600 mb-2">No hay préstamos</h3>
            <p className="text-slate-500">No se encontraron préstamos entregados</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && detalle && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-11/12 lg:w-4/5 max-w-5xl max-h-[90vh] overflow-hidden animate-slideInUp">
            {/* Header del Modal */}
            <div className="bg-slate-800 text-white px-8 py-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-700 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold">Detalle del Préstamo</h2>
                </div>
                <button 
                  onClick={closeModal} 
                  className="text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl p-2 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-600 rounded-xl">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2C7 1.44772 7.44772 1 8 1H16C16.5523 1 17 1.44772 17 2V4M7 4H5C4.44772 4 4 4.44772 4 5V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V5C20 4.44772 19.5523 4 19 4H17M7 4H17" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 uppercase font-medium">Folio</span>
                      <span className="block font-bold text-lg text-slate-800">{detalle.folio}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-600 rounded-xl">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 01-4-4V7a4 4 0 118 0v4a4 4 0 01-4 4z" />
                      </svg>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500 uppercase font-medium">Fecha Entrega</span>
                      <span className="block font-bold text-lg text-slate-800">
                         {formatDate(detalle.fecha_devolucion)}
                      </span>
                    </div>
                  </div>
                </div>
 {detalle.nombre_alumno && (
                  <div className="bg-slate-50 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-600 rounded-xl">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 uppercase font-medium">Solicitante</span>
                        <span className="block font-bold text-lg text-slate-800">{detalle.nombre_alumno}</span>
                      </div>
                    </div>
                  </div>
                )}

                {detalle.profesor && (
                  <div className="bg-slate-50 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-600 rounded-xl">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 uppercase font-medium">Profesor</span>
                        <span className="block font-bold text-lg text-slate-800">{detalle.profesor}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabla de materiales */}
              <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Materiales por Devolver</span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Devuelto
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Material
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Cantidad
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Unidad
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {detalle.items.map((item, index) => (
                          <tr key={item.item_id} className="hover:bg-slate-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  value={item.item_id}
                                  onChange={e => {
                                    item.entregado = e.target.checked;
                                    setDetalle({ ...detalle });
                                  }}
                                  className="h-5 w-5 text-slate-600 focus:ring-slate-500 rounded transition-colors duration-200"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-slate-100 rounded-xl">
                                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-900">{item.nombre_material}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-sm font-medium text-slate-900">{item.cantidad}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                {item.tipo === 'liquido' ? 'ml' : item.tipo === 'solido' ? 'g' : 'u'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3 rounded-xl text-slate-700 hover:bg-slate-100 transition-all duration-200 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Guardar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInUp {
          from { 
            opacity: 0;
            transform: translateY(100px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.4s ease-out;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
