'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  AlertTriangle, Beaker, Calendar, TrendingUp, Eye, Download,
  ChevronDown, Filter, Search, Zap, Droplet, Flame, Skull
} from 'lucide-react';

const LABS = [
  'Laboratorio de Química Básica',
  'Lab. de Química Analítica', 
  'Lab. de Tecnología Ambiental',
  'Lab. de Fisicoquímica',
  'Lab. de Operaciones Unitarias',
  'Lab. de Análisis Instrumental',
  'Lab. de Microbiología'
];

// Base de datos de compuestos peligrosos con clasificación automática
const COMPOUND_DATABASE = {
  'ácido sulfúrico': { danger: 'extremo', type: 'corrosivo', icon: '🔥', color: '#dc2626' },
  'ácido clorhídrico': { danger: 'alto', type: 'corrosivo', icon: '🔥', color: '#ea580c' },
  'acetona': { danger: 'moderado', type: 'inflamable', icon: '🔥', color: '#f59e0b' },
  'benceno': { danger: 'extremo', type: 'carcinógeno', icon: '☠️', color: '#dc2626' },
  'tolueno': { danger: 'alto', type: 'tóxico', icon: '⚠️', color: '#ea580c' },
  'etanol': { danger: 'bajo', type: 'inflamable', icon: '🔥', color: '#16a34a' },
  'cloroformo': { danger: 'extremo', type: 'carcinógeno', icon: '☠️', color: '#dc2626' },
  'hidróxido de sodio': { danger: 'alto', type: 'corrosivo', icon: '🔥', color: '#ea580c' },
  'formaldehído': { danger: 'extremo', type: 'carcinógeno', icon: '☠️', color: '#dc2626' },
  'mercurio': { danger: 'extremo', type: 'tóxico', icon: '☠️', color: '#dc2626' },
};

const DANGER_COLORS = {
  extremo: '#dc2626',
  alto: '#ea580c', 
  moderado: '#f59e0b',
  bajo: '#16a34a'
};

export default function ResiduosPage() {
  const [activeTab, setActiveTab] = useState('registro');
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    laboratorio: '',
    compuesto: '',
    cantidadUsada: '',
    cantidadDesecho: '',
    observaciones: '',
    responsable: ''
  });
  
  const [entries, setEntries] = useState([
    // Datos de ejemplo para demostración
    { id: 1, fecha: '2025-01-15', laboratorio: 'Lab. de Química Analítica', compuesto: 'ácido sulfúrico', cantidadUsada: 50, cantidadDesecho: 5, observaciones: 'Práctica de valoración', responsable: 'María García' },
    { id: 2, fecha: '2025-01-16', laboratorio: 'Laboratorio de Química Básica', compuesto: 'acetona', cantidadUsada: 100, cantidadDesecho: 15, observaciones: 'Limpieza de material', responsable: 'Juan Pérez' },
    { id: 3, fecha: '2025-01-17', laboratorio: 'Lab. de Fisicoquímica', compuesto: 'benceno', cantidadUsada: 25, cantidadDesecho: 8, observaciones: 'Síntesis orgánica', responsable: 'Ana López' },
    { id: 4, fecha: '2025-01-18', laboratorio: 'Lab. de Química Analítica', compuesto: 'tolueno', cantidadUsada: 75, cantidadDesecho: 12, observaciones: 'Extracción', responsable: 'Carlos Ruiz' },
    { id: 5, fecha: '2025-01-19', laboratorio: 'Lab. de Microbiología', compuesto: 'etanol', cantidadUsada: 200, cantidadDesecho: 30, observaciones: 'Esterilización', responsable: 'Laura Mendez' },
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLab, setFilterLab] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Análisis automático de datos
  const analytics = useMemo(() => {
    const totalWaste = entries.reduce((sum, entry) => sum + parseFloat(entry.cantidadDesecho), 0);
    const totalUsed = entries.reduce((sum, entry) => sum + parseFloat(entry.cantidadUsada), 0);
    const wastePercentage = totalUsed > 0 ? ((totalWaste / totalUsed) * 100).toFixed(1) : 0;
    
    const byLab = entries.reduce((acc, entry) => {
      acc[entry.laboratorio] = (acc[entry.laboratorio] || 0) + parseFloat(entry.cantidadDesecho);
      return acc;
    }, {});
    
    const byDanger = entries.reduce((acc, entry) => {
      const compound = entry.compuesto.toLowerCase();
      const danger = COMPOUND_DATABASE[compound]?.danger || 'desconocido';
      acc[danger] = (acc[danger] || 0) + parseFloat(entry.cantidadDesecho);
      return acc;
    }, {});
    
    const timeline = entries.reduce((acc, entry) => {
      const month = entry.fecha.substring(0, 7);
      acc[month] = (acc[month] || 0) + parseFloat(entry.cantidadDesecho);
      return acc;
    }, {});
    
    return { totalWaste, totalUsed, wastePercentage, byLab, byDanger, timeline };
  }, [entries]);

  const getCompoundInfo = (compound) => {
    const info = COMPOUND_DATABASE[compound.toLowerCase()];
    return info || { danger: 'desconocido', type: 'sin clasificar', icon: '❓', color: '#6b7280' };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newEntry = {
      ...form,
      id: Date.now(),
      cantidadUsada: parseFloat(form.cantidadUsada),
      cantidadDesecho: parseFloat(form.cantidadDesecho)
    };
    setEntries(prev => [...prev, newEntry]);
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      laboratorio: '',
      compuesto: '',
      cantidadUsada: '',
      cantidadDesecho: '',
      observaciones: '',
      responsable: ''
    });
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.compuesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.laboratorio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLab = !filterLab || entry.laboratorio === filterLab;
    return matchesSearch && matchesLab;
  });

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 font-medium rounded-lg transition-all ${
        activeTab === id 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
      }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Beaker className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Sistema de Gestión de Residuos Peligrosos
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Bitácora inteligente para el control y análisis de residuos químicos generados en laboratorios universitarios
          </p>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{analytics.totalWaste.toFixed(1)}</h3>
                <p className="text-gray-600 text-sm">Total Residuos (g/mL)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{analytics.wastePercentage}%</h3>
                <p className="text-gray-600 text-sm">% Desperdicio</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Calendar className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{entries.length}</h3>
                <p className="text-gray-600 text-sm">Registros Totales</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Eye className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{Object.keys(analytics.byLab).length}</h3>
                <p className="text-gray-600 text-sm">Labs Activos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="flex flex-wrap gap-4 mb-8 bg-white p-2 rounded-2xl shadow-lg">
          <TabButton id="registro" label="Registro" icon={Beaker} />
          <TabButton id="dashboard" label="Dashboard" icon={TrendingUp} />
          <TabButton id="historial" label="Historial" icon={Calendar} />
          <TabButton id="analisis" label="Análisis" icon={Eye} />
        </div>

        {/* Contenido de las pestañas */}
        {activeTab === 'registro' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Beaker className="text-blue-600" />
              Registro de Nuevo Residuo
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={form.fecha}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Laboratorio *
                  </label>
                  <select
                    name="laboratorio"
                    value={form.laboratorio}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Seleccionar laboratorio</option>
                    {LABS.map(lab => (
                      <option key={lab} value={lab}>{lab}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Responsable *
                  </label>
                  <input
                    type="text"
                    name="responsable"
                    value={form.responsable}
                    onChange={handleChange}
                    placeholder="Nombre del responsable"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Compuesto / Residuo *
                  </label>
                  <input
                    type="text"
                    name="compuesto"
                    value={form.compuesto}
                    onChange={handleChange}
                    placeholder="Nombre del compuesto químico"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  {form.compuesto && (
                    <div className="absolute right-3 top-11">
                      <span className="text-2xl">{getCompoundInfo(form.compuesto).icon}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cantidad Usada (g o mL) *
                  </label>
                  <input
                    type="number"
                    name="cantidadUsada"
                    value={form.cantidadUsada}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cantidad Desecho (g o mL) *
                  </label>
                  <input
                    type="number"
                    name="cantidadDesecho"
                    value={form.cantidadDesecho}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Detalles adicionales sobre el residuo generado..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {form.compuesto && (
                <div className={`p-4 rounded-xl border-2 ${
                  getCompoundInfo(form.compuesto).danger === 'extremo' ? 'bg-red-50 border-red-200' :
                  getCompoundInfo(form.compuesto).danger === 'alto' ? 'bg-orange-50 border-orange-200' :
                  getCompoundInfo(form.compuesto).danger === 'moderado' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getCompoundInfo(form.compuesto).icon}</span>
                    <div>
                      <h4 className="font-semibold">Clasificación Automática</h4>
                      <p className={`text-sm font-medium ${
                        getCompoundInfo(form.compuesto).danger === 'extremo' ? 'text-red-700' :
                        getCompoundInfo(form.compuesto).danger === 'alto' ? 'text-orange-700' :
                        getCompoundInfo(form.compuesto).danger === 'moderado' ? 'text-yellow-700' :
                        'text-green-700'
                      }`}>
                        Peligrosidad: {getCompoundInfo(form.compuesto).danger.toUpperCase()} - 
                        Tipo: {getCompoundInfo(form.compuesto).type}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                Registrar Residuo Peligroso
              </button>
            </form>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Gráficos principales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart className="text-blue-600" size={24} />
                  Residuos por Laboratorio
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(analytics.byLab).map(([lab, amount]) => ({
                    lab: lab.replace('Laboratorio de ', '').replace('Lab. de ', ''),
                    amount: parseFloat(amount.toFixed(1))
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="lab" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} g/mL`, 'Residuos']} />
                    <Bar dataKey="amount" fill="url(#gradient)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <PieChart className="text-purple-600" size={24} />
                  Clasificación por Peligrosidad
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(analytics.byDanger).map(([danger, amount]) => ({
                        name: danger.charAt(0).toUpperCase() + danger.slice(1),
                        value: parseFloat(amount.toFixed(1)),
                        color: DANGER_COLORS[danger] || '#6b7280'
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      dataKey="value"
                    >
                      {Object.entries(analytics.byDanger).map((entry, index) => (
                        <Cell key={index} fill={DANGER_COLORS[entry[0]] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} g/mL`, 'Residuos']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Alerta de compuestos peligrosos */}
            <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={28} />
                <h3 className="text-xl font-bold">Alerta: Compuestos de Alta Peligrosidad</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {entries
                  .filter(entry => getCompoundInfo(entry.compuesto).danger === 'extremo')
                  .slice(0, 3)
                  .map((entry, index) => (
                    <div key={index} className="bg-white bg-opacity-20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getCompoundInfo(entry.compuesto).icon}</span>
                        <h4 className="font-semibold">{entry.compuesto}</h4>
                      </div>
                      <p className="text-sm opacity-90">{entry.laboratorio}</p>
                      <p className="text-sm opacity-90">Residuo: {entry.cantidadDesecho} g/mL</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Calendar className="text-blue-600" />
                Historial de Residuos
              </h2>
              
              {/* Filtros y búsqueda */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por compuesto o laboratorio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterLab}
                  onChange={(e) => setFilterLab(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los laboratorios</option>
                  {LABS.map(lab => (
                    <option key={lab} value={lab}>{lab}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fecha</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Laboratorio</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Compuesto</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Usado</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Desecho</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Peligrosidad</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map((entry, index) => {
                    const compoundInfo = getCompoundInfo(entry.compuesto);
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{entry.fecha}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{entry.laboratorio}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{compoundInfo.icon}</span>
                            <span className="text-sm font-medium text-gray-900">{entry.compuesto}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{entry.cantidadUsada} g/mL</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{entry.cantidadDesecho} g/mL</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            compoundInfo.danger === 'extremo' ? 'bg-red-100 text-red-800' :
                            compoundInfo.danger === 'alto' ? 'bg-orange-100 text-orange-800' :
                            compoundInfo.danger === 'moderado' ? 'bg-yellow-100 text-yellow-800' :
                            compoundInfo.danger === 'bajo' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {compoundInfo.danger.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{entry.responsable}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analisis' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Eye className="text-purple-600" />
                Análisis Avanzado de Residuos
              </h3>
              
              {/* Timeline de residuos */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold mb-4">Tendencia Temporal de Residuos</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={Object.entries(analytics.timeline).map(([month, amount]) => ({
                    month: month,
                    amount: parseFloat(amount.toFixed(1))
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} g/mL`, 'Residuos']} />
                    <Area type="monotone" dataKey="amount" stroke="#8b5cf6" fill="url(#areaGradient)" />
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Análisis de eficiencia */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold mb-4 text-blue-800">Eficiencia de Uso</h4>
                  <div className="space-y-3">
                    {Object.entries(analytics.byLab).map(([lab, waste]) => {
                      const used = entries.filter(e => e.laboratorio === lab).reduce((sum, e) => sum + parseFloat(e.cantidadUsada), 0);
                      const efficiency = used > 0 ? ((used - waste) / used * 100) : 0;
                      return (
                        <div key={lab} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-700">{lab.replace('Laboratorio de ', '').replace('Lab. de ', '')}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-blue-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.max(0, Math.min(100, efficiency))}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-blue-800">{efficiency.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold mb-4 text-red-800">Compuestos Más Peligrosos</h4>
                  <div className="space-y-3">
                    {entries
                      .filter(entry => ['extremo', 'alto'].includes(getCompoundInfo(entry.compuesto).danger))
                      .reduce((acc, entry) => {
                        const compound = entry.compuesto;
                        if (!acc[compound]) {
                          acc[compound] = { total: 0, info: getCompoundInfo(compound) };
                        }
                        acc[compound].total += parseFloat(entry.cantidadDesecho);
                        return acc;
                      }, {})
                      |> Object.entries
                      |> (arr => arr.sort((a, b) => b[1].total - a[1].total))
                      |> (arr => arr.slice(0, 5))
                      |> (arr => arr.map(([compound, data]) => (
                        <div key={compound} className="flex items-center justify-between p-3 bg-white bg-opacity-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{data.info.icon}</span>
                            <div>
                              <span className="text-sm font-medium text-red-700">{compound}</span>
                              <p className="text-xs text-red-600">{data.info.type}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-red-800">{data.total.toFixed(1)} g/mL</span>
                        </div>
                      )))}
                  </div>
                </div>
              </div>

              {/* Recomendaciones inteligentes */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
                <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Zap size={24} />
                  Recomendaciones Inteligentes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h5 className="font-semibold">🎯 Optimización</h5>
                    <ul className="text-sm space-y-1 opacity-90">
                      <li>• Reducir uso de benceno en 20% (alta toxicidad)</li>
                      <li>• Implementar reciclaje de etanol</li>
                      <li>• Mejorar dosificación en Lab. de Química Analítica</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h5 className="font-semibold">⚠️ Alertas de Seguridad</h5>
                    <ul className="text-sm space-y-1 opacity-90">
                      <li>• Compuestos carcinógenos: {entries.filter(e => getCompoundInfo(e.compuesto).type === 'carcinógeno').length} registros</li>
                      <li>• Revisar protocolos de manipulación de ácidos</li>
                      <li>• Actualizar inventario de EPP</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
