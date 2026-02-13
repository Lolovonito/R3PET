import { useState } from 'react';
import { avatarService } from '../services/avatarService';

export function useAvatar() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const updateAvatar = async (userId, file) => {
    setIsUploading(true);
    setError(null);
    try {
      const url = await avatarService.uploadAvatar(userId, file);
      return url;
    } catch (err) {
      console.error("Error en hook useAvatar:", err);
      setError(err.message || "Error al subir el avatar");
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    updateAvatar,
    isUploading,
    error
  };
}