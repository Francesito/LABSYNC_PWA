// frontend/app/reportes/page.jsx
'use client';
import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { generarReporte } from '../../lib/api';

export default function Reportes() {
  const { usuario } = useAuth();
  const [tipoReporte, setTipoReporte] = useState('prestamos');

  const handleGenerarReporte = async () => {
    try {
      const response = await generarReporte(tipoReporte);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${tipoReporte}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error al generar reporte:', error);
    }
  };

  if (usuario?.rol_id !== 3) return <p>Acceso denegado</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Generar Reportes</h1>
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Seleccionar Tipo de Reporte</h2>
        <select
          value={tipoReporte}
          onChange={(e) => setTipoReporte(e.target.value)}
          className="input mb-4"
        >
          <option value="prestamos">Préstamos por Periodo</option>
          <option value="adeudos">Adeudos Pendientes</option>
          <option value="inventario">Inventario Actual</option>
        </select>
        <button onClick={handleGenerarReporte} className="btn-primary">
          Generar PDF
        </button>
      </div>
    </div>
  );
}