'use client';

import { useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jwt_decode from 'jwt-decode';

export default function MaterialRequestForm({ material, onClose }) {
  const [formData, setFormData] = useState({
    nombre_alumno: '',
    expediente: '',
    grupo: '',
    horario: '',
    profesor: '',
    materia: '',
    fecha: '',
    descripcion: material?.descripcion || '',
    riesgo: 'Ninguno',
    cantidad: 1
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const generarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('VALE DE PRÉSTAMO DE MATERIAL DE LABORATORIO', 20, 20);

    autoTable(doc, {
      startY: 30,
      head: [['Campo', 'Valor']],
      body: [
        ['Nombre del alumno', formData.nombre_alumno],
        ['No. Expediente', formData.expediente],
        ['Grupo', formData.grupo],
        ['Horario', formData.horario],
        ['Profesor', formData.profesor],
        ['Materia', formData.materia],
        ['Fecha', formData.fecha],
        ['Descripción del material', formData.descripcion],
        ['Riesgo', formData.riesgo],
        ['Cantidad solicitada', formData.cantidad]
      ]
    });

    doc.save(`Vale_${formData.expediente}_${material.nombre}.pdf`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    generarPDF();

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token no encontrado');

      const decoded = jwt_decode(token);
      const usuario_id = decoded.id;

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/solicitudes`,
        {
          usuario_id,
          material_id: material.id,
          fecha_solicitud: formData.fecha,
          nombre_alumno: formData.nombre_alumno,
          profesor: formData.profesor,
          cantidad: parseInt(formData.cantidad, 10)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      alert('Solicitud enviada correctamente');
      onClose();
      window.location.href = '/solicitudes';
    } catch (error) {
      console.error('Error al enviar solicitud:', error);
      alert('Error al enviar la solicitud: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Solicitud de Vale - {material.nombre}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" name="nombre_alumno" placeholder="Nombre del alumno" required onChange={handleChange} className="form-control" />
          <input type="text" name="expediente" placeholder="No. Expediente" required onChange={handleChange} className="form-control" />
          <input type="text" name="grupo" placeholder="Grupo" required onChange={handleChange} className="form-control" />
          <input type="text" name="horario" placeholder="Horario" required onChange={handleChange} className="form-control" />
          <input type="text" name="profesor" placeholder="Profesor" required onChange={handleChange} className="form-control" />
          <input type="text" name="materia" placeholder="Materia" required onChange={handleChange} className="form-control" />
          <input type="date" name="fecha" required onChange={handleChange} className="form-control" />
          <select name="riesgo" required onChange={handleChange} className="form-select">
            <option value="Ninguno">Ninguno</option>
            <option value="Bajo">Bajo</option>
            <option value="Medio">Medio</option>
          </select>
          <input type="number" name="cantidad" placeholder="Cantidad solicitada" min="1" required onChange={handleChange} className="form-control" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary">Generar Vale</button>
          </div>
        </form>
      </div>
    </div>
  );
}
