// frontend/app/solicitudes/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const logoUT = '/logoUtsjr.png';
const encabezadoUT = '/universidad.png';

// Componente para el estado simplificado
const EstadoBadge = ({ estado }) => {
  const config = {
    aprobada: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: '✓'
    },
    rechazada: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: '✗'
    },
    pendiente: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      icon: '⏳'
    },
    entregado: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: '📦'
    },
    cancelado: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: '❌'
    }
  };

  const { bg, text, icon } = config[estado] || config.cancelado;

  return (
    <span className={`${bg} ${text} inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium`}>
      <span>{icon}</span>
      <span className="capitalize">{estado}</span>
    </span>
  );
};

// Skeleton loading simplificado
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-3 bg-gray-100 rounded w-16"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
    <td className="px-6 py-4">
      <div className="space-y-2">
        <div className="h-6 bg-gray-100 rounded w-full"></div>
        <div className="h-6 bg-gray-100 rounded w-full"></div>
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-20"></div></td>
    <td className="px-6 py-4">
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-24"></div>
      </div>
    </td>
  </tr>
);

export default function Solicitudes() {
  const { usuario } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const router = useRouter();

  useEffect(() => {
    setLastUpdate(new Date().toLocaleString('es-MX'));
  }, []);

  useEffect(() => {
    if (usuario === null) return;
    if (!usuario) {
      setError('Inicia sesión para ver solicitudes');
      router.push('/login');
      return;
    }

    const cargarDatos = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Inicia sesión para ver solicitudes');
        setLoading(false);
        return;
      }

      try {
        let endpoint;
        if (usuario?.rol === 'alumno') endpoint = '/materials/usuario/solicitudes';
        else if (usuario?.rol === 'docente') endpoint = '/materials/solicitudes/todas';
        else if (usuario?.rol === 'almacen') endpoint = '/materials/solicitudes/aprobadas';
        else endpoint = '/materials/solicitudes';

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const generarFolio = () => Math.random().toString(36).substr(2, 4).toUpperCase();

        const agrupadas = Object.values(
          response.data.reduce((acc, item) => {
            const key = item.solicitud_id;
            if (!acc[key]) {
              acc[key] = {
                id: key,
                folio: item.folio || generarFolio(),
                nombre_alumno: item.nombre_alumno,
                profesor: item.profesor,
                fecha_solicitud: item.fecha_solicitud,
                estado: item.estado,
                items: [],
              };
            }
            acc[key].items.push({
              item_id: item.item_id,
              nombre_material: item.nombre_material,
              cantidad: item.cantidad,
              tipo: item.tipo,
            });
            return acc;
          }, {})
        );

        setSolicitudes(agrupadas);
        setError('');
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [usuario, router]);

  const getUnidad = (tipo) => {
    const unidades = {
      'liquido': 'ml',
      'solido': 'g'
    };
    return unidades[tipo] || 'u';
  };

  const descargarPDF = async (vale) => {
    const doc = new jsPDF();

    try {
      const toBase64 = async (url) => {
        const blob = await fetch(url).then(r => r.blob());
        return new Promise(res => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result);
          reader.readAsDataURL(blob);
        });
      };

      const logoImg = await toBase64(logoUT);
      const encabezadoImg = await toBase64(encabezadoUT);

      doc.addImage(logoImg, 'PNG', 10, 10, 25, 25);
      doc.addImage(encabezadoImg, 'PNG', 40, 10, 150, 25);

      doc.setFontSize(24);
      doc.setTextColor(0, 102, 51);
      doc.text(
        'VALE DE ALMACÉN',
        doc.internal.pageSize.getWidth() / 2,
        50,
        { align: 'center' }
      );

      autoTable(doc, {
        startY: 60,
        theme: 'plain',
        styles: { fontSize: 12, cellPadding: 5 },
        margin: { left: 25, right: 25 },
        body: [
          ['Folio:', vale.folio],
          ['Solicitante:', vale.nombre_alumno],
          ['Encargado:', vale.profesor],
          ['Fecha:', new Date(vale.fecha_solicitud).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })],
        ],
      });

      const rows = vale.items.map(m => [
        `${m.cantidad} ${getUnidad(m.tipo)}`,
        m.nombre_material,
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Cantidad', 'Descripción']],
        body: rows,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 102, 51],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 11,
          cellPadding: 4
        },
        margin: { left: 25, right: 25 },
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(10);
      doc.setTextColor(128);
      doc.text('Este documento es válido para el retiro de materiales del almacén.', 
        doc.internal.pageSize.getWidth() / 2, 
        pageHeight - 20, 
        { align: 'center' }
      );

      doc.save(`Vale_${vale.folio}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF', err);
      alert('Error al generar el PDF. Por favor, intenta de nuevo.');
    }
  };

  const actualizarEstadoGrupo = async (id, accion, nuevoEstado) => {
    if (!usuario || procesando) return;
    
    setProcesando(id);
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/solicitud/${id}/${accion}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (accion === 'cancelar') {
        setSolicitudes(prev => prev.filter(sol => sol.id !== id));
      } else {
        setSolicitudes(prev =>
          prev.map(sol =>
            sol.id === id ? { ...sol, estado: nuevoEstado } : sol
          )
        );
      }
      
      const mensaje = `Solicitud ${nuevoEstado} exitosamente`;
      console.log(mensaje);
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || `Error al ${accion} la solicitud`);
    } finally {
      setProcesando(null);
    }
  };

  const filteredData = useMemo(() => 
    solicitudes.filter(s => {
      if (usuario?.rol === 'docente' && s.estado === 'cancelado') {
        return false;
      }
      return filtroEstado === 'todos' || s.estado === filtroEstado;
    }),
    [solicitudes, filtroEstado, usuario]
  );

  const estadisticas = useMemo(() => {
    const stats = solicitudes.reduce((acc, sol) => {
      acc[sol.estado] = (acc[sol.estado] || 0) + 1;
      return acc;
    }, {});
    return stats;
  }, [solicitudes]);

  return (
    <div className="ml-64 p-8 bg-gray-50 min-h-screen">
      {/* Header limpio */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Solicitudes de Préstamo</h1>
            <p className="text-gray-600">Gestiona y supervisa todas las solicitudes de materiales</p>
          </div>
        </div>
      </div>

      {/* Error alert simple */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
            <button 
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Estadísticas simplificadas */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div
            className={`bg-white rounded-lg p-4 shadow-sm border-2 cursor-pointer transition-colors ${
              filtroEstado === 'todos' ? 'border-slate-900' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setFiltroEstado('todos')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{solicitudes.length}</p>
              </div>
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📊</span>
              </div>
            </div>
          </div>

          {Object.entries({
            pendiente: { color: 'amber', icon: '⏳', label: 'Pendiente' },
            aprobada: { color: 'green', icon: '✓', label: 'Aprobada' },
            rechazada: { color: 'red', icon: '✗', label: 'Rechazada' },
            entregado: { color: 'blue', icon: '📦', label: 'Entregado' },
          }).map(([estado, config]) => (
            <div
              key={estado}
              className={`bg-white rounded-lg p-4 shadow-sm border-2 cursor-pointer transition-colors ${
                filtroEstado === estado ? `border-${config.color}-500` : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setFiltroEstado(estado)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{config.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{estadisticas[estado] || 0}</p>
                </div>
                <div className={`w-10 h-10 bg-${config.color}-500 rounded-lg flex items-center justify-center`}>
                  <span className="text-white text-lg">{config.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla principal */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full">
            <tbody>
              {[...Array(5)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes</h3>
            <p className="text-gray-600">No se encontraron solicitudes con los filtros seleccionados.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Folio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solicitante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Encargado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Materiales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.folio}</div>
                          <div className="text-xs text-gray-500">ID: {item.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.nombre_alumno}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.profesor}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {item.items.map((mat, idx) => (
                          <div key={mat.item_id} className="flex items-center gap-2 text-sm">
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                              {mat.cantidad} {getUnidad(mat.tipo)}
                            </span>
                            <span className="text-gray-900">{mat.nombre_material}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(item.fecha_solicitud).toLocaleDateString('es-MX')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <EstadoBadge estado={item.estado} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {usuario?.rol === 'docente' && item.estado === 'pendiente' && (
                          <>
                            <button
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                              onClick={() => actualizarEstadoGrupo(item.id, 'aprobar', 'aprobada')}
                              disabled={procesando === item.id}
                            >
                              {procesando === item.id ? 'Procesando...' : 'Aprobar'}
                            </button>
                            <button
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                              onClick={() => actualizarEstadoGrupo(item.id, 'rechazar', 'rechazada')}
                              disabled={procesando === item.id}
                            >
                              {procesando === item.id ? 'Procesando...' : 'Rechazar'}
                            </button>
                          </>
                        )}

                        {usuario?.rol === 'almacen' && item.estado === 'aprobada' && (
                          <button
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                            onClick={() => actualizarEstadoGrupo(item.id, 'entregar', 'entregado')}
                            disabled={procesando === item.id}
                          >
                            {procesando === item.id ? 'Procesando...' : 'Entregar'}
                          </button>
                        )}

                        {usuario?.rol === 'alumno' && item.estado === 'pendiente' && (
                          <button
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50"
                            onClick={() => actualizarEstadoGrupo(item.id, 'cancelar', 'cancelado')}
                            disabled={procesando === item.id}
                          >
                            {procesando === item.id ? 'Procesando...' : 'Cancelar'}
                          </button>
                        )}

                        <button
                          className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                          onClick={() => descargarPDF(item)}
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
