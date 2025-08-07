// frontend/app/catalog/page.jsx
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
  const [docentes, setDocentes] = useState([]);
  const [selectedDocenteId, setSelectedDocenteId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
const [newMaterial, setNewMaterial] = useState({
  tipoGeneral: 'Reactivo',  // o 'Material'
  subTipo: '',              // 'liquido'|'solido' o 'equipo'|'laboratorio'
  nombre: '',
  descripcion: '',
  cantidad_inicial: '',
  estado: 'disponible',
  riesgos_fisicos: '',
  riesgos_salud: '',
  riesgos_ambientales: '',
  imagenFile: null
});
const [addError, setAddError] = useState('');

  const [userPermissions, setUserPermissions] = useState({
    acceso_chat: false,
    modificar_stock: false,
    rol: null
  });
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState('');

  const LOW_STOCK_THRESHOLD = 50;
  const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'tu-cloud-name'; // Reemplaza con tu cloud name

  // Cargar permisos del usuario
  const loadUserPermissions = async () => {
    try {
      setPermissionsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/permisos-stock`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUserPermissions({
        acceso_chat: response.data.acceso_chat || false,
        modificar_stock: response.data.modificar_stock || false,
        rol: response.data.rol
      });

      setPermissionsError('');
    } catch (error) {
      console.error('Error al cargar permisos:', error);
      setPermissionsError('Error al verificar permisos de usuario');
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else if (error.response?.status === 403) {
        setPermissionsError('Usuario bloqueado. Contacta al administrador.');
      }
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Cargar lista de docentes
  const loadDocentes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/docentes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDocentes(response.data);
      // Set default docente_id: for docentes, use their own ID; for others, use the first docente
      if (userPermissions.rol === 'docente') {
        setSelectedDocenteId(usuario.id.toString());
      } else if (response.data.length > 0) {
        setSelectedDocenteId(response.data[0].id.toString());
      }
    } catch (error) {
      console.error('Error al cargar docentes:', error);
      setError('No se pudieron cargar los docentes. Intenta de nuevo.');
    }
  };

  const canModifyStock = () => {
    if (userPermissions.rol === 'administrador') return true;
    if (userPermissions.rol === 'almacen' && userPermissions.modificar_stock) return true;
    return false;
  };

  const canMakeRequests = () => {
    if (userPermissions.rol === 'administrador') return false;
    if (userPermissions.rol === 'alumno') return true;
    if (userPermissions.rol === 'docente') return true;
    if (userPermissions.rol === 'almacen' && userPermissions.modificar_stock) return true;
    return false;
  };

  const canViewDetails = () => {
    if (userPermissions.rol === 'administrador') return false;
    if (userPermissions.rol === 'almacen' && !userPermissions.modificar_stock) return false;
    return true;
  };

  const handlePermissionError = (action) => {
    const messages = {
      'modify_stock': 'No tienes permisos para modificar el stock. Contacta al administrador.',
      'make_request': 'No tienes permisos para realizar solicitudes.',
      'view_details': 'No tienes permisos para ver los detalles de este material.',
      'adjust_stock': 'Solo usuarios con permisos de stock pueden ajustar inventario.',
      'low_stock_alerts': 'Solo usuarios con permisos de stock pueden gestionar alertas.'
    };
    
    setError(messages[action] || 'No tienes permisos para realizar esta acción.');
    setTimeout(() => setError(''), 5000);
  };

  const handleDeleteMaterial = async () => {
  if (!window.confirm('¿Seguro que quieres eliminar este material?')) return;
  try {
    await makeSecureApiCall(
      `${process.env.NEXT_PUBLIC_API_URL}/api/materials/${materialToAdjust.id}/eliminar?tipo=${materialToAdjust.tipo}`,
      { method: 'DELETE' }
    );
    setShowAdjustModal(false);
    await fetchMaterials();
  } catch (err) {
    console.error('Error al eliminar material:', err);
    setError('No se pudo eliminar el material.');
  }
};

  
  const makeSecureApiCall = async (url, options = {}) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`
        }
      };
      
      const response = await axios(url, config);
      return response;
    } catch (error) {
      if (error.response?.status === 403) {
        if (error.response.data?.error?.includes('permisos de stock')) {
          handlePermissionError('modify_stock');
        } else if (error.response.data?.error?.includes('solicitudes')) {
          handlePermissionError('make_request');
        } else {
          setError('No tienes permisos para realizar esta acción.');
        }
      } else if (error.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
      } else {
        setError('Error al procesar la solicitud: ' + (error.response?.data?.error || error.message));
      }
      throw error;
    }
  };

  useEffect(() => {
    if (!usuario) {
      router.push('/login');
      return;
    }

    const initializeComponent = async () => {
      await loadUserPermissions();
    };

    initializeComponent();
  }, [usuario, router]);

  // Separar fetchMaterials en un useEffect dependiente de userPermissions
  useEffect(() => {
    if (userPermissions.rol) {
      Promise.all([fetchMaterials(), loadDocentes()]);
    }
  }, [userPermissions.rol]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      console.log('fetchMaterials: Rol del usuario:', userPermissions.rol); // Depuración

      if (userPermissions.rol === 'administrador') {
        setError('Como administrador, solo puedes ver los reactivos (sin interacción)');
      }

      const [liquidoRes, solidoRes, laboratorioRes, equipoRes] = await Promise.all([
        makeSecureApiCall(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/tipo/liquidos`),
        makeSecureApiCall(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/tipo/solidos`),
        makeSecureApiCall(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/tipo/laboratorio`),
        makeSecureApiCall(`${process.env.NEXT_PUBLIC_API_URL}/api/materials/tipo/equipos`),
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

      const laboratorio = laboratorioRes.data.map((m) => ({
        ...m,
        tipo: 'laboratorio',
        cantidad: m.cantidad_disponible ?? 0,
      }));

      const equipos = equipoRes.data.map((m) => ({
        ...m,
        tipo: 'equipo',
        cantidad: m.cantidad_disponible_u ?? 0,
        riesgos_fisicos: '',
        riesgos_salud: '',
        riesgos_ambientales: ''
      }));

      let all = [...liquidos, ...solidos, ...laboratorio, ...equipos];
      
      // Aplicar filtrado según el rol
      if (userPermissions.rol === 'alumno') {
        all = all.filter(m => m.tipo === 'laboratorio' || m.tipo === 'equipo');
      } else if (userPermissions.rol === 'docente') {
        all = all.filter(m => m.tipo === 'liquido' || m.tipo === 'solido');
      }

      console.log('Materiales filtrados:', all.map(m => ({ id: m.id, nombre: m.nombre, tipo: m.tipo, imagen: m.imagen }))); // Depuración
      setAllMaterials(all);

      if (canModifyStock()) {
        const lowStock = all.filter(material =>
          material.cantidad > 0 &&
          material.cantidad <= LOW_STOCK_THRESHOLD
        );
        setLowStockMaterials(lowStock);
      }

    } catch (err) {
      console.error('Error al cargar materiales:', err);
      if (!err.response || err.response.status !== 403) {
        setError('Error al cargar el catálogo');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatName = (name) =>
    name
      ? name.replace(/_/g, ' ')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : '';

  const normalizeImageName = (name) =>
    name
      ? name
          .replace(/[,]/g, '')
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase()
      : '';

  const getUnidad = (tipo) => {
    if (tipo === 'liquido') return 'ml';
    if (tipo === 'solido') return 'g';
    if (tipo === 'laboratorio' || tipo === 'equipo') return 'unidades';
    return 'unidades';
  };

const getImagePath = async (material) => {
  if (material.imagen) {
    // Verificar si la imagen existe en Cloudinary
    try {
      const folder = material.tipo === 'laboratorio' ? 'materialLaboratorio' :
                    material.tipo === 'liquido' ? 'materialLiquido' :
                    material.tipo === 'solido' ? 'materialSolido' :
                    'materialEquipo';
      const response = await fetch(`/api/materials/verify-image?public_id=materiales-laboratorio/${folder}/${material.nombre.toLowerCase().trim()}`);
      const data = await response.json();
      if (data.exists) {
        return material.imagen; // Usar la URL almacenada si la imagen existe
      }
    } catch (error) {
      console.error('[Error] Verificando imagen:', error);
    }
  }
  // Fallback a placeholder si la imagen no existe o no está definida
  return 'https://res.cloudinary.com/dgte7l2cg/image/upload/v1/materiales-laboratorio/placeholder/material_placeholder.jpg';
};

  const parseRiesgos = (riesgosString) => {
    if (!riesgosString || riesgosString.trim() === '') return [];
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
    if (canModifyStock()) {
      return `${material.cantidad} ${getUnidad(material.tipo)}`;
    } else {
      return material.cantidad > 0 ? 'Disponible' : 'Agotado';
    }
  };

  const getStockColor = (material) => {
    if (!canModifyStock()) {
      return material.cantidad > 0 ? 'text-green-600' : 'text-red-600';
    }
    
    if (material.cantidad === 0) return 'text-red-600';
    if (material.cantidad <= LOW_STOCK_THRESHOLD) return 'text-orange-600';
    return 'text-green-600';
  };

  const addToCart = (material, cantidad) => {
    if (!canMakeRequests()) {
      handlePermissionError('make_request');
      return;
    }
    
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
    if (!canMakeRequests()) {
      handlePermissionError('make_request');
      return;
    }
    setSelectedCart((prev) => prev.filter((item) => !(item.id === id && item.tipo === tipo)));
  };

  const vaciarSeleccion = () => {
    if (!canMakeRequests()) {
      handlePermissionError('make_request');
      return;
    }
    setSelectedCart([]);
    setError('');
  };

  const totalItems = selectedCart.reduce((sum, item) => sum + (item.cantidad || 0), 0);

  const handleSubmitRequest = async () => {
    if (!canMakeRequests()) {
      handlePermissionError('make_request');
      return;
    }
    
    if (selectedCart.length === 0 || totalItems === 0) {
      setError('Selecciona al menos un material con cantidad válida.');
      return;
    }

    // For docentes, use usuario.id; for others, validate selectedDocenteId
    let docenteIdToUse = userPermissions.rol === 'docente' ? usuario.id : parseInt(selectedDocenteId);
    if (userPermissions.rol !== 'docente' && !docenteIdToUse) {
      setError('Debes seleccionar un docente encargado.');
      return;
    }

    try {
      const selectedDocente = docentes.find(doc => doc.id === docenteIdToUse);
      if (!selectedDocente) {
        setError('Docente seleccionado no válido.');
        return;
      }

      await makeSecureApiCall(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/solicitudes`,
        {
          method: 'POST',
          data: {
            materiales: selectedCart.map((item) => ({
              material_id: item.id,
              cantidad: item.cantidad,
              tipo: item.tipo
            })),
            motivo: 'Solicitud desde catálogo',
            fecha_solicitud: new Date().toISOString().split('T')[0],
            aprobar_automatico: userPermissions.rol === 'docente',
            docente_id: docenteIdToUse,
            nombre_alumno: userPermissions.rol === 'alumno' ? formatName(usuario.nombre) : null
          }
        }
      );

      setSelectedCart([]);
      setShowRequestModal(false);
      setSelectedDocenteId(userPermissions.rol === 'docente' ? usuario.id.toString() : docentes[0]?.id?.toString() || '');
      router.push('/solicitudes');
    } catch (err) {
      console.error('Error al enviar solicitud:', err);
      setError('Error al enviar la solicitud: ' + (err.response?.data?.error || err.message));
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
    if (!canModifyStock()) {
      handlePermissionError('adjust_stock');
      return;
    }
    setMaterialToAdjust(material);
    setAdjustAmount('');
    setShowAdjustModal(true);
    setError('');
  };

  const handleDetailClick = (material, e) => {
    e.stopPropagation();
    if (!canViewDetails()) {
      return;
    }
    console.log(`Clic en material: ${material.nombre}, ID: ${material.id}, Tipo: ${material.tipo}, Image Path: ${getImagePath(material)}, Riesgos Fisicos: ${material.riesgos_fisicos}, Riesgos Salud: ${material.riesgos_salud}, Riesgos Ambientales: ${material.riesgos_ambientales}`);
    setSelectedMaterial(material);
    setDetailAmount('');
    setShowDetailModal(true);
    setError('');
  };

  const handleAdjustSubmit = async () => {
    if (!materialToAdjust || !canModifyStock()) {
      handlePermissionError('adjust_stock');
      return;
    }
    
    const amountNum = parseInt(adjustAmount);
    if (isNaN(amountNum)) {
      setError('Ingresa un número válido');
      return;
    }

    try {
      await makeSecureApiCall(
        `${process.env.NEXT_PUBLIC_API_URL}/api/materials/material/${materialToAdjust.id}/ajustar`,
        {
          method: 'POST',
          data: {
            cantidad: amountNum,
            tipo: materialToAdjust.tipo
          }
        }
      );
      
      setShowAdjustModal(false);
      setAdjustAmount('');
      setAllMaterials(prev =>
        prev.map(item =>
          item.id === materialToAdjust.id && item.tipo === materialToAdjust.tipo
            ? { ...item, cantidad: amountNum }
            : item
        )
      );
    } catch (err) {
      console.error('Error al ajustar inventario:', err);
    }
  };

  // === PARTE 4: Manejo de envío del formulario de "Agregar" ===
  const handleAddSubmit = async e => {
    e.preventDefault();
    setAddError('');
    const {
      tipoGeneral,
      subTipo,
      nombre,
      descripcion,
      cantidad_inicial,
      estado,
      riesgos_fisicos,
      riesgos_salud,
      riesgos_ambientales,
      imagenFile
    } = newMaterial;

    if (!subTipo || !nombre || !cantidad_inicial || !imagenFile) {
      setAddError('Completa todos los campos obligatorios');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('tipo', subTipo);
      formData.append('nombre', nombre);
      formData.append('descripcion', descripcion);
      formData.append('cantidad_inicial', cantidad_inicial);
      formData.append('estado', estado);
      if (tipoGeneral === 'Reactivo') {
        formData.append('riesgos_fisicos', riesgos_fisicos);
        formData.append('riesgos_salud', riesgos_salud);
        formData.append('riesgos_ambientales', riesgos_ambientales);
      }
      formData.append('imagen', imagenFile);

await makeSecureApiCall(
  `${process.env.NEXT_PUBLIC_API_URL}/api/materials/crear`,
  {
    method: 'POST',
    data: formData
  }
);

      setShowAddModal(false);
      // Reset formulario
      setNewMaterial({
        tipoGeneral: 'Reactivo',
        subTipo: '',
        nombre: '',
        descripcion: '',
        cantidad_inicial: '',
        estado: 'disponible',
        riesgos_fisicos: '',
        riesgos_salud: '',
        riesgos_ambientales: '',
        imagenFile: null
      });
      // Refrescar lista
      await fetchMaterials();
    } catch (err) {
      console.error('Error al crear material:', err);
      setAddError(err.response?.data?.error || err.message);
    }
  };
  // ================================================

  
  const dismissLowStockAlert = (materialId, tipo) => {
    if (!canModifyStock()) {
      handlePermissionError('low_stock_alerts');
      return;
    }
    setLowStockMaterials(prev => 
      prev.filter(material => !(material.id === materialId && material.tipo === tipo))
    );
  };
  
  console.log('Permisos cargados:', userPermissions);
  if (permissionsLoading || loading) {
    return (
      <>
        <style jsx>{`
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin-left: 16rem;
            background: #f8f9fa;
          }
          .loading-content {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #1e3a8a;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .loading-text {
            color: #6b7280;
            font-size: 1rem;
          }
        `}</style>
        <div className="loading-container">
          <div className="loading-content">
            <div className="spinner"></div>
            <div className="loading-text">
              {permissionsLoading ? 'Verificando permisos...' : 'Cargando catálogo...'}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (permissionsError) {
    return (
      <>
        <style jsx>{`
          .error-container {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin-left: 16rem;
            background: #f8f9fa;
          }
          .error-content {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            max-width: 500px;
          }
          .error-icon {
            font-size: 3rem;
            color: #ef4444;
            margin-bottom: 1rem;
          }
          .error-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 1rem;
          }
          .error-message {
            color: #6b7280;
            font-size: 1rem;
            margin-bottom: 2rem;
          }
          .retry-button {
            background: #1e3a8a;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 1.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.15s ease;
          }
          .retry-button:hover {
            background: #1e40af;
          }
        `}</style>
        <div className="error-container">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Error de Permisos</h2>
            <p className="error-message">{permissionsError}</p>
            <button 
              className="retry-button" 
              onClick={() => {
                setPermissionsError('');
                loadUserPermissions();
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </>
    );
  }

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
        }

        .material-card.clickable {
          cursor: pointer;
        }

        .material-card.clickable:hover {
          transform: translateY(-4px);
        }

        .material-card.non-clickable {
          cursor: default;
          opacity: 0.8;
        }

        .material-image {
          width: 100%;
          height: 150px;
          object-fit: contain;
          object-position: center;
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

        .type-laboratorio {
          background: #e0e7ff;
          color: #4338ca;
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
          margin-top: 8px;
          width: 100%;
        }

        .btn-adjust:hover {
          background: #d97706;
        }

        .btn-adjust:disabled {
          background: #d1d5db;
          cursor: not-allowed;
          opacity: 0.6;
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
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          overflow: auto;
        }

        .modal-content-custom {
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: none;
          overflow: hidden;
          max-width: 500px;
          width: 90%;
          margin: 0 auto;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
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

        .no-risks {
          color: #6b7280;
          font-size: 0.875rem;
          font-style: italic;
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
  {userPermissions.rol === 'almacen' && userPermissions.modificar_stock && (
    <button
   onClick={() => setShowAddModal(true)}
      className="mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
  >
     Agregar Material/Reactivo
   </button>
 )}
   <h1>Catálogo de Reactivos</h1>
</div>


              {canModifyStock() && lowStockMaterials.length > 0 && (
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

                {userPermissions.rol !== 'alumno' && (
                  <>
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
                  </>
                )}
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
                  <div className="material-grid">
                    {filteredMaterials.length === 0 ? (
                      <p style={{ padding: '1rem 1.5rem', fontSize: '1rem', color: '#6b7280' }}>
                        No se encontraron materiales.
                      </p>
                    ) : (
                      filteredMaterials.map((material) => (
                      <div
  key={`${material.tipo}-${material.id}`}
  className={`material-card ${
    userPermissions.rol === 'almacen' && userPermissions.modificar_stock
      ? 'clickable'
      : canViewDetails()
      ? 'clickable'
      : 'non-clickable'
  }`}
  onClick={(e) => {
    e.stopPropagation();
    if (userPermissions.rol === 'almacen' && userPermissions.modificar_stock) {
      // Para almacenista abro solo ajuste
      handleAdjustClick(material);
    } else {
      handleDetailClick(material, e);
    }
  }}
>
    <img
    src={material.imagen_url}
    alt={material.nombre}
    className="material-image"
    onError={e => (e.target.src = 'https://res.cloudinary.com/.../placeholder.jpg')}
/>
                          <div className="material-card-content">
                            <div className="material-card-name">{formatName(material.nombre)}</div>
                            <span className={`material-card-type type-${material.tipo}`}>
                              {material.tipo}
                            </span>
                            <div className={`material-card-stock ${getStockColor(material)}`}>
                              {displayStock(material)}
                            </div>
                          </div>
                          {canModifyStock() && (
                            <button
                              className="btn-adjust"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdjustClick(material);
                              }}
                              disabled={!canModifyStock()}
                            >
                              Ajustar Stock
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {canMakeRequests() && (
            <div className="cart-container">
              <div className="cart-header">
                <h4>Carrito de Solicitud</h4>
                <small>{totalItems} {totalItems === 1 ? 'material' : 'materiales'} seleccionados</small>
              </div>
              <div className="cart-body">
                {selectedCart.length === 0 ? (
                  <div className="empty-cart">
                    <div className="empty-cart-icon">🛒</div>
                    <p>Carrito vacío</p>
                    <small>Selecciona materiales para crear un vale</small>
                  </div>
                ) : (
                  <>
                    {selectedCart.map((item) => (
                      <div key={`${item.tipo}-${item.id}`} className="cart-item">
                        <div>
                          <div className="cart-item-name">{formatName(item.nombre)}</div>
                          <div className="cart-item-quantity">
                            {item.cantidad} {getUnidad(item.tipo)} ({item.tipo})
                          </div>
                        </div>
                        <button
                          className="btn-remove"
                          onClick={() => removeFromCart(item.id, item.tipo)}
                          disabled={!canMakeRequests()}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
              {selectedCart.length > 0 && (
                <div className="p-4">
                  <button
                    className="btn-create-vale"
                    onClick={() => setShowRequestModal(true)}
                    disabled={selectedCart.length === 0 || totalItems === 0 || !canMakeRequests()}
                  >
                    Crear Vale
                  </button>
                  <button
                    className="btn-clear mt-3"
                    onClick={vaciarSeleccion}
                    disabled={selectedCart.length === 0 || !canMakeRequests()}
                  >
                    Vaciar Selección
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* === PARTE 3: Modal Agregar Material/Reactivo === */}
{showAddModal && (
  <div className="modal-overlay">
    <div className="modal-content-custom">
      <div className="modal-header-custom">
        <h5 className="modal-title">Agregar Material / Reactivo</h5>
        <button
          className="btn-close btn-close-white"
          onClick={() => setShowAddModal(false)}
        />
      </div>
      <form className="modal-body p-4" onSubmit={handleAddSubmit}>
        {addError && <div className="alert-custom">{addError}</div>}

        {/* Tipo general */}
        <label className="form-label">¿Es Reactivo o Material?</label>
        <select
          className="form-control mb-3"
          value={newMaterial.tipoGeneral}
          onChange={e => setNewMaterial({ ...newMaterial, tipoGeneral: e.target.value, subTipo: '' })}
        >
          <option>Reactivo</option>
          <option>Material</option>
        </select>

        {/* Subtipo */}
        <label className="form-label">Categoría específica</label>
        <select
          className="form-control mb-3"
          value={newMaterial.subTipo}
          onChange={e => setNewMaterial({ ...newMaterial, subTipo: e.target.value })}
          required
        >
          <option value="">-- Selecciona --</option>
          {newMaterial.tipoGeneral === 'Reactivo' ? (
            <>
              <option value="liquido">Líquido</option>
              <option value="solido">Sólido</option>
            </>
          ) : (
            <>
              <option value="equipo">Equipo</option>
              <option value="laboratorio">Laboratorio</option>
            </>
          )}
        </select>

        {/* Nombre */}
        <label className="form-label">Nombre *</label>
        <input
          type="text"
          className="form-control mb-3"
          value={newMaterial.nombre}
          onChange={e => setNewMaterial({ ...newMaterial, nombre: e.target.value })}
          required
        />

        {/* Descripción */}
        <label className="form-label">Descripción</label>
        <textarea
          className="form-control mb-3"
          value={newMaterial.descripcion}
          onChange={e => setNewMaterial({ ...newMaterial, descripcion: e.target.value })}
        />

        {/* Cantidad inicial */}
        <label className="form-label">
          Cantidad inicial {newMaterial.subTipo === 'liquido' ? '(ml)' : newMaterial.subTipo === 'solido' ? '(g)' : '(unidades)'} *
        </label>
        <input
          type="number"
          className="form-control mb-3"
          min="0"
          value={newMaterial.cantidad_inicial}
          onChange={e => setNewMaterial({ ...newMaterial, cantidad_inicial: e.target.value })}
          required
        />

        {/* Estado */}
        <label className="form-label">Estado</label>
        <select
          className="form-control mb-3"
          value={newMaterial.estado}
          onChange={e => setNewMaterial({ ...newMaterial, estado: e.target.value })}
        >
          <option value="disponible">Disponible</option>
          {newMaterial.tipoGeneral === 'Reactivo' && (
            <>
              <option value="no disponible">No disponible</option>
            </>
          )}
        </select>

        {/* Riesgos (solo Reactivo) */}
        {newMaterial.tipoGeneral === 'Reactivo' && (
          <>
            <label className="form-label">Riesgos Físicos</label>
            <textarea
              className="form-control mb-3"
              placeholder="Separar con ;"
              value={newMaterial.riesgos_fisicos}
              onChange={e => setNewMaterial({ ...newMaterial, riesgos_fisicos: e.target.value })}
            />
            <label className="form-label">Riesgos Salud</label>
            <textarea
              className="form-control mb-3"
              placeholder="Separar con ;"
              value={newMaterial.riesgos_salud}
              onChange={e => setNewMaterial({ ...newMaterial, riesgos_salud: e.target.value })}
            />
            <label className="form-label">Riesgos Ambientales</label>
            <textarea
              className="form-control mb-3"
              placeholder="Separar con ;"
              value={newMaterial.riesgos_ambientales}
              onChange={e => setNewMaterial({ ...newMaterial, riesgos_ambientales: e.target.value })}
            />
          </>
        )}

        {/* Imagen */}
        <label className="form-label">Imagen (.jpg)</label>
        <input
          type="file"
          accept=".jpg"
          className="form-control mb-4"
          onChange={e => setNewMaterial({ ...newMaterial, imagenFile: e.target.files[0] })}
          required
        />

        <div className="modal-footer-custom">
          <button type="button" className="btn-secondary-custom" onClick={() => setShowAddModal(false)}>
            Cancelar
          </button>
          <button type="submit" className="btn-create-vale">
            Crear
          </button>
        </div>
      </form>
    </div>
  </div>
)}
{/* =========================================== */}

        
        {showRequestModal && (
          <div className="modal-overlay">
            <div className="modal-content-custom">
              <div className="modal-header-custom">
                <h5 className="modal-title">Confirmar Solicitud</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowRequestModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {error && <div className="alert-custom mb-3">{error}</div>}
                <div className="info-alert mb-4">
                  Estás a punto de crear un vale con los siguientes materiales:
                </div>
                <div className="request-summary">
                  {selectedCart.map((item, index) => (
                    <div key={`${item.tipo}-${item.id}-${index}`} className="request-item">
                      <div>
                        <span className="fw-semibold">{formatName(item.nombre)}</span>
                        <small className="d-block">{item.tipo}</small>
                      </div>
                      <span className="fw-bold">{item.cantidad} {getUnidad(item.tipo)}</span>
                    </div>
                  ))}
                </div>
                {userPermissions.rol !== 'docente' && (
                  <div className="mb-3 mt-4">
                    <label className="form-label">Selecciona el docente encargado *</label>
                    <select
                      className="form-control"
                      value={selectedDocenteId}
                      onChange={(e) => setSelectedDocenteId(e.target.value)}
                      required
                    >
                      {docentes.map((docente) => (
                        <option key={docente.id} value={docente.id}>
                          {formatName(docente.nombre)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {userPermissions.rol === 'docente' && (
                  <div className="info-alert mt-4">
                    Como docente, tú serás el encargado de esta solicitud.
                  </div>
                )}
                {userPermissions.rol !== 'docente' && (
                  <div className="security-alert mt-4">
                    Esta solicitud será revisada por el docente seleccionado antes de ser aprobada.
                  </div>
                )}
              </div>
              <div className="modal-footer-custom">
                <button
                  className="btn-secondary-custom"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn-create-vale"
                  onClick={handleSubmitRequest}
                  disabled={!canMakeRequests() || (userPermissions.rol !== 'docente' && !selectedDocenteId)}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {showAdjustModal && materialToAdjust && (
          <div className="modal-overlay">
            <div className="modal-content-custom">
              <div className="modal-header-custom">
                <h5 className="modal-title">Ajustar Inventario: {formatName(materialToAdjust.nombre)}</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowAdjustModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {error && <div className="alert-custom mb-3">{error}</div>}
                {!canModifyStock() && (
                  <div className="alert-custom mb-3">
                    ⚠️ No tienes permisos para modificar el stock. Esta funcionalidad está restringida.
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">
                    Stock actual: {materialToAdjust.cantidad} {getUnidad(materialToAdjust.tipo)}
                  </label>
                  <input
                    type="number"
                    className="form-control mt-2"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="Nueva cantidad"
                    min="0"
                    disabled={!canModifyStock()}
                  />
                </div>
              </div>
              <div className="modal-footer-custom">
                <button
                  className="btn-secondary-custom"
                  onClick={() => setShowAdjustModal(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn-adjust"
                  onClick={handleAdjustSubmit}
                  disabled={!adjustAmount || parseInt(adjustAmount) < 0 || !canModifyStock()}
                >
                  Guardar
                </button>
                <button
   className="btn-remove mt-2"
   onClick={handleDeleteMaterial}
   style={{ background: '#ef4444', width: '100%', marginTop: '0.5rem' }}
  >
  Eliminar Material
  </button>
              </div>
            </div>
          </div>
        )}

        {showDetailModal && selectedMaterial && (
          <div className="modal-overlay">
            <div className="modal-content-custom">
              <div className="modal-header-custom">
                <h5 className="modal-title">Detalles: {formatName(selectedMaterial.nombre)}</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4 align-items-start">
                {error && <div className="alert-custom mb-3">{error}</div>}
                
                {!canViewDetails() && (
                  <div className="security-alert mb-3">
                    ⚠️ Vista limitada: Como {userPermissions.rol}, solo puedes consultar la información básica del material.
                  </div>
                )}
                
            
         <img
  src={selectedMaterial.imagen_url}
  alt={formatName(selectedMaterial.nombre)}
  className="detail-image"
  loading="lazy"
  onError={e => (e.target.src = '/placeholder.jpg')}
/>
                <h5 className="mt-4">Información</h5>
                <p className="text-muted">
                  Tipo: {selectedMaterial.tipo}
                  <br />
                  Stock: {displayStock(selectedMaterial)}
                </p>
                
                {userPermissions.rol === 'administrador' && (
                  <div className="info-alert mt-3">
                    Como administrador, puedes ver toda la información pero no puedes realizar solicitudes ni modificar directamente el stock desde este módulo.
                  </div>
                )}
                
                {userPermissions.rol === 'almacen' && !userPermissions.modificar_stock && (
                  <div className="security-alert mt-3">
                    Tienes permisos limitados de almacén. Para modificar stock o realizar solicitudes, contacta al administrador.
                  </div>
                )}
                
                {selectedMaterial.riesgos_fisicos || selectedMaterial.riesgos_salud || selectedMaterial.riesgos_ambientales ? (
                  <div>
                    <h5 className="mt-4">Riesgos</h5>
                    <div className="riesgos-container">
                      {parseRiesgos(selectedMaterial.riesgos_fisicos).map((riesgo) => (
                        <span key={riesgo} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                          {getRiesgoIcon(riesgo)} {riesgo}
                        </span>
                      ))}
                      {parseRiesgos(selectedMaterial.riesgos_salud).map((riesgo) => (
                        <span key={riesgo} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                          {getRiesgoIcon(riesgo)} {riesgo}
                        </span>
                      ))}
                      {parseRiesgos(selectedMaterial.riesgos_ambientales).map((riesgo) => (
                        <span key={riesgo} className={`riesgo-badge ${getRiesgoColor(riesgo)}`}>
                          {getRiesgoIcon(riesgo)} {riesgo}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="no-risks mt-4">No se han registrado riesgos para este material.</p>
                )}
                
                {canMakeRequests() && canViewDetails() && (
                  <div className="mt-4">
                    <label className="form-label">Cantidad a solicitar</label>
                    <input
                      type="number"
                      className="form-control mt-2"
                      value={detailAmount}
                      onChange={(e) => setDetailAmount(e.target.value)}
                      placeholder="Ingresa cantidad"
                      min="1"
                      max={selectedMaterial.cantidad}
                      disabled={selectedMaterial.cantidad === 0}
                    />
                    <button
                      className="btn-add-to-cart mt-3"
                      onClick={() => addToCart(selectedMaterial, detailAmount)}
                      disabled={
                        !detailAmount || 
                        parseInt(detailAmount) <= 0 || 
                        parseInt(detailAmount) > selectedMaterial.cantidad ||
                        selectedMaterial.cantidad === 0 ||
                        !canMakeRequests()
                      }
                    >
                      {selectedMaterial.cantidad === 0 ? 'Material Agotado' : 'Añadir al carrito'}
                    </button>
                    
                    {userPermissions.rol === 'alumno' && (
                      <div className="info-alert mt-3">
                        💡 Como alumno, tu solicitud necesitará aprobación docente antes de procesarse.
                      </div>
                    )}
                    
                    {userPermissions.rol === 'docente' && (
                      <div className="info-alert mt-3">
                        ⚡ Como docente, tu solicitud será aprobada automáticamente.
                      </div>
                    )}
                    
                    {userPermissions.rol === 'almacen' && userPermissions.modificar_stock && (
                      <div className="info-alert mt-3">
                        🔧 Como personal de almacén con permisos, puedes tanto solicitar materiales como ajustar el inventario.
                      </div>
                    )}
                  </div>
                )}
                
                {!canMakeRequests() && canViewDetails() && (
                  <div className="security-alert mt-4">
                    {userPermissions.rol === 'administrador' 
                      ? '🔒 Los administradores gestionan el sistema pero no realizan solicitudes directamente.'
                      : '🔒 No tienes permisos para realizar solicitudes. Contacta al administrador.'
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
