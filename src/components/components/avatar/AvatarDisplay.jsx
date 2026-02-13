import React from 'react';
import { Camera, User } from 'lucide-react';

const ROLE_COLORS = {
    admin: 'ring-purple-500 bg-purple-100 text-purple-600',
    registrar: 'ring-blue-500 bg-blue-100 text-blue-600',
    student: 'ring-green-500 bg-green-100 text-green-600',
    default: 'ring-gray-200 bg-gray-100 text-gray-400'
};

const SIZES = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-xl',
    '2xl': 'w-32 h-32 text-2xl'
};

export default function AvatarDisplay({
    user,
    size = 'md',
    showEditButton = false,
    onEditClick,
    className = '',
    avatarStyle = {}
}) {
    const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.default;
    const sizeClass = SIZES[size] || SIZES.md;
    const hasImage = !!user?.avatar_url;
    
    // Estilos de avatar
    const frame = avatarStyle.frame || 'none';
    const filter = avatarStyle.filter || 'none';
    const background = avatarStyle.background || 'default';
    const effects = avatarStyle.effects || [];

    // Obtener iniciales
    const getInitials = () => {
        if (!user?.full_name) return '?';
        return user.full_name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

// Clases de fondo
    const backgroundClasses = {
        default: 'bg-gray-100',
        nature: 'bg-gradient-to-br from-green-200 to-blue-300',
        sunset: 'bg-gradient-to-br from-orange-200 to-pink-300',
        ocean: 'bg-gradient-to-br from-blue-200 to-cyan-300',
        forest: 'bg-gradient-to-br from-green-300 to-green-500',
        galaxy: 'bg-gradient-to-br from-purple-300 to-indigo-500'
    };

    // Clases de frames
    const frameClasses = {
        none: '',
        eco: 'ring-4 ring-green-500 ring-offset-2',
        gold: 'ring-4 ring-yellow-500 ring-offset-2',
        power: 'ring-4 ring-purple-500 ring-offset-2',
        shield: 'ring-4 ring-blue-500 ring-offset-2',
        award: 'ring-4 ring-orange-500 ring-offset-2'
    };

    // Estilos de filtro
    const filterStyles = {
        none: '',
        vintage: 'sepia(0.3)',
        cool: 'hue-rotate(180deg)',
        warm: 'sepia(0.2) saturate(1.5)',
        dramatic: 'contrast(1.3) brightness(0.9)',
        soft: 'brightness(1.1) saturate(0.8)'
    };

    return (
        <div className={`relative group ${className}`}>
            <div
                className={`
                    ${sizeClass} rounded-full flex items-center justify-center 
                    overflow-hidden border-2 border-white shadow-sm ring-2 
                    ${hasImage ? 'ring-gray-100' : roleColor}
                    ${backgroundClasses[background] || backgroundClasses.default}
                    ${frameClasses[frame] || ''}
                    transition-all duration-300 relative
                `}
                style={{ filter: filterStyles[filter] || '' }}
            >
                {hasImage ? (
                    <img
                        src={user.avatar_url}
                        alt={user.full_name || 'Avatar'}
                        className="w-full h-full object-cover"
                        style={{ filter: filterStyles[filter] || '' }}
                    />
                ) : (
                    <span className="font-bold tracking-wider">
                        {getInitials()}
                    </span>
                )}

                {/* Botón de edición (Overlay) */}
                {showEditButton && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditClick();
                        }}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer hover:bg-black/50"
                        title="Cambiar foto de perfil"
                    >
                        <Camera className="text-white opacity-80" size={24} />
                    </button>
                )}
</div>

            {/* Efectos especiales */}
            {effects.includes('sparkles') && (
                <div className="absolute -top-1 -right-1 text-yellow-400 animate-pulse">
                    ✨
                </div>
            )}
            {effects.includes('glow') && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 opacity-30 animate-pulse blur-sm"></div>
            )}
            {effects.includes('rainbow') && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 opacity-20 animate-spin blur-sm"></div>
            )}

            {/* Botón flotante (alternativa para móviles o diseño explícito) */}
            {showEditButton && size !== 'sm' && (
                <div
                    onClick={onEditClick}
                    className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-lg border border-gray-100 text-gray-600 cursor-pointer hover:text-blue-600 hover:scale-110 transition-all md:hidden"
                >
                    <Camera size={14} />
                </div>
            )}
        </div>
    );
}
