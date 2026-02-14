import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Users, BarChart, Clock, RefreshCw, Settings, Search,
    ChevronLeft, PlusCircle, Download, Smartphone, Trophy,
    CreditCard, Leaf, User, AlertCircle, CheckCircle, X, Mail,
    Trash2
} from 'lucide-react';
import {
    collection, query, getDocs, onSnapshot, doc,
    updateDoc, deleteDoc, setDoc, serverTimestamp
} from "firebase/firestore";
import {
    sendPasswordResetEmail,
    createUserWithEmailAndPassword as createSecondaryUser,
    signOut as signOutOfSecondary,
    createUserWithEmailAndPassword
} from "firebase/auth";
import { initializeApp as initializeSecondaryApp } from "firebase/app";
import { getAuth as getSecondaryAuth } from "firebase/auth";
import * as XLSX from 'xlsx';
import { db, auth } from './firebaseConfig';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// --- COMPONENTE: ADMIN DASHBOARD ---
export function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalKg: 0,
        totalPoints: 0,
        adminCount: 0,
        alumnoCount: 0,
        registradorCount: 0
    });

    useEffect(() => {
        const unsubStats = onSnapshot(doc(db, "global_stats", "totals"), (docSnap) => {
            if (docSnap.exists()) {
                const d = docSnap.data();
                setStats(prev => ({
                    ...prev,
                    totalPoints: d.total_points || 0,
                    totalKg: (d.total_kg || 0).toFixed(1)
                }));
            }
        });

        const unsubProfiles = onSnapshot(collection(db, "profiles"), (snapshot) => {
            let adminCount = 0;
            let alumnoCount = 0;
            let registradorCount = 0;
            snapshot.forEach((doc) => {
                const r = doc.data().role;
                if (r === 'admin') adminCount++;
                if (r === 'alumno' || r === 'student') alumnoCount++;
                if (r === 'registrador' || r === 'registrar') registradorCount++;
            });

            setStats(prev => ({
                ...prev,
                totalUsers: snapshot.size,
                adminCount,
                alumnoCount,
                registradorCount
            }));
        });

        return () => {
            unsubStats();
            unsubProfiles();
        };
    }, []);

    return (
        <div className="p-4 space-y-6">
            <header className="bg-white p-6 rounded-3xl shadow-xl shadow-green-100/50 border border-green-50 border-l-8 border-l-green-600 mb-6 animate-fade-in flex items-center gap-4">
                <div className="bg-green-600 p-3 rounded-2xl text-white shadow-lg shadow-green-100">
                    <Settings size={28} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none mb-1">Panel de Control</h2>
                    <p className="text-[10px] text-green-600 font-black uppercase tracking-[0.2em]">Administración Central</p>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div onClick={() => navigate('/app/admin/statistics')} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500 cursor-pointer active:scale-95 transition-all outline-none">
                    <p className="text-gray-500 text-xs uppercase font-bold">Total Reciclado</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalKg} kg</p>
                </div>
                <div onClick={() => navigate('/app/admin/statistics')} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 cursor-pointer active:scale-95 transition-all outline-none">
                    <p className="text-gray-500 text-xs uppercase font-bold">Puntos Generados</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalPoints}</p>
                </div>
                <div onClick={() => navigate('/app/admin/users')} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 cursor-pointer active:scale-95 transition-all outline-none">
                    <p className="text-gray-500 text-xs uppercase font-bold">Alumnos</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.alumnoCount}</p>
                </div>
                <div onClick={() => navigate('/app/admin/users')} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500 cursor-pointer active:scale-95 transition-all outline-none">
                    <p className="text-gray-500 text-xs uppercase font-bold">Registradores</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.registradorCount}</p>
                </div>
                <div onClick={() => navigate('/app/admin/users')} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-600 col-span-2 cursor-pointer active:scale-95 transition-all outline-none">
                    <p className="text-gray-500 text-xs uppercase font-bold">Administradores</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.adminCount}</p>
                </div>
            </div>

            <h3 className="font-bold text-gray-700 mb-3 ml-1">Herramientas de Gestión</h3>
            <div className="grid grid-cols-1 gap-3 pb-20">
                <Link to="/app/admin/users" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-all active:scale-95">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600"><Users size={20} /></div>
                        <div>
                            <span className="font-bold text-gray-800 block">Gestión de Usuarios</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Altas, Bajas y Edición</span>
                        </div>
                    </div>
                </Link>
                <Link to="/app/admin/statistics" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-purple-50 hover:border-purple-100 transition-all active:scale-95">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600"><BarChart size={20} /></div>
                        <div>
                            <span className="font-bold text-gray-800 block text-purple-700">Eco-Analytics Global</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Métricas e Impacto Detallado</span>
                        </div>
                    </div>
                </Link>
                <Link to="/app/admin/history" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-amber-50 hover:border-amber-100 transition-all active:scale-95">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600"><Clock size={20} /></div>
                        <div>
                            <span className="font-bold text-gray-800 block text-amber-700">Historial Global</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Transacciones y Canjes Detallados</span>
                        </div>
                    </div>
                </Link>
                <Link to="/app/admin/maintenance" className="bg-white p-4 rounded-2xl shadow-sm border border-red-50 flex items-center justify-between hover:bg-red-50 hover:border-red-100 transition-all active:scale-95">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2.5 rounded-xl text-red-600"><RefreshCw size={20} /></div>
                        <div>
                            <span className="font-bold text-gray-800 block text-red-700">Mantenimiento App</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Limpieza y Reseteo Crítico</span>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}

// --- COMPONENTE: ADMIN USER MANAGEMENT (RESTAURADO) ---
export function AdminUserManagement() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ points: 0, role: 'alumno' });
    const [roleFilter, setRoleFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const q = query(collection(db, "profiles"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(data || []);
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({ points: user.points, role: user.role });
    };

    const handleSave = async () => {
        if (!editingUser) return;
        await updateDoc(doc(db, "profiles", editingUser.id), {
            points: formData.points,
            role: formData.role
        });
        setEditingUser(null);
        fetchUsers();
    };

    const handleResetPassword = async (email) => {
        if (!email) return;
        if (!window.confirm(`¿Enviar correo de recuperación a ${email}?`)) return;
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Correo de recuperación enviado exitosamente.");
        } catch (error) {
            console.error("Error al enviar correo:", error);
            alert("Error: " + error.message);
        }
    };

    const handleDelete = async (user) => {
        const confirmDelete = window.confirm(`¿ESTÁS SEGURO?\n\nEsto eliminará a ${user.full_name} del sistema.\n\nNota: Si no podemos borrar su acceso técnico, será BLOQUEADO automáticamente.`);
        if (!confirmDelete) return;

        try {
            // 1. Intentar borrar de Firebase Auth (si tiene el pass por defecto)
            const secondaryConfig = {
                apiKey: auth.config.apiKey,
                authDomain: auth.config.authDomain,
                projectId: auth.config.projectId,
                storageBucket: auth.config.storageBucket,
                messagingSenderId: auth.config.messagingSenderId,
                appId: auth.config.appId
            };

            const sApp = initializeSecondaryApp(secondaryConfig, "DeleteSyncApp_" + user.id);
            const sAuth = getSecondaryAuth(sApp);

            try {
                // Forzamos el login de la cuenta que queremos borrar para poder ejecutar deleteUser
                const cred = await signInWithEmailAndPassword(sAuth, user.email, 'cecyte123');
                await deleteUser(cred.user);
                console.log("Auth del usuario borrado exitosamente.");
            } catch (authErr) {
                console.warn("No se pudo borrar de Auth directamente (contraseña diferente o error). Aplicando bloqueo en Firestore.");
                // Si falla, al menos el usuario no se borra de Firestore, sino que se deshabilita
                await updateDoc(doc(db, "profiles", user.id), { disabled: true });
                alert("No se pudo eliminar el acceso técnico (posiblemente cambió su contraseña).\n\nLa cuenta ha sido BLOQUEADA de la aplicación.");
                fetchUsers();
                return;
            }

            // 2. Borrar de Firestore (Solo si el paso 1 tuvo éxito o era prescindible)
            await deleteDoc(doc(db, "profiles", user.id));
            alert("Usuario eliminado completamente del sistema.");
            fetchUsers();
        } catch (error) {
            console.error("Error en proceso de borrado:", error);
            alert("Error crítico: " + error.message);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesRole = roleFilter === 'all' ||
            u.role === roleFilter ||
            (roleFilter === 'alumno' && u.role === 'student') ||
            (roleFilter === 'registrador' && u.role === 'registrar');
        const querySearch = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            u.full_name?.toLowerCase().includes(querySearch) ||
            u.email?.toLowerCase().includes(querySearch) ||
            u.matricula?.toLowerCase().includes(querySearch);
        return matchesRole && matchesSearch;
    });

    return (
        <div className="p-4">
            <header className="bg-white p-4 rounded-2xl shadow-lg border-l-8 border-l-green-600 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100"><ChevronLeft size={18} /></button>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tighter leading-none mb-0.5">Usuarios</h2>
                        <p className="text-[9px] text-green-600 font-black uppercase tracking-[0.15em]">Gestión de Cuentas</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link to="/app/admin/create" className="bg-green-600 text-white p-2.5 rounded-xl shadow-lg active:scale-95 transition-all">
                        <PlusCircle size={22} />
                    </Link>
                </div>
            </header>

            <div className="bg-white p-1.5 rounded-xl shadow-sm border flex items-center gap-2 mb-4">
                <div className="pl-2.5 text-gray-400"><Search size={18} /></div>
                <input type="text" placeholder="Nombre, email o matrícula..." className="w-full p-2 bg-transparent border-none text-sm font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                {['all', 'alumno', 'registrador', 'admin'].map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${roleFilter === r ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}>
                        {r === 'all' ? ('TODOS · ' + users.length) : (r === 'alumno' ? 'ALUMNOS' : r === 'registrador' ? 'REGISTRADORES' : 'ADMIN') + ' · ' + users.filter(u => u.role === r || (r === 'alumno' && u.role === 'student') || (r === 'registrador' && u.role === 'registrar')).length}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filteredUsers.map(user => (
                    <div key={user.id} className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm group-hover:scale-105 transition-transform flex-shrink-0 border-2 border-white">
                                    <img
                                        src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-gray-900 uppercase tracking-tighter text-sm leading-tight truncate">{user.full_name}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-600 text-white' :
                                            (user.role === 'registrador' || user.role === 'registrar') ? 'bg-amber-500 text-white' :
                                                'bg-green-600 text-white'
                                            }`}>
                                            {user.role === 'student' ? 'alumno' : user.role === 'registrar' ? 'registrador' : user.role}
                                        </span>
                                        <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-lg border border-purple-100">{user.points || 0} pts</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(user)} className={`p-2 rounded-lg shadow-md active:scale-90 transition-all ${user.role === 'admin' ? 'bg-purple-600 text-white' :
                                    (user.role === 'registrador' || user.role === 'registrar') ? 'bg-amber-500 text-white' :
                                        'bg-green-600 text-white'
                                    }`}>
                                    <Settings size={16} />
                                </button>
                                <button onClick={() => handleDelete(user)} className="p-2 bg-red-50 text-red-600 rounded-lg shadow-sm border border-red-100 active:scale-90 transition-all hover:bg-red-600 hover:text-white">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {editingUser?.id === user.id && (
                            <div className="mt-4 pt-4 border-t border-gray-100 animate-slide-up space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <label className="text-[8px] text-gray-400 font-black uppercase tracking-widest block mb-1">Puntos</label>
                                        <input
                                            type="number"
                                            value={formData.points}
                                            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                                            className="w-full bg-transparent border-none p-0 text-sm font-black focus:ring-0"
                                        />
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <label className="text-[8px] text-gray-400 font-black uppercase tracking-widest block mb-1">Rol</label>
                                        <select
                                            value={formData.role === 'student' ? 'alumno' : formData.role === 'registrar' ? 'registrador' : formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 text-sm font-black focus:ring-0"
                                        >
                                            <option value="alumno">Alumno</option>
                                            <option value="registrador">Registrador</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleResetPassword(user.email)}
                                        className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Mail size={14} /> Restaurar Contraseña
                                    </button>
                                    <div className="flex gap-2">
                                        <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-black uppercase shadow-lg shadow-green-100">Guardar</button>
                                        <button onClick={() => setEditingUser(null)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl text-xs font-black uppercase">Cerrar</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- COMPONENTE: ADMIN CREATE USER (NUEVA UBICACIÓN CON EXCEL) ---
export function AdminCreateUser() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', matricula: '', role: 'alumno' });
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [usersForExport, setUsersForExport] = useState([]); // Necesitamos cargar usuarios para exportar

    useEffect(() => {
        // Cargar usuarios al montar para tener los datos listos para exportar
        const fetchAllUsers = async () => {
            const q = query(collection(db, "profiles"));
            const snapshot = await getDocs(q);
            setUsersForExport(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchAllUsers();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if ((formData.role === 'alumno' || formData.role === 'student') && !formData.matricula) {
            setMessage({ type: 'error', text: 'La matrícula es obligatoria para alumnos.' });
            setLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            await setDoc(doc(db, "profiles", user.uid), {
                full_name: formData.fullName,
                email: formData.email,
                role: formData.role,
                matricula: formData.role === 'student' ? formData.matricula : null,
                points: 0,
                total_bottles: 0,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                created_at: serverTimestamp()
            });

            setMessage({ type: 'success', text: `¡Cuenta de ${formData.role} creada con éxito!` });
            setTimeout(() => navigate('/app/admin/users'), 2000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        try {
            const exportData = usersForExport.map(u => ({
                'Nombre Completo': u.full_name || '',
                'Correo': u.email || '',
                'Matrícula': u.matricula || '',
                'Rol (alumno, registrador, admin)': u.role === 'student' ? 'alumno' : u.role === 'registrar' ? 'registrador' : u.role,
                'Puntos': u.points || 0,
                'Contraseña (Vacío = cecyte123)': '' // Aclaración solicitada por el usuario
            }));
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Ajustar anchos de columna para que el archivo se vea ordenado
            const colWidths = [
                { wch: 25 }, // Nombre Completo
                { wch: 30 }, // Correo
                { wch: 15 }, // Matrícula
                { wch: 25 }, // Rol (ampliado para el nuevo encabezado)
                { wch: 10 }, // Puntos
                { wch: 30 }, // Contraseña
            ];
            ws['!cols'] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Usuarios");

            const fileName = `Usuarios_R3PET_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;

            if (Capacitor.isNativePlatform()) {
                // Lógica para Android/iOS Nativo
                const base64Data = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

                const saveFile = async () => {
                    try {
                        const result = await Filesystem.writeFile({
                            path: fileName,
                            data: base64Data,
                            directory: Directory.Cache // Guardamos en cache temporal para compartir
                        });

                        await Share.share({
                            title: 'Backup de Usuarios R3PET',
                            text: 'Aquí tienes el respaldo de usuarios en formato Excel.',
                            url: result.uri,
                            dialogTitle: 'Guardar o enviar Backup',
                        });
                    } catch (err) {
                        console.error("Error nativo:", err);
                        alert("Error al procesar archivo nativo: " + err.message);
                    }
                };
                saveFile();
            } else {
                // Lógica para Web estándar
                XLSX.writeFile(wb, fileName);
            }
        } catch (error) {
            console.error("Export error:", error);
            alert("Error al exportar.");
        }
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);
                if (data.length === 0) return;
                if (!window.confirm(`¿Importar ${data.length} usuarios?`)) return;

                setLoading(true);
                const secondaryConfig = {
                    apiKey: auth.config.apiKey,
                    authDomain: auth.config.authDomain,
                    projectId: auth.config.projectId,
                    storageBucket: auth.config.storageBucket,
                    messagingSenderId: auth.config.messagingSenderId,
                    appId: auth.config.appId
                };
                const sApp = initializeSecondaryApp(secondaryConfig, "SecondaryTemp");
                const sAuth = getSecondaryAuth(sApp);

                for (const row of data) {
                    // Normalización de encabezados: Convertimos todas las llaves a minúsculas y sin espacios
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.toLowerCase().replace(/\s+/g, '');
                        cleanRow[cleanKey] = row[key];
                    });

                    const email = cleanRow['correo'] || cleanRow['email'];
                    if (!email) continue;

                    // Patrones comunes para buscar campos
                    const pass = cleanRow['contraseña(vacío=cecyte123)'] || cleanRow['contraseña(soloparacreación)'] ||
                        cleanRow['contraseña'] || cleanRow['password'] || cleanRow['pass'] || 'cecyte123';

                    const fullName = cleanRow['nombrecompleto'] || cleanRow['fullname'] || cleanRow['nombre'] || 'Usuario';

                    // Normalización del ROL importado
                    let rawRole = (cleanRow['rol(alumno,registrador,admin)'] || cleanRow['rol'] || cleanRow['role'] || 'alumno').toString().toLowerCase().trim();
                    let role = 'alumno';
                    if (rawRole.includes('admin')) role = 'admin';
                    else if (rawRole.includes('registra')) role = 'registrador';
                    else if (rawRole.includes('alum') || rawRole.includes('stud')) role = 'alumno';

                    try {
                        const cred = await createSecondaryUser(sAuth, email, pass);
                        await setDoc(doc(db, "profiles", cred.user.uid), {
                            full_name: fullName,
                            email: email,
                            role: role,
                            matricula: cleanRow['matrícula'] || cleanRow['matricula'] || cleanRow['id'] || null,
                            points: parseInt(cleanRow['puntos'] || cleanRow['points'] || 0),
                            total_bottles: 0,
                            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cred.user.uid}`,
                            created_at: serverTimestamp()
                        });
                        await signOutOfSecondary(sAuth);
                    } catch (err) { console.error("Error importando fila:", email, err); }
                }
                alert("Importación masiva finalizada.");
                navigate('/app/admin/users');
            } catch (error) { alert("Error al procesar archivo."); }
            finally { setLoading(false); e.target.value = ''; }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className={`p-6 border-b-4 animate-fade-in transition-all duration-500 ${formData.role === 'admin' ? 'bg-purple-600 border-purple-700 shadow-purple-100' :
                formData.role === 'registrar' ? 'bg-amber-500 border-amber-600 shadow-amber-100' :
                    'bg-green-600 border-green-700 shadow-green-100'
                } shadow-xl flex items-center gap-4 sticky top-0 z-40`}>
                <button onClick={() => navigate(-1)} className="bg-white/20 p-2.5 rounded-xl text-white hover:bg-white/30 transition-all active:scale-95 shadow-sm">
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight leading-none mb-1">Nueva Cuenta</h2>
                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest">Panel de Administración</p>
                </div>
            </header>

            <div className="p-4 max-w-md mx-auto animate-slide-up">
                {message && (
                    <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 animate-bounce-in border shadow-sm ${message.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'
                        }`}>
                        {message.type === 'error' ? <X size={20} /> : <CheckCircle size={20} />}
                        <p className="text-xs font-bold uppercase tracking-tight">{message.text}</p>
                    </div>
                )}

                <form onSubmit={handleCreate} className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 space-y-5">
                    <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                        {['student', 'registrar', 'admin'].map((role) => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => setFormData({ ...formData, role })}
                                className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all ${formData.role === role
                                    ? (role === 'admin' ? 'bg-purple-600 text-white shadow-lg' : role === 'registrar' ? 'bg-amber-500 text-white shadow-lg' : 'bg-green-600 text-white shadow-lg')
                                    : 'text-gray-400'
                                    }`}
                            >
                                {role === 'student' ? 'Alumno' : role === 'registrar' ? 'Registro' : 'Admin'}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4 pt-2 text-blue-600">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-700 focus:bg-white focus:border-gray-200 transition-all outline-none shadow-inner"
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>

                        {formData.role === 'student' && (
                            <div className="animate-fade-in">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Matrícula Escolar</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={formData.matricula}
                                        onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                                        className="w-full p-4 pl-12 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-700 focus:bg-white focus:border-gray-200 transition-all outline-none shadow-inner"
                                        placeholder="Número de control"
                                    />
                                    <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-700 focus:bg-white focus:border-gray-200 transition-all outline-none shadow-inner"
                                placeholder="usuario@escuela.edu"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-700 focus:bg-white focus:border-gray-200 transition-all outline-none shadow-inner"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all mt-4 disabled:opacity-50 flex items-center justify-center gap-2 ${formData.role === 'admin' ? 'bg-purple-600 shadow-purple-100' :
                            formData.role === 'registrar' ? 'bg-amber-500 shadow-amber-100' :
                                'bg-green-600 shadow-green-100'
                            }`}
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <PlusCircle size={18} />
                                Crear Cuenta
                            </>
                        )}
                    </button>
                </form>

                {/* --- SECCIÓN EXCEL (MOVIDA AQUÍ) --- */}
                <div className="mt-8 bg-white p-6 rounded-3xl border border-dashed border-gray-200 shadow-sm animate-fade-in">
                    <p className="text-center text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mb-4">Herramientas Masivas • Excel</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleExportExcel}
                            className="bg-gray-50 border border-gray-100 text-blue-600 p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-blue-50"
                        >
                            <Download size={24} />
                            <span className="text-[8px] font-black uppercase">Exportar Backup</span>
                        </button>

                        <label className="bg-gray-50 border border-gray-100 text-indigo-600 p-4 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-all hover:bg-indigo-50 cursor-pointer">
                            <Smartphone size={24} />
                            <span className="text-[8px] font-black uppercase">Importar Usuarios</span>
                            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />
                        </label>
                    </div>
                    {loading && <p className="text-center text-[9px] font-bold text-green-600 mt-4 animate-pulse uppercase tracking-widest">Sincronizando base de datos...</p>}
                </div>

                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-8">
                    R3PET Management System • Professional Edition
                </p>
            </div>
        </div>
    );
}
