// frontend/components/ChatWindow.jsx
'use client';
import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

export default function ChatWindow() {
  const [mensajes, setMensajes] = useState([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    socket.on('recibirMensaje', (msg) => {
      setMensajes((prev) => [...prev, msg]);
    });

    return () => socket.off('recibirMensaje');
  }, []);

  const enviarMensaje = () => {
    if (mensaje.trim()) {
      socket.emit('enviarMensaje', { usuario: 'Usuario', texto: mensaje });
      setMensaje('');
    }
  };

  return (
    <div className="card h-96 overflow-y-auto mb-4">
      {mensajes.map((msg, index) => (
        <div key={index} className="p-2">
          <strong>{msg.usuario}:</strong> {msg.texto} <span className="text-gray-500 text-sm">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
      <div className="flex">
        <input
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          className="input flex-1 mr-2"
          placeholder="Escribe un mensaje..."
        />
        <button onClick={enviarMensaje} className="btn-primary">Enviar</button>
      </div>
    </div>
  );
}