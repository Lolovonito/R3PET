import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Regex para encontrar y eliminar las funciones (basado en el inicio y fin observado)
// AdminDashboard
const adminDashboardStart = "// 4. ADMIN VISTAS\nfunction AdminDashboard()";
const adminDashboardEnd = "    );\n}";

// AdminUserManagement
const adminUserManagementStart = "function AdminUserManagement() {";
const adminUserManagementEnd = "    );\n}";

// Nota: Eliminar bloques completos es arriesgado con regex si hay anidación.
// Intentaremos una aproximación por líneas para ser más precisos.

const lines = content.split('\n');
const resultLines = [];
let skipping = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detectar inicio de AdminDashboard
    if (line.includes("// 4. ADMIN VISTAS") && lines[i + 1]?.includes("function AdminDashboard()")) {
        skipping = true;
        console.log(`Eliminado AdminDashboard iniciando en línea ${i + 1}`);
    }

    // Detectar inicio de AdminUserManagement (sin el comentario prev)
    if (!skipping && line.trim() === "function AdminUserManagement() {") {
        skipping = true;
        console.log(`Eliminado AdminUserManagement iniciando en línea ${i + 1}`);
    }

    if (!skipping) {
        resultLines.push(line);
    } else {
        // Detectar fin de función (la última llave de cierre antes de la siguiente función o espacio)
        // En este archivo, las funciones terminan en "    );" y luego "}"
        if (line.trim() === "}") {
            // Verificamos si la línea anterior era el cierre del return
            if (lines[i - 1]?.trim() === ");" || lines[i - 1]?.trim() === "    );") {
                skipping = false;
                console.log(`Fin de eliminación en línea ${i + 1}`);
            }
        }
    }
}

fs.writeFileSync(filePath, resultLines.join('\n'), 'utf8');
console.log("Limpieza completada.");
