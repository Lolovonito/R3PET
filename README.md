# ♻️ R3PET - Sistema de Reciclaje Escolar

R3PET es un **proyecto escolar de acceso restringido**, diseñado específicamente para fomentar el reciclaje dentro de la comunidad escolar mediante un sistema de puntos, recompensas y gestión de residuos (botellas y tapitas). 

> [!IMPORTANT]
> Este es un sistema de uso interno. El acceso y registro de usuarios está limitado a los alumnos y personal autorizado.

La plataforma utiliza **Firebase** para la autenticación y base de datos en tiempo real, junto con **Capacitor** para ofrecer una experiencia nativa en dispositivos móviles Android.

## 🚀 Características Principales

### 🎓 Módulo Estudiante
- **Dashboard Personal**: Visualización de puntos acumulados, botellas y tapitas recicladas.
- **Historial de Puntos**: Registro detallado de cada aportación realizada.
- **Canje de Premios**: Catálogo de recompensas disponibles con validación QR.
- **Perfil Personalizado**: Gestión de avatar y datos personales.

### 📝 Módulo Registrador
- **Escáner de Alta Velocidad**: Integración con **ML Kit Barcode Scanning** para leer códigos QR y de barras.
- **Asignación de Puntos**: Interfaz optimizada para registrar aportaciones de forma manual o mediante escaneo.
- **Validación de Canjes**: Verificación instantánea de vales de premios.
- **Historial de Trabajo**: Seguimiento de los registros realizados por el registrador.

### 👨‍💼 Módulo Administrador
- **Gestión de Usuarios**: Creación, edición y borrado (sincronizado con Firebase Auth) de usuarios.
- **Importación Masiva**: Carga de alumnos mediante archivos **Excel (.xlsx)**.
- **Estadísticas Globales**: Visualización del impacto ambiental total (Kg reciclados, puntos emitidos).
- **Control de Inventario**: Gestión de recompensas y stock.

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React.js + Vite
- **Estilos**: Tailwind CSS + Lucide Icons
- **Backend / DB**: Firebase (Auth, Firestore, Hosting)
- **Capa Nativa**: Capacitor
- **Librerías Clave**:
  - `@capacitor-mlkit/barcode-scanning` (Escaneo nativo)
  - `xlsx` (Procesamiento de archivos Excel)
  - `lucide-react` (Iconografía premium)
  - `react-avatar-editor` (Edición de fotos de perfil)

## 📋 Requisitos Previos

- **Node.js**: v18 o superior
- **NPM**: v9 o superior
- **Android Studio**: Para compilación nativa
- **Firebase CLI**: Para despliegue web

## ⚙️ Instalación y Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Lolovonito/R3PET.git
   cd r3pet-app
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar Firebase**:
   Actualiza el archivo `src/firebaseConfig.js` con las credenciales de tu proyecto.

4. **Variables de Entorno (Excel)**:
   Asegúrate de configurar las rutas y formatos permitidos para la carga masiva en los componentes de administración.

## 🚀 Comandos Útiles

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local. |
| `npm run build` | Compila la aplicación para producción. |
| `npm run deploy` | Despliega la versión web a Firebase Hosting. |
| `npm run android:prepare` | Compila, sincroniza Capacitor y aplica parches de Gradle. |
| `npm run android:open` | Abre el proyecto nativo en Android Studio. |

## 🔐 Reglas de Seguridad de Firestore (Recomendadas)

Para que el sistema funcione correctamente con los roles de `registrador`, `admin` y `student`, aplica las siguientes reglas en tu consola de Firebase:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      let role = get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role;
      return request.auth != null && (role == 'admin' || role == 'administrador');
    }
    function isRegistrar() {
      let role = get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role;
      return request.auth != null && (role == 'registrar' || role == 'registrador');
    }
    match /profiles/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid || isAdmin() || isRegistrar();
    }
    match /transactions/{id} { 
      allow read: if request.auth != null && (isAdmin() || isRegistrar() || resource.data.student_id == request.auth.uid);
      allow write: if isAdmin() || isRegistrar();
    }
    match /global_stats/{id} { 
      allow read: if request.auth != null; 
      allow write: if isAdmin() || isRegistrar(); 
    }
  }
}
```

## 📱 Compilación para Android

1. Ejecuta `npm run android:prepare`.
2. Abre Android Studio y espera a que Gradle termine la sincronización.
3. Asegúrate de tener instalado el **Android SDK 34**.
4. Usa el botón **Run** para instalar en un dispositivo físico con depuración USB activa.

---

Desarrollado con ❤️ para el cuidado del medio ambiente.
