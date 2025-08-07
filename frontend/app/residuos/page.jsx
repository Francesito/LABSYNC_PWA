'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../lib/auth';

const LABS = [
  'Laboratorio de Química Básica',
  'Lab. de Química Analítica',
  'Lab. de Tecnología Ambiental',
  'Lab. de Fisicoquímica',
  'Lab. de Operaciones Unitarias',
  'Lab. de Análisis Instrumental',
  'Lab. de Microbiología'
];

export default function ResiduosPage() {
  const { usuario, permissions } = useAuth();
  const [form, setForm] = useState({
    fecha: '',
    laboratorio: '',
    compuesto: '',
    cantidadUsada: '',
    cantidadDesecho: '',
    observaciones: ''
  });
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { fecha, laboratorio, compuesto, cantidadUsada, cantidadDesecho } = form;
    if (!fecha || !laboratorio || !compuesto || !cantidadUsada || !cantidadDesecho) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/residuos`,
        { ...form, usuario_id: usuario.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEntries(prev => [...prev, res.data]);
      setForm({ fecha: '', laboratorio: '', compuesto: '', cantidadUsada: '', cantidadDesecho: '', observaciones: '' });
    } catch (err) {
      console.error(err);
      setError('Error al guardar el registro.');
    } finally {
      setLoading(false);
    }
  };

  // Optionally, load existing entries from backend on mount:
  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/residuos`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEntries(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">
        Bitácora de Residuos Peligrosos y Sitios Contaminados
      </h1>
      <p className="mb-6 text-gray-700">
        Modalidad A. Grandes y pequeños generadores. Registra aquí los residuos generados en prácticas de laboratorio.
      </p>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded p-4 mb-8">
        {error && <div className="text-red-600 mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Fecha *</label>
            <input
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block font-medium">Laboratorio *</label>
            <select
              name="laboratorio"
              value={form.laboratorio}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
              required
            >
              <option value="">-- Selecciona --</option>
              {LABS.map(lab => (
                <option key={lab} value={lab}>{lab}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium">Compuesto / Residuo *</label>
            <input
              type="text"
              name="compuesto"
              value={form.compuesto}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
              placeholder="Nombre del compuesto"
              required
            />
          </div>
          <div>
            <label className="block font-medium">Cantidad Usada (g o mL) *</label>
            <input
              type="number"
              name="cantidadUsada"
              value={form.cantidadUsada}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
              step="any"
              required
            />
          </div>
          <div>
            <label className="block font-medium">Cantidad Desecho (g o mL) *</label>
            <input
              type="number"
              name="cantidadDesecho"
              value={form.cantidadDesecho}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
              step="any"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-medium">Observaciones</label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
              rows={3}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Registrar Residuo'}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Registros</h2>
      {entries.length === 0 ? (
        <p className="text-gray-600">No hay registros aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded shadow">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Lab.</th>
                <th className="p-2 text-left">Compuesto</th>
                <th className="p-2 text-right">Usado</th>
                <th className="p-2 text-right">Desecho</th>
                <th className="p-2 text-left">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                  <td className="p-2">{e.fecha}</td>
                  <td className="p-2">{e.laboratorio}</td>
                  <td className="p-2">{e.compuesto}</td>
                  <td className="p-2 text-right">{e.cantidadUsada}</td>
                  <td className="p-2 text-right">{e.cantidadDesecho}</td>
                  <td className="p-2">{e.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

