# 🤖 R3PET - Guía de Arquitectura y Análisis Profundo para Agentes de IA

**ESTATUS: DOCUMENTO MAESTRO OBLIGATORIO PARA TODA IA SUPERVISORA.**
Cualquier modificación arquitectónica futura **debe** reflejarse en este documento. Si eres un agente de IA asignado a este proyecto, **LEE TOTALMENTE ESTE DOCUMENTO ANTES DE SUGERIR O APLICAR CAMBIOS DE CÓDIGO.**

---

## 🏗️ 1. Visión General del Proyecto y Arquitectura

R3PET es un sistema unificado diseñado para escuelas, concebido como una **Progressive Web App (PWA) convertida a aplicación móvil nativa a través de Capacitor**. 
El principio fundamental de la arquitectura es ser **Serverless**. No hay un servidor Node.js intermediario; el frontend de React interactúa directamente con **Firebase Services** (Auth, Firestore, Storage, Hosting).

- **Framework Core**: React 18.2 + Vite
- **Integrador Móvil**: Capacitor 5.x
- **Gestor de Rutas**: `react-router-dom` v6 (`HashRouter` obligatorio para compatibilidad de rutas locales en Android).
- **Styling**: Tailwind CSS + `clsx` + `tailwind-merge` + CSS Crudo (`src/index.css` es vital).
- **Estado Global**: Manejado ad-hoc en el top-level de `App.jsx` (useState, useEffect) y pasado por props o `useOutletContext`.

---

## 🗄️ 2. Modelo de Datos Exhaustivo (Firebase Firestore)

Firestore se usa en modo NoSQL y **todas las reglas de seguridad dependen del UID de Firebase Auth y campos específicos de documentos**.

### A. Colección: `profiles`
Contiene la información "viva" del usuario. Regla de seguridad: Todo usuario autenticado puede leer. Modificaciones solo por `admin`, `registrar`, o el propio usuario (`uid == request.auth.uid`).
- **id** (String): `doc.id` es estrictamente el UID de Firebase Auth.
- **full_name** (String): Nombre completo real.
- **matricula** (String): Identificador único de control escolar.
- **role** (String): Define los permisos de UI. **CUIDADO (Quirk)**: Debido a migraciones y requerimientos de usuarios, el rol en DB puede estar en español (`'alumno', 'registrador', 'administrador'`) o inglés (`'student', 'registrar', 'admin'`).
- **points** (Number): Saldo actual canjeable. Disminuye en canjes, aumenta en registros.
- **lifetime_points** (Number): Puntos históricos. NUNCA disminuye. Usado para el Ranking global.
- **total_bottles** / **total_caps** (Number): Contadores absolutos de reciclaje por usuario.
- **avatar_url** (String): **Quirk Base64**. Para evitar problemas de CORS de Firestore/Storage al exportar reportes Excel, los avatares se comprimen localmente (menos de 50KB) y **se guardan como cadena pura Data URL Base64 directamente en este campo**.
- **disabled** (Boolean): Bandera de soft delete. Si `true`, el listener de `App.jsx` fuerza un `signOut()`.

### B. Colección: `transactions`
Libro mayor inmutable (Ledger). Registra cada movimiento de puntos.
- **id** (Document ID autogenerado): No tiene significado semántico.
- **student_id** (String) y **student_name** (String): Referencias al estudiante afectado. Almacenar el nombre desnormalizado permite búsquedas sin *joins*.
- **performer_id** (String) y **registar_by** (String): El UID del Administrador/Registrador que efectuó la acción.
- **type** (String): `'registro'` (suma de botellas/tapitas) o `'canje'` (resta de saldo).
- **points**, **bottles**, **caps** (Number): Valores absolutos delta de la transacción.
- **description** (String): Resumen de la acción (e.g. "Registro: 2 botellas", "Canje Validado: Vaso Taza").
- **timestamp** (Firebase ServerTimestamp): Crítico para ordenamiento cronológico.

### C. Documento: `global_stats/totals`
Un agregador global tipo Singleton.
- Mantiene contadores globales (`total_points`, `total_bottles`, `total_caps`, `total_kg`).
- **Lógica Crítica**: Jamás debe actualizarse con `setDoc` simple. Obligatoriamente debe usarse `runTransaction` junto con `increment` de Firebase para evitar condiciones de carrera (race conditions) en accesos concurrentes de múltiples registradores.

---

## 🧩 3. Análisis de Componentes Clave y Lógica React

El frontend es un monolito dividido en módulos funcionales.

### 3.1. `main.jsx`
- Punto de montaje principal. Envuelve `App` en `React.StrictMode` y `<HashRouter>`.
- Posee un envoltorio `try-catch` que inyecta HTML directo en el DOM si React "crashea" profundamente (Fallback de emergencia).

### 3.2. `App.jsx` (El Core Controller)
Más que un componente, actúa como el Controlador Frontal.
- **Listener de Auth**: Usa `onAuthStateChanged` para determinar si renderizar `<LoginScreen>` o las rutas internas.
- **Listener de Perfil en Tiempo Real**: Si un usuario tiene sesión, se adjunta un `onSnapshot` a su `profiles/{uid}`.
- **⚠️ QUIRK CRÍTICO (Traducción Activa de Roles)**:
  ```javascript
  // Se procesa en cada render del snapshot
  let role = profileData.role || 'student';
  if (role === 'alumno') role = 'student';
  if (role === 'registrador') role = 'registrar';
  // Administradores usualmente se guardan en BD como 'admin' intacto.
  ```
  Esto significa que el sub-ruteo (`/app/admin`, `/app/registrar`) asume y exige los valores en inglés para el estado de React `userRole`, sin importar lo que contenga la BD.

- **Escáner Híbrido (`RegistrarScanner`)**:
  - Implementa `@capacitor-mlkit/barcode-scanning`.
  - **Lógica de Fallback Web**: Si Capacitor no detecta plataforma nativa nativa (o lanza error simulando ambiente PWA desktop), cae a la librería web `html5-qrcode`.
  - **Limpieza (stopScanner)**: **EXTREMADAMENTE FRÁGIL**. Si se cierra el escáner nativo y los listeners de la cámara no son purgados `await BarcodeScanner.removeAllListeners()`, el escáner disparará eventos atrasados causando el reinicio (crash) del árbol DOM hacia "Cargando R3PET...".
  - **Transacciones Dobles**: `processRedemption` y `handleRegister` agrupan la actualización de `profiles/uid`, la creación de un doc en `transactions/` y la actualización de `global_stats/totals` en una sola Promesa usando `runTransaction()`. Si una de las 3 falla (o hay error de permisos de Firebase Rules), falla todo atómicamente. Mantenlo así.

### 3.3. `AdminComponents.jsx` (La Sala de Control)
Aloja los módulos administrativos. Lo más importante:
- **Gestión masiva de Usuarios (Excel)**: 
  Importa usuarios desde `.xlsx`, crea cuentas en Firebase Auth y luego pobla la colección `profiles`. 
  - Genera contraseñas aleatorias o por defecto si no vienen en la columna "Contraseña".
  - Almacena una copia de texto plano de la contraseña en `profile.password` **SOLO si el usuario se generó por Excel**. Esto es una directriz de diseño específica para poder entregar credenciales a los alumnos posteriormente exportando la base.
- Exportación: Usa `xlsx` para generar libros de trabajo tomando datos de Firestore. Ojo con la conversión asíncrona de avatares base64 y el límite de RAM del dispositivo al exportar grandes listas.

### 3.4. Motor de Avatares (`AvatarDisplay.jsx` y `ProfileScreen`)
- **Compresión**: Usa `browser-image-compression`. Es INNEGOCIABLE. Las imágenes directas de la cámara pueden pesar +8MB, destruyendo la cuota de lectura de Firestore si renderizas el ranking.
- Se comprimen a <50KB, `maxWidth/Height=200`, usando y creando un `Data URL`.
- Esto soluciona problemas de reglas de Storage en exportaciones Excel generadas desde un origin "file://" (Android WebView local).

---

## 🎨 4. Tailwind y Capa Css Nativa (`index.css`)

R3PET parece un sitio web moderno gracias a utilidades Tailwind. Sin embargo, hay un "talón de aquiles" entre DOM Web y la capa Nativa en `index.css`.

### ⚠️ EL QUIRK DEL ESCÁNER DE CAMARA (Transparencia forzada)
El plugin de Ionic/Capacitor para escanear Barcodes no inyecta el video en HTML. **La cámara se dibuja POR DETRÁS** del navegador (WebView) nativo.
Para que la interfaz de cámara sea visible, *todo el DOM de React desde `<html>` hasta el `<main>` debe volverse transparente*.

En `App.jsx`, al abrir el escáner se hace: `document.body.classList.add('barcode-scanner-active');`

En `index.css`, existen reglas agresivas:
```css
html.barcode-scanner-active,
body.barcode-scanner-active,
body.barcode-scanner-active #root,
body.barcode-scanner-active main,
body.barcode-scanner-active .min-h-screen {
  background: transparent !important;
  background-color: transparent !important;
  --tw-bg-opacity: 0 !important;
}
/* Oculta Bottom Navbar nativa */
body.barcode-scanner-active nav {
  display: none !important;
}
```
**INSTRUCCIÓN REGLAMENTARIA**: Si reescribes layouts (por ejemplo si migras a Next.js o agregas contenedores div de fondo absoluto tipo envoltura Z-index), DEBES incluir las reglas `.barcode-scanner-active` en tu CSS para el nuevo div. De lo contrario, la vista en Android será totalmente blanca durante el escaneo.

---

## 🔐 5. Firebase Rules Configuration

A raíz de un bug crítico donde el agente de IA no tenía control manual sobre la consola de Firebase, se estableció que estas son las reglas MÍNIMAS VIABLES exactas que la base de datos debe mantener. 
Si el frontend o las peticiones fallan con "permissions-denied", asume que alguien alteró este patrón estricto en el servidor.

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
      allow delete: if isAdmin();
    }
    match /transactions/{id} { 
      allow read: if request.auth != null && (isAdmin() || isRegistrar() || resource.data.student_id == request.auth.uid);
      allow write: if isAdmin() || isRegistrar();
      allow delete: if isAdmin();
    }
    match /global_stats/{id} { 
      allow read: if request.auth != null; 
      allow write: if isAdmin() || isRegistrar(); 
    }
  }
}
```

---

## 📱 6. Android Capacitor Pipeline (CI/CD Local)

Dado que R3PET es React empujado a un APK, el proceso de compilación es muy propenso a errores si no se hacen los pasos en secuencia estricta.

En `package.json`, tenemos el comando "bala de plata":
`npm run android:prepare`

Este comando ejecuta tres subrutinas:
1. `vite build` (Construye `index.html` estático optimizado en la carpeta `/dist`).
2. `npx cap sync android` (Copia el contenido de `/dist` a `android/app/src/main/assets/public` e interroga dependencias nativas).
3. `node fix-gradle.cjs` (Un script especial de NodeJS para sanitizar Gradle).

### 🛠️ Parches en Capacitor (`fix-gradle.cjs`)
El plugin de scanner de Capacitor a veces inyectaba la directiva `flatDir { dirs 'libs' }` dentro de `build.gradle` en rutas deprecadas para Android Studio y Gradle 8+. Esto rompía la compilación general del APK nativo con un error en los repositorios o un "Could not find methods".
El script abre `android/capacitor-cordova-android-plugins/build.gradle` y purga cualquier rastro de `flatDir` justo antes de que abras Android Studio.

---

## 🛠️ INSTRUCCIONES FORMALES PARA LA IA:
Si entras en este proyecto de nuevo:

1. **Nunca remuevas las clases CSS de `.barcode-scanner-active`**. Son intocables.
2. Si un usuario reporta "pantalla en blanco al volver" -> Mira la sincronía (delays y unmounts) en la función `stopScanner` de `App.jsx`. Limpiar listeners crudos a hardware SIEMPRE requiere `try/catch` envolventes y limpiezas controladas.
3. Si cambias lógica de componentes (`StudentDashboard`, `AvatarEditor`, etc.), mantén las traducciones de idioma de roles intactas. No migres la base de datos de producción a roles en inglés sin coordinar limpieza.
4. Jamás modifiques `profiles` localmente sin actualizar en simultáneo la base real usando `updateDoc` de Firestore; `onSnapshot` te devolverá el cambio reactivamente.

**Fin del Dossier Técnico.**
