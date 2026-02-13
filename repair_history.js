
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Eliminar el bloque de resolución manual
const startMarker = '// Resolver nombres de registradores';
const endMarker = 'setRegistrarNames(nameMap);';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    // Buscamos el final del bloque (la llave de cierre del if)
    const afterEnd = content.indexOf('}', endIndex);
    const fullEnd = content.indexOf('}', afterEnd + 1); // La segunda llave es la del catch

    // Mejor buscamos por el catch directamente
    const catchIndex = content.indexOf('} catch (err) {', endIndex);

    if (catchIndex !== -1) {
        const newContent = content.substring(0, startIndex) + content.substring(catchIndex);
        fs.writeFileSync(filePath, newContent);
        console.log('Reparación exitosa: Bloque eliminado.');
    } else {
        console.log('No se encontró el catch para delimitar el bloque.');
    }
} else {
    console.log('No se encontraron los marcadores de inicio/fin.');
}
