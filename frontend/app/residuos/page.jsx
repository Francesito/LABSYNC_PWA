// app/residuos/page.jsx
'use client';

import { useState, useEffect } from 'react';

const LABS = [
  'Laboratorio de Química Básica',
  'Lab. de Química Analítica',
  'Lab. de Tecnología Ambiental',
  'Lab. de Fisicoquímica',
  'Lab. de Operaciones Unitarias',
  'Lab. de Análisis Instrumental',
  'Lab. de Microbiología'
];

const RESIDUE_TYPES = [
  'Químico',
  'Biológico',
  'Radiactivo',
  'Común'
];

export default function ResiduosPage() {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    laboratorio: '',
    tipoResiduo: '',
    cantidad: '',
  });

  const [entries, setEntries] = useState([]);

  // Optional: load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('residuosEntries');
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  // Persist to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem('residuosEntries', JSON.stringify(entries));
  }, [entries]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { fecha, laboratorio, tipoResiduo, cantidad } = form;
    if (!fecha || !laboratorio || !tipoResiduo || !cantidad) return;
    const newEntry = {
      id: Date.now(),
      fecha,
      laboratorio,
      tipoResiduo,
      cantidad: parseFloat(cantidad),
    };
    setEntries(prev => [newEntry, ...prev]);
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      laboratorio: '',
      tipoResiduo: '',
      cantidad: '',
    });
  };

  return (
 <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:ml-64">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Bitácora de Residuos Peligrosos
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium mb-1">Fecha *</label>
            <input
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          {/* Laboratorio */}
          <div>
            <label className="block text-sm font-medium mb-1">Laboratorio *</label>
            <select
              name="laboratorio"
              value={form.laboratorio}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">-- Seleccionar --</option>
              {LABS.map(lab => (
                <option key={lab} value={lab}>{lab}</option>
              ))}
            </select>
          </div>

          {/* Tipo de residuo */}
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Residuo *</label>
            <select
              name="tipoResiduo"
              value={form.tipoResiduo}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">-- Seleccionar --</option>
              {RESIDUE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Cantidad Generada (g o mL) *
            </label>
            <input
              type="number"
              name="cantidad"
              value={form.cantidad}
              onChange={handleChange}
              step="0.01"
              className="w-full border px-3 py-2 rounded"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Registrar Residuo
        </button>
      </form>

      <section className="mt-10 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Historial de Registros</h2>
        {entries.length === 0 ? (
          <p className="text-gray-600">No hay residuos registrados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Laboratorio</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{entry.fecha}</td>
                    <td className="px-4 py-2">{entry.laboratorio}</td>
                    <td className="px-4 py-2">{entry.tipoResiduo}</td>
                    <td className="px-4 py-2 text-right">{entry.cantidad.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
