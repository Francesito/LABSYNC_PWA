'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '../../lib/auth';

export default function Catalog() {
  const { usuario } = useAuth();
  const router = useRouter();

  const [allMaterials, setAllMaterials] = useState([]);
  const [selectedCart, setSelectedCart] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [materialToAdjust, setMaterialToAdjust] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!usuario) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [liquidoRes, solidoRes, equipoRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/tipo/liquidos`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/tipo/solidos`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/tipo/equipos`),
        ]);

        const liquidos = liquidoRes.data.map((m) => ({
          ...m,
          tipo: 'liquido',
          cantidad: m.cantidad_disponible_ml ?? 0,
        }));
        const solidos = solidoRes.data.map((m) => ({
          ...m,
          tipo: 'solido',
          cantidad: m.cantidad_disponible_g ?? 0,
        }));
        const equipos = equipoRes.data.map((m) => ({
          ...m,
          tipo: 'equipo',
          cantidad: m.cantidad_disponible_u ?? 0,
        }));

        let all = [];
        if (usuario.rol === 'alumno') {
          all = [...liquidos, ...solidos];
        } else if (usuario.rol === 'docente') {
          all = [...liquidos, ...solidos, ...equipos];
        } else if (usuario.rol === 'almacen') {
          all = [...liquidos, ...solidos, ...equipos];
        }

        setAllMaterials(all);
      } catch (err) {
        console.error(err);
        setError('Error al cargar el catálogo');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [usuario, router]);

  const formatName = (name) =>
    name
      ? name.replace(/_/g, ' ')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : '';

  const getUnidad = (tipo) => {
    if (tipo === 'liquido') return 'ml';
    if (tipo === 'solido') return 'g';
    return 'unidades';
  };

  const addToCart = (material, cantidad) => {
    const cantidadNum = parseInt(cantidad) || 0;
    if (cantidadNum <= 0) return;

    if (cantidadNum > material.cantidad) {
      setError(`No hay suficiente stock de ${formatName(material.nombre)}`);
      return;
    }

    setSelectedCart((prev) => {
      const exists = prev.find((item) => item.id === material.id && item.tipo === material.tipo);
      if (exists) {
        return prev.map((item) =>
          item.id === material.id && item.tipo === material.tipo
            ? { ...item, cantidad: cantidadNum }
            : item
        );
      }
      return [...prev, { ...material, cantidad: cantidadNum }];
    });
    setError('');
  };

  const removeFromCart = (id, tipo) => {
    setSelectedCart((prev) => prev.filter((item) => !(item.id === id && item.tipo === tipo)));
  };

  const vaciarSeleccion = () => {
    setSelectedCart([]);
    setError('');
  };

  const totalItems = selectedCart.reduce((sum, item) => sum + (item.cantidad || 0), 0);

  const handleSubmitRequest = async () => {
    if (selectedCart.length === 0 || totalItems === 0) {
      setError('Selecciona al menos un material con cantidad válida.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/solicitudes`,
        {
          materiales: selectedCart.map((item) => ({
            material_id: item.id,
            cantidad: item.cantidad,
            tipo: item.tipo
          })),
          motivo: 'Solicitud desde catálogo',
          fecha_solicitud: new Date().toISOString().split('T')[0],
          aprobar_automatico: usuario.rol === 'docente',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSelectedCart([]);
      setShowRequestModal(false);
      router.push('/solicitudes');
    } catch (err) {
      console.error(err);
      setError('Error al enviar solicitud');
    }
  };

  const filteredMaterials = allMaterials.filter((m) =>
    formatName(m.nombre).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdjustClick = (material) => {
    setMaterialToAdjust(material);
    setAdjustAmount('');
    setShowAdjustModal(true);
    setError('');
  };

  const handleAdjustSubmit = async () => {
    if (!materialToAdjust) return;
    const amountNum = parseInt(adjustAmount);
    if (isNaN(amountNum)) {
      setError('Ingresa un número válido');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/material/${materialToAdjust.id}/ajustar`,
        {
          cantidad: amountNum,
          tipo: materialToAdjust.tipo
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAdjustModal(false);
      setAdjustAmount('');
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError('Error al ajustar inventario');
    }
  };

  return (
    <>
      <style jsx>{`
        .catalog-container {
          background: #f8f9fa;
          min-height: 100vh;
          padding: 2rem;
          margin-left: 16rem;
        }

        .main-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .header-section {
          background: #1e3a8a;
          color: white;
          padding: 2rem;
        }

        .header-section h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin: 0;
        }

        .search-container {
          padding: 1.5rem;
          background: #fafbfc;
          border-bottom: 1px solid #e5e7eb;
        }

        .search-input {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          background: white;
          transition: all 0.2s ease;
          width: 100%;
        }

        .search-input:focus {
          outline: none;
          border-color: #1e3a8a;
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
        }

        .table {
          margin: 0;
        }

        .table-header {
          background: #f8f9fa;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .table-header th {
          padding: 1rem;
          font-weight: 600;
        }

        .table-row {
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.15s ease;
        }

        .table-row:hover {
          background: #f8f9fa;
        }

        .table-row td {
          padding: 1rem;
          vertical-align: middle;
        }

        .material-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.95rem;
        }

        .material-type {
          padding: 0.25rem 0.625rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .type-liquido {
          background: #dbeafe;
          color: #1e40af;
        }

        .type-solido {
          background: #fef3c7;
          color: #92400e;
        }

        .type-equipo {
          background: #d1fae5;
          color: #065f46;
        }

        .stock-display {
          font-weight: 500;
          color: #4b5563;
        }

        .quantity-input {
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 0.5rem;
          text-align: center;
          font-weight: 500;
          font-size: 0.875rem;
          transition: border-color 0.15s ease;
          width: 80px;
        }

        .quantity-input:focus {
          border-color: #1e3a8a;
          box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.1);
          outline: none;
        }

        .btn-adjust {
          background: #f59e0b;
          border: none;
          border-radius: 4px;
          color: white;
          font-weight: 500;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          transition: background-color 0.15s ease;
          cursor: pointer;
        }

        .btn-adjust:hover {
          background: #d97706;
        }

        .cart-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          width: 380px;
          position: sticky;
          top: 2rem;
          max-height: calc(100vh - 4rem);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .cart-header {
          background: #1e3a8a;
          color: white;
          padding: 1.5rem;
        }

        .cart-header h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }

        .cart-header small {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .cart-body {
          padding: 1.5rem;
          flex: 1;
          overflow-y: auto;
        }

        .cart-item {
          background: #f8f9fa;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 0.75rem;
        }

        .cart-item-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        .cart-item-quantity {
          color: #6b7280;
          font-size: 0.813rem;
        }

        .btn-remove {
          background: #ef4444;
          border: none;
          border-radius: 4px;
          color: white;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
          font-weight: 600;
          transition: background-color 0.15s ease;
          cursor: pointer;
        }

        .btn-remove:hover {
          background: #dc2626;
        }

        .btn-create-vale {
          background: #1e3a8a;
          border: none;
          border-radius: 6px;
          color: white;
          font-weight: 600;
          padding: 0.875rem 1.5rem;
          font-size: 0.95rem;
          transition: background-color 0.15s ease;
          width: 100%;
          cursor: pointer;
        }

        .btn-create-vale:hover:not(:disabled) {
          background: #1e40af;
        }

        .btn-create-vale:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .btn-clear {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: #4b5563;
          font-weight: 500;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          transition: all 0.15s ease;
          width: 100%;
          cursor: pointer;
        }

        .btn-clear:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #9ca3af;
        }

        .btn-clear:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-overlay {
          background: rgba(0, 0, 0, 0.5);
        }

        .modal-content-custom {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: none;
          overflow: hidden;
        }

        .modal-header-custom {
          background: #1e3a8a;
          color: white;
          padding: 1.5rem;
          border-bottom: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header-custom .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .alert-custom {
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 0.875rem 1rem;
          margin-bottom: 1rem;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .loading-spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #1e3a8a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-cart {
          text-align: center;
          padding: 2rem 0;
          color: #6b7280;
        }

        .empty-cart-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .empty-cart p {
          font-weight: 500;
          color: #4b5563;
          margin-bottom: 0.25rem;
        }

        .empty-cart small {
          color: #9ca3af;
          font-size: 0.875rem;
        }

        .modal-footer-custom {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          background: #f8f9fa;
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .request-summary {
          background: #f8f9fa;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 0;
          overflow: hidden;
        }

        .request-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .request-item:last-child {
          border-bottom: none;
        }

        .request-item .fw-semibold {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .request-item small {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .request-item .fw-bold {
          font-weight: 600;
          color: #1e3a8a;
          font-size: 0.875rem;
        }

        .btn-secondary-custom {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: #4b5563;
          font-weight: 500;
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          transition: all 0.15s ease;
          cursor: pointer;
        }

        .btn-secondary-custom:hover {
          background: #f8f9fa;
          border-color: #9ca3af;
        }

        .info-alert {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 0.875rem 1rem;
          color: #1e40af;
          font-size: 0.875rem;
        }

        .info-alert strong {
          font-weight: 600;
        }

        .form-label {
          color: #374151;
          font-weight: 500;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .form-control {
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 0.625rem 0.875rem;
          font-size: 0.95rem;
          transition: all 0.15s ease;
        }

        .form-control:focus {
          outline: none;
          border-color: #1e3a8a;
          box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.1);
        }

        .text-muted {
          color: #6b7280 !important;
          font-size: 0.875rem;
        }

        .modal-body h5 {
          color: #1f2937;
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .d-grid {
          display: grid;
        }

        .gap-2 {
          gap: 0.5rem;
        }

        .gap-4 {
          gap: 1.5rem;
        }

        @media (max-width: 1200px) {
          .catalog-container {
            margin-left: 0;
          }
          
          .d-flex.gap-4 {
            flex-direction: column;
          }
          
          .cart-container {
            width: 100%;
            position: relative;
            max-height: none;
            margin-top: 2rem;
          }
        }
      `}</style>

      <div className="catalog-container">
        <div className="d-flex gap-4">
          <div className="flex-grow-1">
            <div className="main-card">
              <div className="header-section">
                <h1>Catálogo de Materiales</h1>
              </div>

              <div className="search-container">
                <input
                  type="text"
                  className="form-control search-input"
                  placeholder="Buscar materiales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="p-0">
                {error && (
                  <div className="alert-custom mx-4 mt-3">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <div className="materials-table">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr className="table-header">
                            <th>Material</th>
                            <th>Tipo</th>
                            <th>Descripción</th>
                            <th>Stock</th>
                            {usuario?.rol !== 'almacen' && <th>Cantidad</th>}
                            {usuario?.rol === 'almacen' && <th>Acciones</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMaterials.map((material) => (
                            <tr key={`${material.tipo}-${material.id}`} className="table-row">
                              <td>
                                <div className="material-name">
                                  {formatName(material.nombre)}
                                </div>
                              </td>
                              <td>
                                <span className={`material-type type-${material.tipo}`}>
                                  {material.tipo}
                                </span>
                              </td>
                              <td className="text-muted">
                                {material.descripcion || 'Material de laboratorio'}
                              </td>
                              <td>
                                <div className="stock-display">
                                  {material.cantidad} {getUnidad(material.tipo)}
                                </div>
                              </td>
                              {usuario?.rol !== 'almacen' && (
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    max={material.cantidad}
                                    className="quantity-input"
                                    value={
                                      selectedCart.find((item) => item.id === material.id && item.tipo === material.tipo)?.cantidad || ''
                                    }
                                    onChange={(e) => addToCart(material, e.target.value)}
                                    disabled={material.cantidad === 0}
                                    placeholder="0"
                                  />
                                </td>
                              )}
                              {usuario?.rol === 'almacen' && (
                                <td>
                                  <button 
                                    className="btn-adjust"
                                    onClick={() => handleAdjustClick(material)}
                                  >
                                    Ajustar
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {usuario?.rol !== 'almacen' && (
            <div className="cart-container">
              <div className="cart-header">
                <h4>Vale de Solicitud</h4>
                <small>
                  {selectedCart.length} material{selectedCart.length !== 1 ? 'es' : ''} seleccionado{selectedCart.length !== 1 ? 's' : ''}
                </small>
              </div>

              <div className="cart-body">
                {selectedCart.length === 0 ? (
                  <div className="empty-cart">
                    <div className="empty-cart-icon">📋</div>
                    <p>No hay materiales seleccionados</p>
                    <small>Agrega materiales del catálogo</small>
                  </div>
                ) : (
                  <div className="cart-items">
                    {selectedCart.map((item, idx) => (
                      <div key={idx} className="cart-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="cart-item-name">
                              {formatName(item.nombre)}
                            </div>
                            <div className="cart-item-quantity">
                              {item.cantidad} {getUnidad(item.tipo)}
                            </div>
                          </div>
                          <button 
                            className="btn-remove"
                            onClick={() => removeFromCart(item.id, item.tipo)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 d-grid gap-2">
                  <button
                    onClick={() =>
                      selectedCart.length > 0 ? setShowRequestModal(true) : setError('Selecciona al menos un material')
                    }
                    className="btn-create-vale"
                    disabled={selectedCart.length === 0}
                  >
                    Crear Vale de Solicitud
                  </button>
                  <button
                    onClick={vaciarSeleccion}
                    className="btn-clear"
                    disabled={selectedCart.length === 0}
                  >
                    Limpiar Selección
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRequestModal && (
        <div className="modal show d-block modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h4 className="modal-title">
                  Confirmar Solicitud de Vale
                </h4>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowRequestModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <h5>Materiales solicitados:</h5>
                  <div className="request-summary">
                    {selectedCart.map((item, idx) => (
                      <div key={idx} className="request-item">
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{formatName(item.nombre)}</div>
                          <small className="text-muted">{item.tipo}</small>
                        </div>
                        <div className="fw-bold">
                          {item.cantidad} {getUnidad(item.tipo)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="info-alert">
                  <strong>Nota:</strong> Una vez creado el vale, será enviado para {usuario.rol === 'docente' ? 'aprobación automática' : 'revisión y aprobación'}.
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button 
                  className="btn-secondary-custom"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn-create-vale"
                  onClick={handleSubmitRequest}
                  style={{ width: 'auto' }}
                >
                  Confirmar y Crear Vale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdjustModal && materialToAdjust && (
        <div className="modal show d-block modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h4 className="modal-title">
                  Ajustar Inventario
                </h4>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowAdjustModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <h5>{formatName(materialToAdjust.nombre)}</h5>
                  <p className="text-muted mb-3">
                    Stock actual: <strong>{materialToAdjust.cantidad} {getUnidad(materialToAdjust.tipo)}</strong>
                  </p>
                  <div className="mb-3">
                    <label className="form-label">
                      Agrega o resta stock ({getUnidad(materialToAdjust.tipo)}):
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder={`Cantidad en ${getUnidad(materialToAdjust.tipo)}`}
                    />
                  </div>
                  {error && (
                    <div className="alert-custom">
                      {error}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button 
                  className="btn-secondary-custom"
                  onClick={() => setShowAdjustModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn-adjust"
                  onClick={handleAdjustSubmit}
                  style={{ width: 'auto' }}
                >
                  Guardar Ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
