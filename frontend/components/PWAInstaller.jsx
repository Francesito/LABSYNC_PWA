'use client';
import { usePWA } from '../hooks/usePWA';

export default function PWAInstaller() {
  const { isInstallable, installPWA } = usePWA();

  if (!isInstallable) return null;

  return (
    <div 
      className="position-fixed" 
      style={{
        bottom: '20px',
        right: '20px',
        zIndex: 9999
      }}
    >
      <button 
        onClick={installPWA}
        className="btn btn-primary d-flex align-items-center gap-2 shadow-lg"
        style={{
          borderRadius: '12px',
          padding: '12px 16px'
        }}
      >
        <i className="bi bi-phone"></i>
        Instalar LabSync
      </button>
    </div>
  );
}