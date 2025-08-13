'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../lib/auth';

const logoUT = '/logoUtsjr.png';
const encabezadoUT = '/universidad.png';

/** Badge de estado */
const EstadoBadge = ({ estado }) => {
  const config = {
    'aprobación pendiente': { bg: 'bg-amber-100', text: 'text-amber-800', icon: '⏳' },
    'aprobacion pendiente': { bg: 'bg-amber-100', text: 'text-amber-800', icon: '⏳' }, // fallback sin tilde
    'entrega pendiente':    { bg: 'bg-blue-100',  text: 'text-blue-800',  icon: '📦' },
    'entregada':            { bg: 'bg-green-100', text: 'text-green-800', icon: '✓'  },
    'rechazada':            { bg: 'bg-red-100',   text: 'text-red-800',   icon: '✗'  },
    'cancelado':            { bg: 'bg-gray-100',  text: 'text-gray-800',  icon: '❌' },
    'pendiente':            { bg: 'bg-yellow-100',text: 'text-yellow-800',icon: '⏳' } // fallback
  };
  const safe = (estado || '').toLowerCase().trim();
  const { bg, text, icon } = config[safe] || config.pendiente;
  return (
    <span className={`${bg} ${text} inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium`}>
      <span>{icon}</span>
      <span className="capitalize">{estado}</span>
    </span>
  );
};

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
    <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded w-full" /></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
    <td className="px-6 py-4"><div className="h-6 bg-gray-200 rounded-full w-20" /></td>
    <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-24" /></td>
  </tr>
);

const Th = ({ children }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
    {children}
  </th>
);

const Td = ({ children, bold = false }) => (
  <td className="px-6 py-4 whitespace-nowrap">
    <div className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
      {children}
    </div>
  </td>
);

const Btn = ({ children, color, onClick, disabled }) => {
  const palette = {
    green:  'bg-green-600 hover:bg-green-700',
    red:    'bg-red-600 hover:bg-red-700',
    blue:   'bg-blue-600 hover:bg-blue-700',
    gray:   'bg-gray-600 hover:bg-gray-700',
    purple: 'bg-purple-600 hover:bg-purple-700'
  }[color] || 'bg-slate-600 hover:bg-slate-700';
  return (
    <button
      className={`${palette} text-white text-sm rounded-md px-3 py-1 disabled:opacity-60 disabled:cursor-not-allowed`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

function getUnidad(tipo) {
  return { liquido: 'ml', solido: 'g' }[tipo] || 'u';
}

/** Tabla genérica configurable por columnas */
function TablaSolicitudes({
  titulo,
  data,
  loading,
  showSolicitante = true,
  showEncargado = false,
  showGrupo = false,
  columnasFijas = {},
  usuario,
  onAccion,
  onPDF,
  procesandoId
}) {
  const columnas = {
    folio: columnasFijas.folio ?? true,
    solicitante: showSolicitante,
    encargado: showEncargado,
    materiales: columnasFijas.materiales ?? true,
    fecha: columnasFijas.fecha ?? true,
    grupo: showGrupo,
    estado: columnasFijas.estado ?? true,
    acciones: columnasFijas.acciones ?? true,
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <span className="text-sm text-gray-600">{data?.length || 0} registros</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columnas.folio && <Th>Folio</Th>}
              {columnas.solicitante && <Th>Solicitante</Th>}
              {columnas.encargado && <Th>Encargado</Th>}
              {columnas.materiales && <Th>Materiales</Th>}
              {columnas.fecha && <Th>Fecha</Th>}
              {columnas.grupo && <Th>Grupo</Th>}
              {columnas.estado && <Th>Estado</Th>}
              {columnas.acciones && <Th>Acciones</Th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : data.length === 0 ? (
              <tr>
                <td className="px-6 py-10 text-center text-gray-500" colSpan={8}>
                  No hay solicitudes para mostrar.
                </td>
              </tr>
            ) : (
              data.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  {columnas.folio && <Td bold>{s.folio}</Td>}

                  {columnas.solicitante && (
                    <Td>{s.isDocenteRequest ? `${s.profesor} (Docente)` : s.nombre_alumno}</Td>
                  )}

                  {columnas.encargado && <Td>{s.profesor || ''}</Td>}

                  {columnas.materiales && (
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {(s.items || []).map((m) => (
                          <div key={m.item_id} className="text-sm flex items-center gap-2">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">
                              {m.cantidad} {getUnidad(m.tipo)}
                            </span>
                            <span>{m.nombre_material}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  )}

                  {columnas.fecha && (
                    <Td>{new Date(s.fecha_solicitud).toLocaleDateString('es-MX')}</Td>
                  )}

                  {columnas.grupo && <Td>{s.grupo || ''}</Td>}

                  {columnas.estado && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <EstadoBadge estado={s.estado} />
                    </td>
                  )}

                  {columnas.acciones && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Docente: aprobar / rechazar */}
                        {usuario?.rol === 'docente' &&
                          !s.isDocenteRequest &&
                          (s.estado === 'aprobación pendiente') && (
                            <>
                              <Btn
                                color="green"
                                onClick={() => onAccion(s.id, 'aprobar', 'entrega pendiente')}
                                disabled={procesandoId === s.id}
                              >
                                Aprobar
                              </Btn>
                              <Btn
                                color="red"
                                onClick={() => onAccion(s.id, 'rechazar', 'rechazada')}
                                disabled={procesandoId === s.id}
                              >
                                Rechazar
                              </Btn>
                            </>
                          )}

                        {/* Almacén: Entregar cuando UI = entrega pendiente */}
                        {usuario?.rol === 'almacen' &&
                          s.estado === 'entrega pendiente' && (
                            <Btn
                              color="blue"
                              onClick={() => onAccion(s.id, 'entregar', 'entregada')}
                              disabled={procesandoId === s.id}
                            >
                              Entregar
                            </Btn>
                          )}

                        {/* Alumno: cancelar si está en aprobación pendiente */}
                        {usuario?.rol === 'alumno' &&
                          (s.estado === 'aprobación pendiente') && (
                            <Btn
                              color="gray"
                              onClick={() => onAccion(s.id, 'cancelar', 'cancelado')}
                              disabled={procesandoId === s.id}
                            >
                              Cancelar
                            </Btn>
                          )}

                        <Btn
                          color="purple"
                          onClick={() => onPDF(s)}
                          disabled={procesandoId === s.id}
                        >
                          PDF
                        </Btn>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SolicitudesPage() {
  const { usuario } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grupos, setGrupos] = useState({});
  const [alumnoData, setAlumnoData] = useState([]); // alumno
  const [docAprobar, setDocAprobar] = useState([]); // docente: tabla 1
  const [docMias, setDocMias] = useState([]);       // docente: tabla 2
  const [almAlumnos, setAlmAlumnos] = useState([]); // almacén: tabla 1
  const [almDocentes, setAlmDocentes] = useState([]); // almacén: tabla 2
  const [procesando, setProcesando] = useState(null);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    if (usuario === null) return;
    if (!usuario) {
      setError('Inicia sesión para ver solicitudes');
      router.push('/login');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Inicia sesión para ver solicitudes');
      router.push('/login');
      return;
    }

    const fetchAll = async () => {
      try {
        setLoading(true);

        // Grupos
        try {
          const g = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/grupos`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const map = g.data.reduce((acc, it) => { acc[it.id] = it.nombre; return acc; }, {});
          setGrupos(map);
        } catch (_) {}

        // Alumno
        if (usuario.rol === 'alumno') {
          const { data } = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/materials/usuario/solicitudes`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setAlumnoData(agrupar(data, 'alumno', grupos));
        }

        // Docente
        if (usuario.rol === 'docente') {
          const [aprobarRes, miasRes] = await Promise.all([
            axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/solicitudes/docente/aprobar`,
              { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/solicitudes/docente/mias`,
              { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setDocAprobar(agrupar(aprobarRes.data, 'docente', grupos));
          setDocMias(agrupar(miasRes.data, 'docente', grupos));
        }

        // Almacén (sin filtrar en cliente; solo mapeo de estado especial)
        if (usuario.rol === 'almacen') {
          const { data } = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/materials/solicitudes/almacen`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const grouped = agrupar(data, 'almacen', grupos);
          setAlmAlumnos(grouped.filter(s => !s.isDocenteRequest));
          setAlmDocentes(grouped.filter(s => s.isDocenteRequest));
        }

        setError('');
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || 'Error al cargar solicitudes');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

/** Agrupa por solicitud y mapea estados UI; para ALMACÉN lo no entregado/rechazado/cancelado = "entrega pendiente". */
function agrupar(rows, rolVista, gruposMap) {
  const by = {};
  for (const item of rows) {
    const key = item.solicitud_id ?? item.id;
    if (!key) continue;

    const isDocenteReq = !item.nombre_alumno; // solicitudes de docente no traen nombre_alumno

    if (!by[key]) {
      const rawEstado = String(item.estado || '').toLowerCase().trim();
      const estadoUI = mapEstadoPorRol(rawEstado, isDocenteReq, rolVista);

      by[key] = {
        id: key,
        folio: item.folio || Math.random().toString(36).slice(2, 6).toUpperCase(),
        nombre_alumno: item.nombre_alumno || '',
        profesor: item.profesor || '',
        fecha_solicitud: item.fecha_solicitud,
        estado: estadoUI,
        rawEstado,
        isDocenteRequest: isDocenteReq,
        grupo: isDocenteReq
          ? ''
          : (item.grupo_nombre || (item.grupo_id && gruposMap[item.grupo_id]) || ''),
        items: []
      };
    }

    
const nombreMaterialRaw =
  item?.nombre_material ??
  item?.nombreMaterial ??
  item?.material_nombre ??     // ← alias común en otros endpoints
  item?.materialNombre ??      // ← camelCase
  item?.material ??            // ← a veces solo "material"
  item?.nombre ??              // ← último recurso si el backend lo nombra así
  '';

    
if (!nombreMaterialRaw) {
  // Debug temporal para ver qué trae esa fila del endpoint "para aprobar"
  console.debug('Fila sin nombre_material:', item);
}

const nombreMaterial = String(nombreMaterialRaw).replace(/_/g, ' ').trim();

by[key].items.push({
  item_id: item.item_id ?? item.solicitud_item_id ?? `${key}-itm-${by[key].items.length + 1}`,
  nombre_material: nombreMaterial || '(Sin nombre)',
  cantidad: item.cantidad ?? item.cantidad_pedida ?? 0,
  tipo: item.tipo
});
  }
  return Object.values(by).sort(
    (a, b) => new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud)
  );
}




  /** Mapeo de estados con sensibilidad al rol que visualiza */
  function mapEstadoPorRol(estadoSQL, isDocenteReq, rolVista) {
    const e = (estadoSQL || '').toLowerCase().trim();

    // Vista de ALMACÉN: regla estricta para evitar "aprobación pendiente" allí
    if (rolVista === 'almacen') {
      if (e === 'entregado') return 'entregada';
      if (e === 'rechazada') return 'rechazada';
      if (e === 'cancelado') return 'cancelado';
      // Cualquier otro (incluido 'aprobada' y un posible 'pendiente') se ve como entrega pendiente
      return 'entrega pendiente';
    }

    // Otras vistas (alumno/docente)
    switch (e) {
      case 'pendiente':
        return isDocenteReq ? 'pendiente' : 'aprobación pendiente';
      case 'aprobada':
        return 'entrega pendiente';
      case 'entregado':
        return 'entregada';
      case 'rechazada':
        return 'rechazada';
      case 'cancelado':
        return 'cancelado';
      default:
        return 'pendiente';
    }
  }

  /** Acciones aprobar/rechazar/entregar/cancelar */
  const actualizarEstado = async (id, accion, nuevoEstadoUI) => {
    if (procesando) return;
    setProcesando(id);
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/solicitud/${id}/${accion}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Helpers para in-place update
      const apply = (arrSetter) => arrSetter(prev => prev.map(s => {
        if (s.id !== id) return s;
        const ui = nuevoEstadoUI;
        const raw = uiToRaw(ui);
        return { ...s, estado: ui, rawEstado: raw };
      }));

      const drop = (arrSetter) => arrSetter(prev => prev.filter(s => s.id !== id));

      if (accion === 'cancelar') {
        drop(setAlumnoData);
      } else {
        apply(setAlumnoData);
        apply(setDocAprobar);
        apply(setDocMias);
        apply(setAlmAlumnos);
        apply(setAlmDocentes);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || `Error al ${accion} la solicitud`);
    } finally {
      setProcesando(null);
    }
  };

  // Mapea estado UI -> estado SQL crudo
  function uiToRaw(estadoUI) {
    const e = (estadoUI || '').toLowerCase().trim();
    if (e === 'entrega pendiente')        return 'aprobada';
    if (e === 'aprobación pendiente' || e === 'aprobacion pendiente') return 'pendiente';
    if (e === 'entregada')                return 'entregado';
    if (e === 'rechazada')                return 'rechazada';
    if (e === 'cancelado')                return 'cancelado';
    return e;
  }

  const filterByDate = (arr) =>
    filterDate ? arr.filter(s => s.fecha_solicitud === filterDate) : arr;

  const filteredAlmAlumnos = filterByDate(almAlumnos);
  const filteredAlmDocentes = filterByDate(almDocentes);
  
  /** PDF */
  const descargarPDF = async (vale) => {
    const doc = new jsPDF();
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

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const marginLeft = margin;
    const primary = [0, 102, 51];
    const secondary = [100, 100, 100];

    // Fondo + marco
    doc.setFillColor(245, 245, 245);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'F');
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Encabezado
    doc.addImage(logoImg, 'PNG', marginLeft, 12, 30, 30);
    doc.addImage(encabezadoImg, 'PNG', marginLeft + 35, 12, pageWidth - 75, 25);
    doc.setFontSize(18);
    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.text('VALE DE ALMACÉN', pageWidth / 2, 50, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 55, pageWidth - marginLeft, 55);

    // Datos
    let yPos = 65;
    const put = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`${label}`, marginLeft, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${value || ''}`, marginLeft + 45, yPos);
      yPos += 9;
    };

    const fechaBonita = new Date(vale.fecha_solicitud).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    put('Folio:', vale.folio);
    put('Fecha:', fechaBonita);
    if (vale.isDocenteRequest) {
      put('Solicitante:', `${vale.profesor} (Docente)`);
    } else {
      put('Solicitante:', vale.nombre_alumno);
      put('Encargado:', vale.profesor);
      put('Grupo:', vale.grupo || '');
    }

    // Tabla de materiales
    doc.setLineWidth(0.3);
    doc.line(marginLeft, yPos + 4, pageWidth - marginLeft, yPos + 4);

    const rows = (vale.items || []).map(m => [
      `${m.cantidad} ${getUnidad(m.tipo)}`,
      m.nombre_material
    ]);

    autoTable(doc, {
      startY: yPos + 10,
      theme: 'grid',
      head: [['Cantidad', 'Descripción']],
      body: rows,
      headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 10, cellPadding: 4, textColor: [0, 0, 0] },
      margin: { left: margin, right: margin }
    });

    // Pie
    doc.setFontSize(8);
    doc.setTextColor(...secondary);
    doc.setFont('helvetica', 'normal');
    doc.text('Este documento es válido para el retiro de materiales del almacén.', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text('Página 1 de 1', pageWidth - margin, pageHeight - 10, { align: 'right' });

    const nombrePDF = vale.isDocenteRequest
      ? `Vale_${vale.folio}_${(vale.profesor || '').replace(/\s+/g, '')}.pdf`
      : `Vale_${vale.folio}_${new Date().toISOString().split('T')[0]}.pdf`;

    doc.save(nombrePDF);
  };

  // --- RENDER POR ROL ---
  return (
    <div className="ml-64 p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Solicitudes de Préstamo</h1>
          <p className="text-gray-600">Gestiona y supervisa las solicitudes según tu rol</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-red-800">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ALUMNO */}
  {usuario?.rol === 'alumno' && (
  <TablaSolicitudes
    titulo="Mis solicitudes"
    data={alumnoData}
    loading={loading}
    showSolicitante
    showEncargado={false}
    showGrupo={false} 
    columnasFijas={{ folio: true, materiales: true, fecha: true, estado: true, acciones: true }}
    usuario={usuario}
    onAccion={actualizarEstado}
    onPDF={descargarPDF}
    procesandoId={procesando}
  />
)}

      {/* DOCENTE */}
      {usuario?.rol === 'docente' && (
        <>
          <TablaSolicitudes
            titulo="Solicitudes de alumnos para aprobar"
            data={docAprobar}
            loading={loading}
            showSolicitante
            showEncargado={false}
            showGrupo
            columnasFijas={{ folio: true, materiales: true, fecha: true, estado: true, acciones: true }}
            usuario={usuario}
            onAccion={actualizarEstado}
            onPDF={descargarPDF}
            procesandoId={procesando}
          />
          <TablaSolicitudes
            titulo="Mis solicitudes como docente"
            data={docMias}
            loading={loading}
            showSolicitante={false}
            showEncargado={false}
            showGrupo={false}
            columnasFijas={{ folio: true, materiales: true, fecha: true, estado: true, acciones: true }}
            usuario={usuario}
            onAccion={actualizarEstado}
            onPDF={descargarPDF}
            procesandoId={procesando}
          />
        </>
      )}

      {/* ALMACÉN */}
      {usuario?.rol === 'almacen' && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filtrar por fecha:</label>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-xs text-blue-600 hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
          <TablaSolicitudes
            titulo="Solicitudes de alumnos"
            data={filteredAlmAlumnos}
            loading={loading}
            showSolicitante
            showEncargado
            showGrupo
            columnasFijas={{ folio: true, materiales: true, fecha: true, estado: true, acciones: true }}
            usuario={usuario}
            onAccion={actualizarEstado}
            onPDF={descargarPDF}
            procesandoId={procesando}
          />

          <TablaSolicitudes
            titulo="Solicitudes de docentes"
            data={filteredAlmDocentes}
            loading={loading}
            showSolicitante
            showEncargado={false}
            showGrupo={false}
            columnasFijas={{ folio: true, materiales: true, fecha: true, estado: true, acciones: true }}
            usuario={usuario}
            onAccion={actualizarEstado}
            onPDF={descargarPDF}
            procesandoId={procesando}
          />
        </>
      )}
    </div>
  );
}
