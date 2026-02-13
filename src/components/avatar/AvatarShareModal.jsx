import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Share2, MessageCircle, Download, Copy, Check } from 'lucide-react';

const AvatarShareModal = ({ 
  isOpen, 
  onClose, 
  user, 
  avatarStyle = {}
}) => {
  const [copied, setCopied] = useState(false);
  const [profileMessage, setProfileMessage] = useState(user?.profile_message || '');
  const [profilePublic, setProfilePublic] = useState(user?.profile_public || false);

  if (!isOpen) return null;

  // Generar URL del perfil
  const profileUrl = `${window.location.origin}/profile/${user?.id}`;
  
  // Mensaje motivacional
  const motivationalMessages = [
    '¡Uniendo fuerzas por un planeta más verde! 🌱',
    'Cada botella cuenta en nuestra misión ecológica ♻️',
    'Haciendo del mundo un lugar mejor, una botella a la vez 🌍',
    'Mi compromiso con el medio ambiente empieza aquí 🌿',
    'Juntos podemos marcar la diferencia 🌊'
  ];

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const shareOnWhatsApp = () => {
    const message = `🌱 Únete a R3PET - ${user?.full_name} ha reciclado ${user?.total_bottles || 0} botellas. ¡Súmate al cambio!`;
    const url = `https://wa.me/?text=${encodeURIComponent(message + ' ' + profileUrl)}`;
    window.open(url, '_blank');
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
    window.open(url, '_blank');
  };

  const shareOnTwitter = () => {
    const message = `🌱 ${user?.full_name} en R3PET - ${user?.total_bottles || 0} botellas recicladas. ¡Únete al movimiento ecológico!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(profileUrl)}`;
    window.open(url, '_blank');
  };

  const downloadQR = () => {
    const canvas = document.querySelector('#qr-code canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `r3pet-profile-${user?.id}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Compartir Perfil</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-200 to-blue-300 flex items-center justify-center text-2xl font-bold text-white mb-3">
              {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <h3 className="font-bold text-gray-800">{user?.full_name}</h3>
            <p className="text-sm text-gray-500">{user?.role}</p>
            {user?.role === 'student' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-bold text-green-600">{user?.points || 0} pts</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{user?.total_bottles || 0} botellas</span>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div id="qr-code" className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <QRCodeCanvas 
                value={profileUrl} 
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <button
              onClick={downloadQR}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
            >
              <Download size={16} />
              Descargar QR
            </button>
          </div>

          {/* Profile Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensaje del Perfil
            </label>
            <textarea
              value={profileMessage}
              onChange={(e) => setProfileMessage(e.target.value)}
              placeholder="Comparte tu motivación ecológica..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Public Profile Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Perfil Público</label>
              <p className="text-xs text-gray-500">Permite que otros vean tu perfil</p>
            </div>
            <button
              onClick={() => setProfilePublic(!profilePublic)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                profilePublic ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  profilePublic ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Share Buttons */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Compartir en</h4>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={shareOnWhatsApp}
                className="flex flex-col items-center gap-2 p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <MessageCircle size={20} />
                <span className="text-xs">WhatsApp</span>
              </button>
              <button
                onClick={shareOnFacebook}
                className="flex flex-col items-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Share2 size={20} />
                <span className="text-xs">Facebook</span>
              </button>
              <button
                onClick={shareOnTwitter}
                className="flex flex-col items-center gap-2 p-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
              >
                <Share2 size={20} />
                <span className="text-xs">Twitter</span>
              </button>
            </div>
          </div>

          {/* Copy Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enlace del Perfil
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profileUrl}
                readOnly
                className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => copyToClipboard(profileUrl)}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Motivational Messages */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-2">Mensajes Motivacionales</h4>
            <div className="space-y-2">
              {motivationalMessages.map((msg, index) => (
                <button
                  key={index}
                  onClick={() => setProfileMessage(msg)}
                  className="w-full text-left p-2 bg-white rounded border border-green-200 hover:bg-green-100 transition-colors"
                >
                  <span className="text-xs text-gray-700">{msg}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarShareModal;