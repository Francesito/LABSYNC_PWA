// frontend/components/SolicitudForm.jsx
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../lib/auth';
import { crearSolicitud } from '../lib/api';

export default function SolicitudForm() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const { usuario } = useAuth();
  const [mensaje, setMensaje] = useState('');

  const onSubmit = async (data) => {
    try {
      await crearSolicitud({
        usuario_id: usuario.id,
        material_id: data.material_id,
        fecha_solicitud: new Date(),
      });
      setMensaje('Solicitud enviada con éxito');
      reset();
    } catch (error) {
      setMensaje('Error al enviar solicitud');
    }
  };

  return (
    <div className="card mb-6">
      <h2 className="text-xl font-semibold mb-4">Solicitar Préstamo</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="block text-gray-700">ID del Material</label>
          <input
            {...register('material_id', { required: 'ID del material es requerido' })}
            className="input"
          />
          {errors.material_id && (
            <p className="text-red-500 text-sm">{errors.material_id.message}</p>
          )}
        </div>
        <button type="submit" className="btn-primary">Enviar Solicitud</button>
        {mensaje && <p className="text-green-500 mt-4">{mensaje}</p>}
      </form>
    </div>
  );
}