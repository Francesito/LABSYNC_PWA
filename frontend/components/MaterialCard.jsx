// frontend/components/MaterialCard.jsx
'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

export default function MaterialCard({ material }) {
  const { usuario } = useAuth();
  const router = useRouter();

  const handleSolicitar = () => {
    if (usuario?.rol_id === 1 || usuario?.rol_id === 2) {
      router.push(`/solicitudes?material_id=${material.id}`);
    }
  };

  return (
    <div className="card">
      <img
        src={material.imagen || '/placeholder.jpg'}
        alt={material.nombre}
        className="w-full h-40 object-cover rounded mb-4"
      />
      <h3 className="text-lg font-bold">{material.nombre}</h3>
      <p className="text-gray-600">{material.descripcion || 'Sin descripción'}</p>
      <p className="text-sm text-gray-500">Estado: {material.estado}</p>
      {(usuario?.rol_id === 1 || usuario?.rol_id === 2) && (
        <button
          onClick={handleSolicitar}
          className="btn-primary mt-4"
          disabled={material.estado !== 'disponible'}
        >
          Solicitar
        </button>
      )}
    </div>
  );
}