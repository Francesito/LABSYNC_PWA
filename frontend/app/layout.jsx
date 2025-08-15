// Este archivo debe ser un componente de servidor, por eso no usamos 'use client'

import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { AuthProvider } from '../lib/auth';
import ClientLayout from '../components/ClientLayout';
import PWAInstaller from '../components/PWAInstaller'; // ← NUEVO

export const metadata = {
  title: 'LabSync',
  description: 'Sistema de gestión de materiales de laboratorio',
  // ↓ NUEVOS METADATA PWA
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LabSync',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* Meta tags adicionales PWA */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LabSync" />
      </head>
      <body className="bg-gradient-to-br from-gray-900 to-blue-900 min-vh-100">
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
        <PWAInstaller /> {/* ← NUEVO - Botón instalación */}
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          async
        />
      </body>
    </html>
  );
}