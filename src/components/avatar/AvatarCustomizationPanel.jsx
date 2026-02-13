import React, { useState } from 'react';
import { Palette, Sparkles, Leaf, Award, Zap, Shield, Star } from 'lucide-react';

const AvatarCustomizationPanel = ({ 
  user, 
  onStyleChange,
  currentStyle = {},
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('frames');
  
  // Frames temáticos R3PET
  const frames = [
    { id: 'none', name: 'Ninguno', icon: null, color: 'border-gray-300' },
    { id: 'eco', name: 'Ecológico', icon: Leaf, color: 'border-green-500' },
    { id: 'gold', name: 'Dorado', icon: Star, color: 'border-yellow-500' },
    { id: 'power', name: 'Poder', icon: Zap, color: 'border-purple-500' },
    { id: 'shield', name: 'Escudo', icon: Shield, color: 'border-blue-500' },
    { id: 'award', name: 'Premio', icon: Award, color: 'border-orange-500' }
  ];

  // Filtros de imagen
  const filters = [
    { id: 'none', name: 'Normal', preview: 'none' },
    { id: 'vintage', name: 'Vintage', preview: 'sepia(0.3)' },
    { id: 'cool', name: 'Frío', preview: 'hue-rotate(180deg)' },
    { id: 'warm', name: 'Cálido', preview: 'sepia(0.2) saturate(1.5)' },
    { id: 'dramatic', name: 'Dramático', preview: 'contrast(1.3) brightness(0.9)' },
    { id: 'soft', name: 'Suave', preview: 'brightness(1.1) saturate(0.8)' }
  ];

  // Fondos
  const backgrounds = [
    { id: 'default', name: 'Default', gradient: 'bg-gradient-to-br from-gray-100 to-gray-200' },
    { id: 'nature', name: 'Naturaleza', gradient: 'bg-gradient-to-br from-green-200 to-blue-300' },
    { id: 'sunset', name: 'Atardecer', gradient: 'bg-gradient-to-br from-orange-200 to-pink-300' },
    { id: 'ocean', name: 'Océano', gradient: 'bg-gradient-to-br from-blue-200 to-cyan-300' },
    { id: 'forest', name: 'Bosque', gradient: 'bg-gradient-to-br from-green-300 to-green-500' },
    { id: 'galaxy', name: 'Galaxia', gradient: 'bg-gradient-to-br from-purple-300 to-indigo-500' }
  ];

  // Efectos especiales (desbloqueables por puntos)
  const effects = user?.role === 'student' ? [
    { id: 'sparkles', name: 'Brillos', icon: Sparkles, required: 100, unlocked: (user?.points || 0) >= 100 },
    { id: 'glow', name: 'Resplandor', icon: Zap, required: 250, unlocked: (user?.points || 0) >= 250 },
    { id: 'rainbow', name: 'Arcoíris', icon: Palette, required: 500, unlocked: (user?.points || 0) >= 500 }
  ] : [];

  // Aplicar estilo
  const applyStyle = (category, value) => {
    const newStyle = { ...currentStyle };
    if (category === 'effects') {
      // Toggle efectos
      const currentEffects = newStyle.effects || [];
      if (currentEffects.includes(value)) {
        newStyle.effects = currentEffects.filter(e => e !== value);
      } else {
        newStyle.effects = [...currentEffects, value];
      }
    } else {
      newStyle[category] = value;
    }
    onStyleChange(newStyle);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Palette size={20} className="text-purple-600" />
          Personalización de Avatar
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('frames')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'frames' 
              ? 'text-purple-600 border-b-2 border-purple-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Frames
        </button>
        <button
          onClick={() => setActiveTab('filters')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'filters' 
              ? 'text-purple-600 border-b-2 border-purple-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Filtros
        </button>
        <button
          onClick={() => setActiveTab('backgrounds')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'backgrounds' 
              ? 'text-purple-600 border-b-2 border-purple-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Fondos
        </button>
        {effects.length > 0 && (
          <button
            onClick={() => setActiveTab('effects')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'effects' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Efectos
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Frames */}
        {activeTab === 'frames' && (
          <div className="grid grid-cols-3 gap-3">
            {frames.map(frame => {
              const Icon = frame.icon;
              return (
                <button
                  key={frame.id}
                  onClick={() => applyStyle('frame', frame.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    currentStyle.frame === frame.id
                      ? `${frame.color} bg-white shadow-md`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {Icon && <Icon size={24} className={`mx-auto mb-1 ${frame.color.replace('border-', 'text-')}`} />}
                  <span className="text-xs font-medium text-gray-700">{frame.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filtros */}
        {activeTab === 'filters' && (
          <div className="grid grid-cols-2 gap-3">
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => applyStyle('filter', filter.id)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  currentStyle.filter === filter.id
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-full h-12 rounded mb-2 bg-gray-200" style={{ filter: filter.preview }}></div>
                <span className="text-xs font-medium text-gray-700">{filter.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Fondos */}
        {activeTab === 'backgrounds' && (
          <div className="grid grid-cols-2 gap-3">
            {backgrounds.map(bg => (
              <button
                key={bg.id}
                onClick={() => applyStyle('background', bg.id)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  currentStyle.background === bg.id
                    ? 'border-purple-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-full h-12 rounded mb-2 ${bg.gradient}`}></div>
                <span className="text-xs font-medium text-gray-700">{bg.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Efectos */}
        {activeTab === 'effects' && (
          <div className="space-y-3">
            {effects.map(effect => {
              const Icon = effect.icon;
              const isActive = (currentStyle.effects || []).includes(effect.id);
              return (
                <button
                  key={effect.id}
                  onClick={() => applyStyle('effects', effect.id)}
                  disabled={!effect.unlocked}
                  className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                    !effect.unlocked
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : isActive
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} className={effect.unlocked ? 'text-purple-600' : 'text-gray-400'} />
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium text-gray-700">{effect.name}</span>
                    <span className="text-xs text-gray-500 block">
                      {effect.unlocked ? 'Desbloqueado' : `Requiere ${effect.required} puntos`}
                    </span>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarCustomizationPanel;