'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';

const LABS = [
  'Química Básica',
  'Química Analítica',
  'Tecnología Ambiental',
  'Fisicoquímica',
  'Operaciones Unitarias',
  'Análisis Instrumental',
  'Microbiología'
];

// Nivel de peligro a color
const DANGER_COLORS = {
  extremo: '#DC2626',
  alto:   '#F97316',
  moderado: '#FBBF24',
  bajo:   '#16A34A',
  desconocido: '#6B7280'
};

// Ejemplo de clasificación automática
const CLASSIFY = (compuesto) => {
  const m = compuesto.toLowerCase();
  if (m.includes('ácido') || m.includes('hidróxido')) return 'extremo';
  if (m.includes('benceno') || m.includes('tolueno')) return 'alto';
  if (m.includes('acetona') || m.includes('etanol')) return 'moderado';
  return 'bajo';
};

export default function ResiduosPage() {
  // --- Formulario y estado de registros ---
  const [form, setForm] = useState({
    fecha:      '',
    laboratorio:'',
    compuesto:  '',
    usado:      '',
    desecho:    '',
    responsable:'',
    obs:        ''
  });
  const [entries, setEntries] = useState([]);
  const [filter, setFilter]   = useState({ lab:'', search:'' });
  const [error, setError]     = useState('');

  // Carga inicial de datos
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/residuos');
        setEntries(res.data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Manejo de campos
  const onChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Enviar nuevo registro
  const onSubmit = async e => {
    e.preventDefault();
    const { fecha, laboratorio, compuesto, usado, desecho, responsable } = form;
    if (!fecha||!laboratorio||!compuesto||!usado||!desecho||!responsable) {
      setError('Todos los campos con * son obligatorios');
      return;
    }
    try {
      const payload = {
        ...form,
        nivel: CLASSIFY(compuesto)
      };
      const res = await axios.post('/api/residuos', payload);
      setEntries(e => [res.data, ...e]);
      setForm({ fecha:'', laboratorio:'', compuesto:'', usado:'', desecho:'', responsable:'', obs:'' });
      setError('');
    } catch (e) {
      console.error(e);
      setError('Error guardando registro');
    }
  };

  // Filtrado por búsqueda / laboratorio
  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchLab = !filter.lab || e.laboratorio === filter.lab;
      const term = filter.search.toLowerCase();
      const matchSearch = e.compuesto.toLowerCase().includes(term)
                        || e.responsable.toLowerCase().includes(term);
      return matchLab && matchSearch;
    });
  }, [entries, filter]);

  // Datos para gráficos
  const analytics = useMemo(() => {
    const byLab = {}, byNivel = {};
    entries.forEach(e => {
      byLab[e.laboratorio] = (byLab[e.laboratorio]||0) + +e.desecho;
      byNivel[e.nivel]     = (byNivel[e.nivel]||0) + +e.desecho;
    });
    return { byLab, byNivel };
  }, [entries]);

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Título */}
      <header className="text-center">
        <h1 className="text-3xl font-bold">Bitácora de Residuos Peligrosos</h1>
        <p className="text-gray-600">
          Modalidad A – Grandes y pequeños generadores. Registra y analiza tus prácticas de laboratorio.
        </p>
      </header>

      {/* Formulario de registro */}
      <section className="bg-white p-6 rounded shadow">
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            Fecha *<input type="date" name="fecha" value={form.fecha} onChange={onChange}
              className="mt-1 w-full border rounded p-2" required/>
          </label>
          <label className="block">
            Laboratorio *<select name="laboratorio" value={form.laboratorio} onChange={onChange}
              className="mt-1 w-full border rounded p-2" required>
              <option value="">--</option>
              {LABS.map(l=> <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="block col-span-1 md:col-span-2">
            Compuesto / Residuo *<input type="text" name="compuesto" value={form.compuesto} onChange={onChange}
              className="mt-1 w-full border rounded p-2" placeholder="Ej. Ácido sulfúrico" required/>
          </label>
          <label className="block">
            Cantidad usada *<input type="number" name="usado" value={form.usado} onChange={onChange}
              className="mt-1 w-full border rounded p-2" step="0.01" required/>
          </label>
          <label className="block">
            Cantidad desecho *<input type="number" name="desecho" value={form.desecho} onChange={onChange}
              className="mt-1 w-full border rounded p-2" step="0.01" required/>
          </label>
          <label className="block col-span-1 md:col-span-2">
            Responsable *<input type="text" name="responsable" value={form.responsable} onChange={onChange}
              className="mt-1 w-full border rounded p-2" required/>
          </label>
          <label className="block col-span-1 md:col-span-2">
            Observaciones<textarea name="obs" value={form.obs} onChange={onChange}
              className="mt-1 w-full border rounded p-2" rows={2}/>
          </label>
          <button type="submit" className="col-span-1 md:col-span-2 bg-blue-600 text-white py-2 rounded">
            Registrar Residuo
          </button>
        </form>
      </section>

      {/* Dashboard de gráficos */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="mb-2 font-semibold">Desecho por Laboratorio</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={Object.entries(analytics.byLab).map(([lab, v])=>({ lab, v }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="lab" tick={{ fontSize:12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="v" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="mb-2 font-semibold">Por nivel de peligrosidad</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={Object.entries(analytics.byNivel).map(([nivel, v])=>({
                  name: nivel, value: v, fill: DANGER_COLORS[nivel]||DANGER_COLORS.desconocido
                }))}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                label
              >
                {Object.entries(analytics.byNivel).map(([nivel],i) => (
                  <Cell key={i} fill={DANGER_COLORS[nivel]||DANGER_COLORS.desconocido}/>
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Historial y filtros */}
      <section className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-4">Historial de Registros</h2>
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="Buscar compuesto o responsable..."
            value={filter.search}
            onChange={e=>setFilter(f=>({...f,search:e.target.value}))}
            className="flex-1 border rounded p-2"
          />
          <select
            value={filter.lab}
            onChange={e=>setFilter(f=>({...f,lab:e.target.value}))}
            className="border rounded p-2"
          >
            <option value="">Todos los labs</option>
            {LABS.map(l=> <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {['Fecha','Lab','Compuesto','Usado','Desecho','Nivel','Resp.'].map(h=>(
                  <th key={h} className="p-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e,i)=>(
                <tr key={i} className={i%2?'bg-gray-50':''}>
                  <td className="p-2">{e.fecha}</td>
                  <td className="p-2">{e.laboratorio}</td>
                  <td className="p-2">{e.compuesto}</td>
                  <td className="p-2">{e.usado}</td>
                  <td className="p-2">{e.desecho}</td>
                  <td className="p-2">
                    <span
                      className="px-2 py-0.5 rounded text-white text-xs"
                      style={{ backgroundColor: DANGER_COLORS[e.nivel]||DANGER_COLORS.desconocido }}
                    >
                      {e.nivel}
                    </span>
                  </td>
                  <td className="p-2">{e.responsable}</td>
                </tr>
              ))}
              {filtered.length===0 && (
                <tr><td colSpan={7} className="p-2 text-center text-gray-500">
                  No hay registros.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
