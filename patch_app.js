import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const importLine = "import { AdminDashboard, AdminUserManagement } from './AdminComponents';\n";

if (!content.includes(importLine)) {
    // Insertar después de la primera línea (import React...)
    const lines = content.split('\n');
    lines.splice(1, 0, importLine);
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Import de AdminComponents insertado con éxito.");
} else {
    console.log("El import ya existe.");
}
