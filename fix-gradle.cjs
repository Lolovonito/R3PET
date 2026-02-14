const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'android', 'capacitor-cordova-android-plugins', 'build.gradle');

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Regex más agresivo para capturar cualquier bloque de repositories que tenga flatDir
    const flatDirPattern = /repositories\s*\{[^}]*?flatDir\s*\{[^}]*?\}[^}]*?\}/g;

    if (flatDirPattern.test(content)) {
        console.log('Detectado flatDir en plugins. Limpiando...');
        content = content.replace(flatDirPattern, `repositories {
    google()
    mavenCentral()
}`);
        fs.writeFileSync(filePath, content);
        console.log('Archivo build.gradle de plugins limpiado con éxito.');
        console.log('Nuevo contenido del bloque repositories verificado.');
    } else {
        console.log('No se detectó flatDir con el patrón nuevo. Intentando reemplazo directo de líneas...');
        // Intento secundario: buscar la palabra flatDir y borrar su bloque
        if (content.includes('flatDir')) {
            content = content.replace(/flatDir\s*\{[\s\S]*?\}/g, "");
            fs.writeFileSync(filePath, content);
            console.log('Limpieza manual de flatDir realizada.');
        }
    }
} else {
    console.log('No se encontró el archivo build.gradle de plugins.');
}
