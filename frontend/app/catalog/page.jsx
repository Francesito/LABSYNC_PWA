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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [materialToAdjust, setMaterialToAdjust] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [detailAmount, setDetailAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiesgoFisico, setSelectedRiesgoFisico] = useState('');
  const [selectedRiesgoSalud, setSelectedRiesgoSalud] = useState('');
  const [lowStockMaterials, setLowStockMaterials] = useState([]);

  const LOW_STOCK_THRESHOLD = 50;

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
          riesgos_fisicos: '',
          riesgos_salud: '',
          riesgos_ambientales: ''
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

        if (usuario.rol === 'almacen') {
          const lowStock = all.filter(material => 
            material.cantidad > 0 && 
            material.cantidad <= LOW_STOCK_THRESHOLD &&
            (material.tipo === 'liquido' || material.tipo === 'solido')
          );
          setLowStockMaterials(lowStock);
        }

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

  const parseRiesgos = (riesgosString) => {
    if (!riesgosString) return [];
    return riesgosString.split(';').filter(r => r.trim());
  };

  const getRiesgoColor = (riesgo) => {
    const colorMap = {
      'Inflamable': 'bg-red-100 text-red-800',
      'Oxidante': 'bg-orange-100 text-orange-800',
      'Corrosivo para metales': 'bg-gray-100 text-gray-800',
      'Reacciona violentamente con agua': 'bg-purple-100 text-purple-800',
      'Tóxico agudo': 'bg-red-200 text-red-900',
      'Cancerígeno': 'bg-black text-white',
      'Corrosivo para la piel': 'bg-yellow-100 text-yellow-800',
      'Irritante': 'bg-blue-100 text-blue-800',
      'Sensibilizante': 'bg-pink-100 text-pink-800',
      'Peligroso para el medio ambiente acuático': 'bg-green-100 text-green-800',
      'Persistente': 'bg-teal-100 text-teal-800'
    };
    return colorMap[riesgo] || 'bg-gray-100 text-gray-600';
  };

  const getRiesgoIcon = (riesgo) => {
    const iconMap = {
      'Inflamable': '🔥',
      'Oxidante': '⚗️',
      'Corrosivo para metales': '🛠️',
      'Reacciona violentamente con agua': '💥',
      'Tóxico agudo': '☠️',
      'Cancerígeno': '⚠️',
      'Corrosivo para la piel': '🧪',
      'Irritante': '⚡',
      'Sensibilizante': '🤧',
      'Peligroso para el medio ambiente acuático': '🐟',
      'Persistente': '🌱'
    };
    return iconMap[riesgo] || '⚪';
  };

  const getMaxRiesgoLevel = (material) => {
    const allRiesgos = [
      ...parseRiesgos(material.riesgos_fisicos),
      ...parseRiesgos(material.riesgos_salud),
      ...parseRiesgos(material.riesgos_ambientales)
    ];

    if (allRiesgos.includes('Cancerígeno') || allRiesgos.includes('Tóxico agudo')) return 4;
    if (allRiesgos.includes('Corrosivo para la piel') || allRiesgos.includes('Inflamable')) return 3;
    if (allRiesgos.includes('Irritante') || allRiesgos.includes('Oxidante')) return 2;
    if (allRiesgos.length > 0) return 1;
    return 0;
  };

  const displayStock = (material) => {
    if (usuario?.rol === 'almacen') {
      return `${material.cantidad} ${getUnidad(material.tipo)}`;
    } else {
      return material.cantidad > 0 ? 'Disponible' : 'Agotado';
    }
  };

  const getStockColor = (material) => {
    if (usuario?.rol !== 'almacen') {
      return material.cantidad > 0 ? 'text-green-600' : 'text-red-600';
    }
    
    if (material.cantidad === 0) return 'text-red-600';
    if (material.cantidad <= LOW_STOCK_THRESHOLD) return 'text-orange-600';
    return 'text-green-600';
  };

  const addToCart = (material, cantidad) => {
    const cantidadNum = parseInt(cantidad) || 0;
    if (cantidadNum <= 0) {
      setError(`Ingresa una cantidad válida para ${formatName(material.nombre)}`);
      return;
    }

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
    setShowDetailModal(false);
    setDetailAmount('');
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

  const filteredMaterials = allMaterials.filter((m) => {
    const matchesSearch = formatName(m.nombre).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRiesgoFisico = selectedRiesgoFisico === '' || 
      (m.riesgos_fisicos && m.riesgos_fisicos.includes(selectedRiesgoFisico));
    const matchesRiesgoSalud = selectedRiesgoSalud === '' || 
      (m.riesgos_salud && m.riesgos_salud.includes(selectedRiesgoSalud));
    
    return matchesSearch && matchesRiesgoFisico && matchesRiesgoSalud;
  });

  const handleAdjustClick = (material) => {
    setMaterialToAdjust(material);
    setAdjustAmount('');
    setShowAdjustModal(true);
    setError('');
  };

  const handleDetailClick = (material) => {
    setSelectedMaterial(material);
    setDetailAmount('');
    setShowDetailModal(true);
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

  const dismissLowStockAlert = (materialId, tipo) => {
    setLowStockMaterials(prev => 
      prev.filter(material => !(material.id === materialId && material.tipo === tipo))
    );
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
          background: #1e293b;
          color: white;
          padding: 2rem;
        }

        .header-section h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin: 0;
        }

        .low-stock-alerts {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 1rem 1.5rem;
          margin-bottom: 1rem;
        }

        .low-stock-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          border: 1px solid #fbbf24;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
        }

        .low-stock-content {
          flex-grow: 1;
        }

        .low-stock-material {
          font-weight: 600;
          color: #92400e;
          font-size: 0.875rem;
        }

        .low-stock-quantity {
          color: #b45309;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .dismiss-btn {
          background: none;
          border: none;
          color: #92400e;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: background-color 0.15s ease;
        }

        .dismiss-btn:hover {
          background: #fef3c7;
        }

        .search-filter-container {
          padding: 1.5rem;
          background: #fafbfc;
          border-bottom: 1px solid #e5e7eb;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1rem;
        }

        .search-input, .filter-select {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          background: white;
          transition: all 0.2s ease;
        }

        .search-input:focus, .filter-select:focus {
          outline: none;
          border-color: #1e3a8a;
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
        }

        .material-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
          padding: 1.5rem;
        }

        .material-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: transform 0.2s ease;
          cursor: pointer;
        }

        .material-card:hover {
          transform: translateY(-4px);
        }

        .material-image {
          width: 100%;
          height: 150px;
          object-fit: cover;
          background: #f8f9fa;
        }

        .material-card-content {
          padding: 1rem;
        }

        .material-card-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
        }

        .material-card-type {
          padding: 0.25rem 0.625rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .material-card-stock {
          font-size: 0.85rem;
          margin-top: 0.5rem;
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

        .riesgo-badge {
          display: inline-block;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 500;
          margin: 0.125rem;
          white-space: nowrap;
        }

        .riesgos-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          max-width: 200px;
        }

        .stock-display {
          font-weight: 500;
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

        .btn-add-to-cart {
          background: #1e3a8a;
          border: none;
          border-radius: 4px;
          color: white;
          font-weight: 500;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          transition: background-color 0.15s ease;
          cursor: pointer;
          width: 100%;
        }

        .btn-add-to-cart:hover {
          background: #1e40af;
        }

        .btn-add-to-cart:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .cart-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          width: 400px;
          position: sticky;
          top: 2rem;
          max-height: calc(100vh - 4rem);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .cart-header {
          background: #1e293b;
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
          margin-bottom: 0.5rem;
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
          background: #1e293b;
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

        .security-alert {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 6px;
          padding: 0.875rem 1rem;
          color: #92400e;
          font-size: 0.875rem;
          margin-bottom: 1rem;
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

        .detail-image {
          max-width: 200px;
          max-height: 200px;
          object-fit: contain;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .text-muted {
          color: #6b7280 !important;
          font-size: 0.875rem;
        }

        .text-red-600 {
          color: #dc2626;
        }

        .text-orange-600 {
          color: #ea580c;
        }

        .text-green-600 {
          color: #16a34a;
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

        .d-flex {
          display: flex;
        }

        .justify-content-between {
          justify-content: space-between;
        }

        .align-items-center {
          align-items: center;
        }

        .align-items-start {
          align-items: flex-start;
        }

        .flex-grow-1 {
          flex-grow: 1;
        }

        .fw-semibold {
          font-weight: 600;
        }

        .fw-bold {
          font-weight: 700;
        }

        .mt-4 {
          margin-top: 1.5rem;
        }

        .mb-3 {
          margin-bottom: 1rem;
        }

        .mb-4 {
          margin-bottom: 1.5rem;
        }

        .mx-4 {
          margin-left: 1.5rem;
          margin-right: 1.5rem;
        }

        .mt-3 {
          margin-top: 1rem;
        }

        .p-0 {
          padding: 0;
        }

        .p-4 {
          padding: 1.5rem;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .min-w-full {
          min-width: 100%;
        }

        .mb-0 {
          margin-bottom: 0;
        }

        .show {
          display: block !important;
        }

        .d-block {
          display: block;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: white;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        .btn-close-white {
          color: white;
        }

        .btn-close:before {
          content: '×';
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

          .search-filter-container {
            grid-template-columns: 1fr;
          }

          .material-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }
        }
      `}</style>

      <div className="catalog-container">
        <div className="d-flex gap-4">
          <div className="flex-grow-1">
            <div className="main-card">
              <div className="header-section">
                <h1>Catálogo de Reactivos</h1>
              </div>

              {usuario?.rol === 'almacen' && lowStockMaterials.length > 0 && (
                <div className="low-stock-alerts">
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      background: '#f59e0b', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginRight: '0.75rem' 
                    }}>
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>!</span>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: '#92400e', fontSize: '1rem', fontWeight: '600' }}>
                        Advertencia de Stock Bajo
                      </h4>
                      <p style={{ margin: 0, color: '#b45309', fontSize: '0.875rem' }}>
                        Los siguientes materiales tienen stock por debajo del umbral mínimo ({LOW_STOCK_THRESHOLD} unidades):
                      </p>
                    </div>
                  </div>
                  
                  {lowStockMaterials.map((material) => (
                    <div key={`${material.tipo}-${material.id}`} className="low-stock-item">
                      <div className="low-stock-content">
                        <div className="low-stock-material">
                          {formatName(material.nombre)} ({material.tipo})
                        </div>
                        <div className="low-stock-quantity">
                          Stock actual: {material.cantidad} {getUnidad(material.tipo)}
                        </div>
                      </div>
                      <button
                        className="dismiss-btn"
                        onClick={() => dismissLowStockAlert(material.id, material.tipo)}
                        title="Descartar alerta"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="search-filter-container">
                <input
                  type="text"
                  className="form-control search-input"
                  placeholder="Buscar materiales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="filter-select"
                  value={selectedRiesgoFisico}
                  onChange={(e) => setSelectedRiesgoFisico(e.target.value)}
                >
                  <option value="">Todos los riesgos físicos</option>
                  <option value="Inflamable">🔥 Inflamable</option>
                  <option value="Oxidante">⚗️ Oxidante</option>
                  <option value="Corrosivo para metales">🛠️ Corrosivo para metales</option>
                  <option value="Reacciona violentamente con agua">💥 Reactivo con agua</option>
                </select>
                <select
                  className="filter-select"
                  value={selectedRiesgoSalud}
                  onChange={(e) => setSelectedRiesgoSalud(e.target.value)}
                >
                  <option value="">Todos los riesgos de salud</option>
                  <option value="Tóxico agudo">☠️ Tóxico agudo</option>
                  <option value="Cancerígeno">⚠️ Cancerígeno</option>
                  <option value="Corrosivo para la piel">🧪 Corrosivo</option>
                  <option value="Irritante">⚡ Irritante</option>
                  <option value="Sensibilizante">🤧 Sensibilizante</option>
                </select>
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
                  <>
                    {filteredMaterials.some(m => m.tipo === 'solido') && (
                      <div>
                        <h2 style={{ padding: '1rem 1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                          Materiales Sólidos
                        </h2>
                        <div className="material-grid">
                          {filteredMaterials
                            .filter(m => m.tipo === 'solido')
                            .map((material) => (
                              <div 
                                key={`${material.tipo}-${material.id}`} 
                                className="material-card"
                                onClick={() => handleDetailClick(material)}
                              >
                                <img
                                  src={`/materialSolido/${material.nombre}.jpg`}
                                  alt={formatName(material.nombre)}
                                  className="material-image"
                                  onError={(e) => {
                                    e.target.src = '/materialSolido/placeholder.jpg';
                                  }}
                                />
                                <div className="material-card-content">
                                  <div className="material-card-name">
                                    {formatName(material.nombre)}
                                  </div>
                                  <span className={`material-card-type type-${material.tipo}`}>
                                    {material.tipo}
                                  </span>
                                  <div className={`material-card-stock ${getStockColor(material)}`}>
                                    {displayStock(material)}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {(filteredMaterials.some(m => m.tipo === 'liquido') || 
                      filteredMaterials.some(m => m.tipo === 'equipo')) && (
                      <div className="materials-table">
                        <h2 style={{ padding: '1rem 1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                          Otros Materiales
                        </h2>
                        <div className="table-responsive">
                          <table className="table table-hover mb-0">
                            <thead>
                              <tr className="table-header">
                                <th>Material</th>
                                <th>Tipo</th>
                                <th>Riesgos GHS</th>
                                <th>Descripción</th>
                                <th>{usuario?.rol === 'almacen' ? 'Stock' : 'Disponibilidad'}</th>
                                {usuario?.rol !== 'almacen' && <th>Cantidad</th>}
                                {usuario?.rol === 'almacen' && <th>Acciones</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredMaterials
                                .filter(m => m.tipo !== 'solido')
                                .map((material) => (
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
                                    <td>
                                      <div className="riesgos-container">
                                        {parseRiesgos(material.riesgos_fisicos).map((riesgo, idx) => (
                                          <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                                            {getRiesgoIcon(riesgo)} {riesgo}
                                          </span>
                                        ))}
                                        {parseRiesgos(material.riesgos_salud).map((riesgo, idx) => (
                                          <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                                            {getRiesgoIcon(riesgo)} {riesgo}
                                          </span>
                                        ))}
                                        {parseRiesgos(material.riesgos_ambientales).map((riesgo, idx) => (
                                          <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                                            {getRiesgoIcon(riesgo)} {riesgo}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="text-muted">
                                      {material.descripcion || 'Material de laboratorio'}
                                    </td>
                                    <td>
                                      <div className={`stock-display ${getStockColor(material)}`}>
                                        {displayStock(material)}
                                        {usuario?.rol === 'almacen' && material.cantidad <= LOW_STOCK_THRESHOLD && material.cantidad > 0 && (
                                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>⚠️</span>
                                        )}
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
                  </>
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
                            <div className="riesgos-container">
                              {parseRiesgos(item.riesgos_fisicos).slice(0, 2).map((riesgo, idx) => (
                                <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                                  {getRiesgoIcon(riesgo)}
                                </span>
                              ))}
                              {parseRiesgos(item.riesgos_salud).slice(0, 2).map((riesgo, idx) => (
                                <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                                  {getRiesgoIcon(riesgo)}
                                </span>
                              ))}
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
                          <div style={{ marginTop: '0.5rem' }}>
                            <div className="riesgos-container">
                              {parseRiesgos(item.riesgos_fisicos).map((riesgo, ridx) => (
                                <span key={ridx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                                  {getRiesgoIcon(riesgo)} {riesgo}
                                </span>
                              ))}
                              {parseRiesgos(item.riesgos_salud).map((riesgo, ridx) => (
                                <span key={ridx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                                  {getRiesgoIcon(riesgo)} {riesgo}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="fw-bold">
                          {item.cantidad} {getUnidad(item.tipo)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedCart.some(item => 
                  item.riesgos_salud?.includes('Cancerígeno') || 
                  item.riesgos_salud?.includes('Tóxico agudo') ||
                  item.riesgos_fisicos?.includes('Inflamable')
                ) && (
                  <div className="security-alert">
                    <strong>⚠️ ATENCIÓN - MATERIALES PELIGROSOS:</strong> Esta solicitud incluye materiales de alto riesgo según GHS. Asegúrate de seguir todos los protocolos de seguridad, usar EPP adecuado y cumplir con las medidas de almacenamiento y manipulación requeridas.
                  </div>
                )}
                
                <div className="info-alert">
                  <strong>Nota:</strong> Una vez creado el vale, será enviado para {usuario.rol === 'docente' ? 'aprobación automática' : 'revisión y aprobación'}. Los materiales con clasificación GHS requieren manejo especial.
                </div>
              </div>
              <div className="modal-footer modal-footer-custom custom">
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
                  <div style={{ marginBottom: '1rem' }}>
                    <div className="riesgos-container">
                      {parseRiesgos(materialToAdjust.riesgos_fisicos).map((riesgo, idx) => (
                        <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                          {getRiesgoIcon(riesgo)} {riesgo}
                        </span>
                      ))}
                      {parseRiesgos(materialToAdjust.riesgos_salud).map((riesgo, idx) => (
                        <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                          {getRiesgoIcon(riesgo)} {riesgo}
                        </span>
                      ))}
                      {parseRiesgos(materialToAdjust.riesgos_ambientales).map((riesgo, idx) => (
                        <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                          {getRiesgoIcon(riesgo)} {riesgo}
                        </span>
                      ))}
                    </div>
                  </div>
                  {(materialToAdjust.riesgos_salud?.includes('Cancerígeno') || 
                    materialToAdjust.riesgos_salud?.includes('Tóxico agudo') ||
                    materialToAdjust.riesgos_fisicos?.includes('Inflamable')) && (
                    <div className="security-alert">
                      <strong>⚠️ Material Peligroso:</strong> Este material requiere precauciones especiales de seguridad durante su manipulación y almacenamiento.
                    </div>
                  )}
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
                    <small className="text-muted">
                      Usa números positivos para agregar stock, negativos para reducir
                    </small>
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

      {showDetailModal && selectedMaterial && (
        <div className="modal show d-block modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content modal-content-custom">
              <div className="modal-header modal-header-custom">
                <h4 className="modal-title">
                  {formatName(selectedMaterial.nombre)}
                </h4>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex gap-4">
                  <div>
                    <img
                      src={`/materialSolido/${selectedMaterial.nombre}.jpg`}
                      alt={formatName(selectedMaterial.nombre)}
                      className="detail-image"
                      onError={(e) => {
                        e.target.src = '/materialSolido/placeholder.jpg';
                      }}
                    />
                  </div>
                  <div className="flex-grow-1">
                    <div className="mb-3">
                      <h5>Descripción</h5>
                      <p className="text-muted">
                        {selectedMaterial.descripcion || 'Material de laboratorio'}
                      </p>
                    </div>
                    <div className="mb-3">
                      <h5>Riesgos GHS</h5>
                      <div className="riesgos-container">
                        {parseRiesgos(selectedMaterial.riesgos_fisicos).map((riesgo, idx) => (
                          <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                            {getRiesgoIcon(riesgo)} {riesgo}
                          </span>
                        ))}
                        {parseRiesgos(selectedMaterial.riesgos_salud).map((riesgo, idx) => (
                          <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                            {getRiesgoIcon(riesgo)} {riesgo}
                          </span>
                        ))}
                        {parseRiesgos(selectedMaterial.riesgos_ambientales).map((riesgo, idx) => (
                          <span key={idx} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                            {getRiesgoIcon(riesgo)} {riesgo}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <h5>Disponibilidad</h5>
                      <p className={`text-${selectedMaterial.cantidad > 0 ? 'green' : 'red'}-600`}>
                        {displayStock(selectedMaterial)}
                      </p>
                    </div>
                    {usuario?.rol !== 'almacen' && (
                      <div className="mb-3">
                        <label className="form-label">
                          Cantidad requerida ({getUnidad(selectedMaterial.tipo)}):
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedMaterial.cantidad}
                          className="form-control"
                          value={detailAmount}
                          onChange={(e) => setDetailAmount(e.target.value)}
                          placeholder={`Cantidad en ${getUnidad(selectedMaterial.tipo)}`}
                          disabled={selectedMaterial.cantidad === 0}
                        />
                      </div>
                    )}
                    {error && (
                      <div className="alert-custom">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer modal-footer-custom">
                <button 
                  className="btn-secondary-custom"
                  onClick={() => setShowDetailModal(false)}
                >
                  Cerrar
                </button>
                {usuario?.rol !== 'almacen' && (
                  <button 
                    className="btn-add-to-cart"
                    onClick={() => addToCart(selectedMaterial, detailAmount)}
                    disabled={selectedMaterial.cantidad === 0 || !detailAmount}
                    style={{ width: 'auto' }}
                  >
                    Agregar al carrito
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
