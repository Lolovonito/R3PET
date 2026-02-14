import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const newFunc = `    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten imágenes');
            return;
        }

        console.log("Iniciando carga de avatar...", file.name, file.size);
        setUploading(true);
        try {
            // 1. Compresión Agresiva (50KB) para Firestore
            console.log("Comprimiendo imagen...");
            const options = { maxSizeMB: 0.05, maxWidthOrHeight: 400, useWebWorker: false };
            const compressedFile = await imageCompression(file, options);
            console.log("Imagen comprimida:", compressedFile.size);

            // 2. Base64
            console.log("Convirtiendo a Base64...");
            const reader = new FileReader();
            const base64Promise = new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(compressedFile);
            });
            const base64String = await base64Promise;
            console.log("Base64 generado (longitud):", base64String.length);

            // 3. Guardar en Firestore
            console.log("Guardando en Firestore para el usuario:", userId);
            if (!userId) throw new Error("ID de usuario no encontrado en el contexto.");

            await updateDoc(doc(db, "profiles", userId), { avatar_url: base64String });
            setProfile(prev => ({ ...prev, avatar_url: base64String }));
            console.log("¡Éxito! Avatar actualizado.");
            alert("Avatar actualizado (Base64) 🚀");
        } catch (error) {
            console.error('Error detallado:', error);
            alert('Error al gestionar imagen: ' + error.message);
        } finally { 
            console.log("Restableciendo estado de carga.");
            setUploading(false); 
        }
    };`;

// Regex matching the Base64 version (with or without my previous logs)
// We match the async (e) => { up to the finally block and its closing braces.
const pattern = /    const handleAvatarUpload = async \(e\) => \{[\s\S]*?finally \{[\s\S]*?setUploading\(false\);[\s\S]*?\}[\s\S]*?\};/g;

if (pattern.test(content)) {
    content = content.replace(pattern, newFunc);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully added debug logs and disabled webWorker.');
} else {
    console.error('Could not find handleAvatarUpload function with the expected pattern.');
    process.exit(1);
}
