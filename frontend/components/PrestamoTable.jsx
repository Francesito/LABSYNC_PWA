// frontend/components/PrestamoTable.jsx
export default function PrestamoTable({ prestamos, onDevolver, rol }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className="text-left p-2">Usuario</th>
          <th className="text-left p-2">Material</th>
          <th className="text-left p-2">Fecha Préstamo</th>
          <th className="text-left p-2">Fecha Devolución</th>
          <th className="text-left p-2">Estado</th>
          {rol === 3 && <th className="text-left p-2">Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {prestamos.map((prestamo) => (
          <tr key={prestamo.id}>
            <td className="p-2">{prestamo.usuario}</td>
            <td className="p-2">{prestamo.material}</td>
            <td className="p-2">{new Date(prestamo.fecha_prestamo).toLocaleDateString()}</td>
            <td className="p-2">
              {prestamo.fecha_devolucion ? new Date(prestamo.fecha_devolucion).toLocaleDateString() : '-'}
            </td>
            <td className="p-2">{prestamo.estado}</td>
            {rol === 3 && (
              <td className="p-2">
                <button
                  onClick={() => onDevolver(prestamo.id)}
                  className="btn-primary"
                  disabled={prestamo.estado !== 'activo'}
                >
                  Devolver
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}