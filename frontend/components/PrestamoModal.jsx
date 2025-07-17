// frontend/components/PrestamoModal.jsx
'use client';
import { useState } from 'react';

export default function PrestamoModal({ solicitud, onClose, onSave }) {
  const [checked, setChecked] = useState({});

  if (!solicitud) return null;

  const toggle = (itemId) => {
    setChecked(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSave = () => {
    const entregados = Object.keys(checked)
      .filter(id => checked[id])
      .map(id => parseInt(id));
    onSave(entregados);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-2/3 max-h-screen overflow-auto">
        <h2 className="text-2xl fw-bold mb-4">Detalle de Solicitud</h2>
        <p><strong>Folio:</strong> {solicitud.folio}</p>
        <p><strong>Solicitante:</strong> {solicitud.nombre_alumno}</p>
        {solicitud.profesor && <p><strong>Profesor:</strong> {solicitud.profesor}</p>}

        <h3 className="mt-4 fw-semibold">Materiales:</h3>
        <ul>
          {solicitud.items.map(item => (
            <li key={item.item_id} className="flex items-center gap-3 my-2">
              <input
                type="checkbox"
                checked={!!checked[item.item_id]}
                onChange={() => toggle(item.item_id)}
              />
              <span>{item.nombre_material} - {item.cantidad} {item.tipo === 'liquido' ? 'ml' : item.tipo === 'solido' ? 'g' : 'u'}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
        </div>
      </div>
    </div>
  );
}
