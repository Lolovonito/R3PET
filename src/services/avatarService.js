import imageCompression from 'browser-image-compression';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../firebaseConfig'; // Ajusta la importación según tu estructura

export const avatarService = {
  /**
   * Comprime y optimiza la imagen antes de subirla
   * @param {File} file - Archivo de imagen original
   * @returns {Promise<File>} - Archivo optimizado
   */
  async optimizeImage(file) {
    const options = {
      maxSizeMB: 0.5, // Max 500KB
      maxWidthOrHeight: 500, // Max 500px ancho/alto
      useWebWorker: true,
      fileType: 'image/webp' // Convertir a WebP
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Error optimizando imagen:", error);
      throw error;
    }
  },

  /**
   * Sube el avatar a Firebase Storage y actualiza el perfil en Firestore
   * @param {string} userId - ID del usuario
   * @param {File} file - Archivo de imagen a subir
   * @returns {Promise<string>} - URL de descarga del avatar
   */
  async uploadAvatar(userId, file) {
    try {
      // 1. Optimizar imagen
      const optimizedFile = await this.optimizeImage(file);

      // 2. Crear referencia en Storage
      // Usamos timestamp para evitar problemas de caché
      const filename = `avatars/${userId}_${Date.now()}.webp`;
      const storageRef = ref(storage, filename);

      // 3. Subir archivo
      await uploadBytes(storageRef, optimizedFile);

      // 4. Obtener URL
      const downloadURL = await getDownloadURL(storageRef);

      // 5. Actualizar Firestore
      const userRef = doc(db, "profiles", userId);
      await updateDoc(userRef, {
        avatar_url: downloadURL,
        avatar_updated_at: new Date()
      });

      return downloadURL;
    } catch (error) {
      console.error("Error subiendo avatar:", error);
      throw error;
    }
  },

  /**
   * Actualizar el estilo del avatar en Firestore
   * @param {string} userId - ID del usuario
   * @param {Object} style - Estilo del avatar
   * @returns {Promise<void>}
   */
  async updateAvatarStyle(userId, style) {
    try {
      const userRef = doc(db, "profiles", userId);
      await updateDoc(userRef, {
        avatar_frame: style.frame || 'none',
        avatar_filter: style.filter || 'none',
        avatar_background: style.background || 'default',
        avatar_effects: style.effects || [],
        avatar_updated_at: new Date()
      });
    } catch (error) {
      console.error("Error actualizando estilo de avatar:", error);
      throw error;
    }
  }
};