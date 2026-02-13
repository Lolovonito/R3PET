import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { Leaf, Award, QrCode, User, Home, PlusCircle, Users, BarChart3, Settings, LogOut, CheckCircle2, Smartphone, Download, Coffee, ShoppingBag, Clock, Search, Trophy, Shield, CreditCard, ChevronLeft, ChevronRight, X, ArrowUp, Crown, TrendingUp, Filter, RefreshCw, BarChart, Package, AlertCircle } from 'lucide-react';
import { auth, db, storage } from './firebaseConfig';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "firebase/auth";
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    increment,
    runTransaction,
    serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { App as CapacitorApp } from '@capacitor/app';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5QrcodeScanner } from "html5-qrcode";

// --- Global Components ---
function HistoryHeader({ title, onBack }) {
    const navigate = useNavigate();
    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center gap-4 animate-fade-in">
            <button
                onClick={onBack || (() => navigate(-1))}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 active:scale-90"
            >
                <ChevronLeft size={24} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 truncate">{title}</h2>
        </header>
    );
}

// --- Update Checker Mock Component ---
function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        const checkVersion = async () => {
            setTimeout(() => {
                if (Math.random() > 0.8) setUpdateAvailable(true);
            }, 5000);
        };
        checkVersion();
    }, []);

    if (!updateAvailable) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white p-3 shadow-lg animate-bounce-in">
            <div className="max-w-md mx-auto flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Download size={18} />
                    <span className="text-xs font-bold">Nueva versión disponible</span>
                </div>
                <button className="bg-white text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">
                    Actualizar APK
                </button>
            </div>
        </div>
    );
}


// --- Components by Role ---

// 1. LOGIN SCREEN (Online Version)
function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [matricula, setMatricula] = useState('');
    const [fullName, setFullName] = useState('');
    const [mode, setMode] = useState('login');
    const [message, setMessage] = useState(null);
    const [savedAccounts, setSavedAccounts] = useState([]);
    const [fastLoginEmail, setFastLoginEmail] = useState(null);
    const [manualLogin, setManualLogin] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    const startIdScanner = async () => {
        try {
            const status = await BarcodeScanner.checkPermissions();
            if (status.camera !== 'granted') {
                const request = await BarcodeScanner.requestPermissions();
                if (request.camera !== 'granted') {
                    alert('Se requiere permiso de cámara para escanear.');
                    return;
                }
            }

            await BarcodeScanner.removeAllListeners();
            document.body.classList.add('barcode-scanner-active');
            setIsScanning(true);

            await BarcodeScanner.addListener('barcodeScanned', async (result) => {
                const decodedText = result.barcode.displayValue;
                if (decodedText && decodedText.trim()) {
                    setMatricula(decodedText.toUpperCase().trim());
                    await stopIdScanner();
                }
            });

            await BarcodeScanner.startScan({
                formats: [
                    BarcodeFormat.QrCode,
                    BarcodeFormat.Code128,
                    BarcodeFormat.Code39,
                    BarcodeFormat.Code93,
                    BarcodeFormat.Codabar,
                    BarcodeFormat.Ean13,
                    BarcodeFormat.Ean8,
                    BarcodeFormat.Itf,
                    BarcodeFormat.UpcA,
                    BarcodeFormat.UpcE,
                    BarcodeFormat.Pdf417,
                    BarcodeFormat.Aztec,
                    BarcodeFormat.DataMatrix
                ],
                lensFacing: 'back',
                enableTorchToggle: true,
                enableZoom: false,
                enableVibration: true
            });
        } catch (err) {
            console.error('Error al iniciar scanner de ID:', err);
            if (err.message?.includes('already started')) {
                try {
                    await BarcodeScanner.stopScan();
                    await startIdScanner();
                } catch (retryErr) {
                    console.error('Error al reiniciar scanner:', retryErr);
                    await stopIdScanner();
                }
            } else {
                await stopIdScanner();
            }
        }
    };

    const stopIdScanner = async () => {
        document.body.classList.remove('barcode-scanner-active');
        setIsScanning(false);
        try {
            await BarcodeScanner.stopScan();
            await BarcodeScanner.removeAllListeners();
        } catch (e) {
            console.error('Error al detener scanner:', e);
        }
    };

    useEffect(() => {
        // Limpiar rastro de escáner por si acaso
        document.body.classList.remove('barcode-scanner-active');

        const accounts = JSON.parse(localStorage.getItem('r3pet_saved_sessions') || '[]');
        setSavedAccounts(accounts);
    }, []);

    const saveSession = async (session, profileData) => {
        const accounts = JSON.parse(localStorage.getItem('r3pet_saved_sessions') || '[]');
        const newAccount = {
            email: session.user.email,
            id: session.user.id,
            full_name: profileData.full_name,
            role: profileData.role,
            avatar_url: profileData.avatar_url,
            session: session,
            timestamp: Date.now()
        };

        const filtered = accounts.filter(a => a.email !== newAccount.email);
        const updated = [newAccount, ...filtered].slice(0, 5); // Guardar máximo 5
        localStorage.setItem('r3pet_saved_sessions', JSON.stringify(updated));
        setSavedAccounts(updated);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (mode === 'signup') {
                if (!matricula || matricula.length < 5) throw new Error('Ingresa una matrícula válida.');
                if (!fullName || fullName.length < 3) throw new Error('Ingresa tu nombre completo.');

                // 1. Crear usuario en Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 2. Crear perfil en Firestore
                await setDoc(doc(db, "profiles", user.uid), {
                    full_name: fullName,
                    role: 'student',
                    matricula: matricula.toUpperCase(),
                    points: 0,
                    total_bottles: 0,
                    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                    created_at: serverTimestamp()
                });

                setMessage({ type: 'success', text: '¡Registro exitoso! Ya puedes iniciar sesión.' });
                setMode('login');
            } else {
                const finalEmail = fastLoginEmail || email;
                const userCredential = await signInWithEmailAndPassword(auth, finalEmail, password);
                const user = userCredential.user;

                // 3. Obtener perfil
                const docSnap = await getDoc(doc(db, "profiles", user.uid));
                if (docSnap.exists()) {
                    const profileData = docSnap.data();
                    saveSession({ user, profile: profileData }, profileData);
                } else {
                    throw new Error('No se encontró el perfil de usuario.');
                }
            }
        } catch (error) {
            console.error('Error de Auth:', error);
            let errMsg = 'Error en la operación.';
            if (error.code === 'auth/email-already-in-use') errMsg = 'El correo ya está registrado.';
            if (error.code === 'auth/wrong-password') errMsg = 'Contraseña incorrecta.';
            if (error.code === 'auth/user-not-found') errMsg = 'Usuario no encontrado.';
            setMessage({ type: 'error', text: error.message || errMsg });
        } finally {
            setLoading(false);
            setFastLoginEmail(null);
        }
    };

    const handleFastLogin = async (account) => {
        const now = Date.now();
        const diffHours = (now - account.timestamp) / (1000 * 60 * 60);

        if (diffHours < 24) {
            setLoading(true);
            try {
                // En Firebase Auth, el estado persiste automáticamente. 
                // Si el usuario sigue autenticado en 'auth', simplemente entramos.
                if (auth.currentUser && auth.currentUser.email === account.email) {
                    const docSnap = await getDoc(doc(db, "profiles", auth.currentUser.uid));
                    if (docSnap.exists()) {
                        saveSession({ user: auth.currentUser, profile: docSnap.data() }, docSnap.data());
                    }
                } else {
                    // Si no hay sesión activa, forzamos contraseña
                    setFastLoginEmail(account.email);
                    setEmail(account.email);
                    setMode('login');
                }
            } catch (error) {
                setFastLoginEmail(account.email);
                setEmail(account.email);
                setMode('login');
            } finally {
                setLoading(false);
            }
        } else {
            setFastLoginEmail(account.email);
            setEmail(account.email);
            setMode('login');
        }
    };

    const removeAccount = (e, emailToRemove) => {
        e.stopPropagation();
        const updated = savedAccounts.filter(a => a.email !== emailToRemove);
        localStorage.setItem('r3pet_saved_sessions', JSON.stringify(updated));
        setSavedAccounts(updated);
    };

    return (
        <div className={`min-h-screen flex flex-col justify-center items-center p-4 relative ${isScanning ? 'bg-transparent' : 'bg-gray-100'}`}>
            <div className={`w-full max-w-md flex flex-col items-center transition-opacity duration-300 ${isScanning ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <header className="mb-10 text-center flex flex-col items-center animate-fade-in pointer-events-none">
                    <div className="bg-gradient-to-br from-green-500 to-green-700 p-5 rounded-[2.5rem] text-white shadow-2xl shadow-green-200 mb-6 transform hover:rotate-6 transition-transform duration-500">
                        <Leaf size={56} className="filter drop-shadow-md" />
                    </div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-[ -0.05em] leading-none mb-2">
                        R3<span className="text-green-600">PET</span> Online
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="h-px w-8 bg-green-200"></div>
                        <p className="text-[11px] text-green-700 font-black uppercase tracking-[0.4em]">Reciclaje Inteligente</p>
                        <div className="h-px w-8 bg-green-200"></div>
                    </div>
                </header>

                <div className={`bg-white p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4 transition-opacity duration-300 ${isScanning ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {mode === 'login' && !fastLoginEmail && savedAccounts.length > 0 && !manualLogin ? (
                        <div className="animate-fade-in mb-6">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-3 text-center">Cuentas Recientes</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {savedAccounts.map((account) => (
                                    <div
                                        key={account.id}
                                        onClick={() => handleFastLogin(account)}
                                        className="flex items-center justify-between p-3 bg-gray-50 hover:bg-green-50 rounded-xl border border-transparent hover:border-green-200 cursor-pointer transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            {account.avatar_url ? (
                                                <img src={account.avatar_url} className="w-10 h-10 rounded-full border shadow-sm" alt="avatar" />
                                            ) : (
                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                                    <User size={20} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 leading-tight">{account.full_name}</p>
                                                <p className="text-[10px] text-gray-400">{account.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => removeAccount(e, account.email)}
                                            className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        if (confirm('¿Limpiar historial de cuentas?')) {
                                            setSavedAccounts([]);
                                            localStorage.removeItem('r3pet_saved_sessions');
                                        }
                                    }}
                                    className="w-full py-2 text-[10px] text-gray-400 hover:text-gray-600 uppercase font-bold"
                                >
                                    Limpiar lista
                                </button>
                            </div>
                            <div className="flex items-center gap-2 my-4">
                                <div className="flex-1 h-[1px] bg-gray-100"></div>
                                <span className="text-[10px] text-gray-300 font-bold uppercase">ó</span>
                                <div className="flex-1 h-[1px] bg-gray-100"></div>
                            </div>
                            <div className="text-center">
                                <button
                                    onClick={() => setManualLogin(true)}
                                    className="text-sm text-green-600 font-bold hover:underline"
                                >
                                    Usar otra cuenta
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {savedAccounts.length > 0 && !fastLoginEmail && mode === 'login' && (
                                <button
                                    onClick={() => setManualLogin(false)}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-600 transition-colors mb-2"
                                >
                                    <ChevronLeft size={14} /> Regresar a mis cuentas
                                </button>
                            )}
                            <h2 className="text-center font-bold text-gray-700 mb-4">
                                {fastLoginEmail ? `Hola, ${savedAccounts.find(a => a.email === fastLoginEmail)?.full_name}` : (mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}
                            </h2>

                            {message && (
                                <div className={`p-3 rounded text-sm text-center ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {message.text}
                                </div>
                            )}

                            <form onSubmit={handleAuth} className="space-y-3">
                                {mode === 'signup' && (
                                    <div className="animate-fade-in space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Completo</label>
                                            <input
                                                type="text"
                                                required
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none capitalize"
                                                placeholder="Ej. Juan Pérez"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Matrícula Escolar</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    required
                                                    value={matricula}
                                                    onChange={(e) => setMatricula(e.target.value)}
                                                    className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none uppercase"
                                                    placeholder="Ej. 20240980"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={startIdScanner}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Escanear credencial"
                                                >
                                                    <QrCode size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!fastLoginEmail && (
                                    <div className="animate-fade-in">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Correo Escolar</label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                                            placeholder="alumno@ejemplo.edu"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <button
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex justify-center"
                                >
                                    {loading ? 'Procesando...' : (mode === 'login' ? 'Entrar' : 'Registrarse')}
                                </button>

                                {fastLoginEmail && (
                                    <button
                                        type="button"
                                        onClick={() => { setFastLoginEmail(null); setEmail(''); }}
                                        className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 font-bold"
                                    >
                                        Usar otra cuenta
                                    </button>
                                )}
                            </form>

                            <div className="text-center pt-2">
                                <button
                                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); setFastLoginEmail(null); }}
                                    className="text-sm text-green-600 font-bold hover:underline"
                                >
                                    {mode === 'login' ? '¿No tienes cuenta? Registrate' : '¿Ya tienes cuenta? Inicia Sesión'}
                                </button>
                            </div>
                        </>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-center text-gray-400">
                        <p>Soporte Técnico: v1.1.0 Online</p>
                    </div>
                </div>
            </div>

            {/* UI de Escaneo Nativo (Consistente con Registrar) */}
            {isScanning && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-auto bg-black/40">
                    <div className="w-72 h-72 border-2 border-white/30 rounded-[40px] flex items-center justify-center relative shadow-[0_0_0_100vmax_rgba(0,0,0,0.8)]">
                        <div className="absolute inset-0 border-4 border-green-500/50 rounded-[40px] animate-pulse"></div>
                        <div className="absolute left-6 right-6 h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-scan-line"></div>

                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/20 shadow-2xl min-w-max text-center">
                            <p className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Escanear Credencial</p>
                            <p className="text-[8px] text-green-400 font-bold uppercase tracking-widest mt-0.5">Soporta QR y Barras</p>
                        </div>
                    </div>

                    <button
                        onClick={stopIdScanner}
                        className="mt-20 bg-white text-gray-900 px-12 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl active:scale-90 transition-all flex items-center gap-3"
                    >
                        <X size={18} /> Cancelar Escaneo
                    </button>
                </div>
            )}
        </div>
    );
}

// 2. STUDENT VISTAS
function StudentDashboard() {
    const { points, lifetimePoints, totalCaps, userId, fullName } = useOutletContext();
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!userId) return;
            const q = query(
                collection(db, "transactions"),
                where("student_id", "==", userId),
                orderBy("timestamp", "desc"),
                limit(5)
            );

            const unsub = onSnapshot(q, (snapshot) => {
                const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTransactions(txs);
            });
            return () => unsub();
        };
        fetchHistory();
    }, [userId]);

    return (
        <div className="p-4 space-y-6">
            <header className="bg-white p-6 rounded-3xl shadow-xl shadow-green-100/50 border border-green-50 border-l-8 border-l-green-600 flex justify-between items-start animate-fade-in">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-1">Hola, {fullName?.split(' ')[0] || 'Alumno'}</h2>
                    <p className="text-xs font-black text-green-700 bg-green-100/50 px-2 py-1 rounded-lg inline-block uppercase tracking-wider">Eco Dashboard</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-700 text-white px-4 py-2 rounded-2xl text-lg font-black shadow-lg shadow-green-200 active:scale-95 transition-all flex flex-col items-end leading-none">
                    <span>{points}</span>
                    <span className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-1">Puntos</span>
                </div>
            </header>
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Leaf size={120} />
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Tu Impacto Ambiental</p>
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-white/10">
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black">{lifetimePoints || 0}</span>
                                <span className="text-[10px] font-bold opacity-70">BOTs</span>
                            </div>
                            <p className="text-[8px] font-black uppercase opacity-50 tracking-widest">Botellas</p>
                        </div>
                        <div className="border-l border-white/20 pl-4">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black">{totalCaps || 0}</span>
                                <span className="text-[10px] font-bold opacity-70">TAPs</span>
                            </div>
                            <p className="text-[8px] font-black uppercase opacity-50 tracking-widest">Tapitas</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black">{((lifetimePoints || 0) * 0.05).toFixed(1)}</span>
                                <span className="text-xs font-bold opacity-80">kg PET</span>
                            </div>
                            <p className="text-[10px] font-medium opacity-70">Peso Evidenciado</p>
                        </div>
                        <div className="border-l border-white/20 pl-4">
                            <div className="flex items-baseline gap-1 text-emerald-100">
                                <span className="text-3xl font-black">{((lifetimePoints || 0) * 0.075).toFixed(2)}</span>
                                <span className="text-xs font-bold opacity-80">kg CO₂</span>
                            </div>
                            <p className="text-[10px] font-medium opacity-70 italic underline decoration-white/30 underline-offset-4">CO₂ Offset</p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Progreso de Impacto</p>
                    <div className="w-32 h-2 bg-black/20 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${Math.min((lifetimePoints || 0) / 10, 100)}%` }}></div>
                    </div>
                </div>
            </div>
            <div>
                <h3 className="font-bold text-gray-800 mb-3">Tus Movimientos Recientes</h3>
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">Aún no tienes movimientos.</p>
                    ) : (
                        transactions.map(tx => (
                            <div key={tx.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <Leaf size={16} className={tx.amount > 0 ? "text-green-500" : "text-orange-500"} />
                                    <span className="text-sm font-medium">{tx.description || 'Movimiento'}</span>
                                </div>
                                <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// 2. REWARDS SCREEN (Updated for QR Validation)
function RewardsScreen() {
    const { points, userId, fetchPoints } = useOutletContext();
    const [notification, setNotification] = useState(null);
    const [pendingRedemption, setPendingRedemption] = useState(null);

    const rewards = [
        { id: 1, name: "Desayuno Escolar", cost: 250, icon: Coffee, color: "text-orange-500", bg: "bg-orange-100" },
        { id: 2, name: "Botella Reusable", cost: 500, icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-100" },
        { id: 3, name: "Hora Servicio Social", cost: 100, icon: Clock, color: "text-purple-500", bg: "bg-purple-100" },
    ];

    const handleRedeemClick = (reward) => {
        if (points >= reward.cost) {
            // El formato será: CANJE|studentId|costo|nombrePremio|timestamp
            const qrData = `CANJE|${userId}|${reward.cost}|${reward.name}|${Date.now()}`;
            setPendingRedemption({ ...reward, qrData });
        } else {
            setNotification({ type: 'error', message: `Te faltan ${reward.cost - points} puntos.` });
            setTimeout(() => setNotification(null), 3000);
        }
    };

    if (pendingRedemption) {
        return (
            <div className="p-4 flex flex-col items-center justify-center space-y-6 h-full min-h-[70vh]">
                <h2 className="text-2xl font-bold text-gray-800 text-center">Validación de Canje</h2>
                <p className="text-gray-500 text-center">Muestra este código al registrador para completar tu canje de:</p>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center w-full">
                    <p className="font-bold text-orange-800 text-lg">{pendingRedemption.name}</p>
                    <p className="text-orange-600 font-bold">{pendingRedemption.cost} Puntos</p>
                </div>

                <div className="p-6 bg-white rounded-2xl shadow-xl border-4 border-orange-500">
                    <QRCodeCanvas value={pendingRedemption.qrData} size={220} />
                </div>

                <button
                    onClick={() => { setPendingRedemption(null); fetchPoints(); }}
                    className="w-full py-4 bg-gray-100 text-gray-600 rounded-xl font-bold border border-gray-200"
                >
                    Cerrar y verificar puntos
                </button>
                <p className="text-[10px] text-gray-400 text-center uppercase">Los puntos solo se descontarán cuando el código sea escaneado</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 left-4 right-4 p-4 rounded-xl shadow-2xl z-50 text-white font-bold text-center animate-bounce-in ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {notification.message}
                </div>
            )}

            <header className="bg-white p-6 rounded-3xl shadow-xl shadow-indigo-100/50 border border-indigo-50 border-l-8 border-l-green-500 mb-8 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Premios</h2>
                    <div className="bg-green-600 text-white px-4 py-2 rounded-2xl text-sm font-black shadow-lg shadow-green-100">
                        {points} <span className="text-[10px] opacity-80 ml-1 italic">PTS</span>
                    </div>
                </div>
                <p className="text-sm text-gray-500 font-bold">Intercambia tu esfuerzo ecológico</p>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {rewards.map(reward => (
                    <div key={reward.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`${reward.bg} p-3 rounded-full ${reward.color}`}>
                                <reward.icon size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{reward.name}</h3>
                                <p className="text-xs text-gray-500">Stock disponible</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleRedeemClick(reward)}
                            disabled={points < reward.cost}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${points >= reward.cost
                                ? 'bg-primary text-white hover:bg-primary-dark shadow-md active:scale-95'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {reward.cost} pts
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-2">¿Cómo funciona?</h3>
                <p className="text-xs text-blue-600">Al presionar el premio, se generará un código QR. Deberás mostrarlo en la cafetería. Ellos lo escanearán y en ese momento se descontarán tus puntos automáticamente.</p>
            </div>
        </div>
    );
}



// 3. REGISTRAR VISTAS
function RegistrarScanner() {
    const { userId } = useOutletContext();
    const [search, setSearch] = useState('');
    const [amount, setAmount] = useState('');
    const [amountCaps, setAmountCaps] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanMode, setScanMode] = useState('bottles'); // 'bottles' o 'canje'
    const [isProcessingScan, setIsProcessingScan] = useState(false);
    const [isProcessingRegister, setIsProcessingRegister] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Bloqueo global de la UI
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [torchAvailable, setTorchAvailable] = useState(false);
    const [useWebScanner, setUseWebScanner] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            // Si no hay búsqueda, mostramos los 20 más recientes por ahora
            const q = query(
                collection(db, "profiles"),
                where("role", "==", "student"),
                limit(20)
            );

            const snapshot = await getDocs(q);
            let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (search.length > 0) {
                results = results.filter(p =>
                    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                    p.matricula?.toLowerCase().includes(search.toLowerCase())
                );
            }
            setStudents(results);
        };
        fetchStudents();
    }, [search]);

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            if (isScanning) {
                stopScanner();
            }
        };
    }, [isScanning]);

    const startScanner = async (mode = 'bottles') => {
        setScanMode(mode);
        setIsProcessingScan(false);

        try {
            const status = await BarcodeScanner.checkPermissions();
            if (status.camera !== 'granted') {
                const request = await BarcodeScanner.requestPermissions();
                if (request.camera !== 'granted') {
                    alert('Se requiere permiso de cámara para escanear.');
                    return;
                }
            }

            await BarcodeScanner.removeAllListeners();
            document.body.classList.add('barcode-scanner-active');
            setIsScanning(true);

            let processingLock = false;

            await BarcodeScanner.addListener('barcodeScanned', async (result) => {
                if (processingLock) return;
                processingLock = true;

                const decodedText = result.barcode?.displayValue || '';

                if (mode === 'bottles') {
                    const cleanText = decodedText.trim();
                    let studentDoc = null;
                    try {
                        const directDoc = await getDoc(doc(db, "profiles", cleanText));
                        if (directDoc.exists()) {
                            studentDoc = { id: directDoc.id, ...directDoc.data() };
                        } else {
                            const q = query(collection(db, "profiles"), where("matricula", "==", cleanText.toUpperCase()));
                            const querySnapshot = await getDocs(q);
                            if (!querySnapshot.empty) {
                                const d = querySnapshot.docs[0];
                                studentDoc = { id: d.id, ...d.data() };
                            }
                        }
                    } catch (e) {
                        console.error("Error buscando alumno:", e);
                    }

                    if (studentDoc) {
                        setSelectedStudent(studentDoc);
                        setSearch(studentDoc.full_name);
                        await stopScanner();
                    } else {
                        await stopScanner();
                        setMessage({ type: 'error', text: 'Alumno no encontrado (QR/Código inválido).' });
                        setTimeout(() => setMessage(null), 4000);
                    }
                } else if (mode === 'canje') {
                    if (decodedText.startsWith('CANJE|')) {
                        const parts = decodedText.split('|');
                        await processRedemption(parts[1], parseInt(parts[2]), parts[3]);
                        await stopScanner();
                    } else {
                        await stopScanner();
                        setMessage({ type: 'error', text: 'Error: Este no es un código de canje válido.' });
                        setTimeout(() => setMessage(null), 4000);
                    }
                }
                processingLock = false;
            });

            await BarcodeScanner.startScan({
                formats: [
                    BarcodeFormat.QrCode,
                    BarcodeFormat.Code128,
                    BarcodeFormat.Code39,
                    BarcodeFormat.Code93,
                    BarcodeFormat.Codabar,
                    BarcodeFormat.Ean13,
                    BarcodeFormat.Ean8,
                    BarcodeFormat.Itf,
                    BarcodeFormat.UpcA,
                    BarcodeFormat.UpcE,
                    BarcodeFormat.Pdf417,
                    BarcodeFormat.Aztec,
                    BarcodeFormat.DataMatrix
                ],
                lensFacing: 'back',
                enableTorchToggle: true,
                enableZoom: false,
                enableVibration: true
            });

        } catch (err) {
            console.error('Error al iniciar scanner:', err);

            // Si MLKit falla, intentar fallback a scanner web
            if (err.message?.includes('already started')) {
                try {
                    await BarcodeScanner.stopScan();
                    await startScanner(mode);
                } catch (retryErr) {
                    console.error('Error al reiniciar scanner:', retryErr);
                    setUseWebScanner(true);
                    startWebScanner(mode);
                }
            } else {
                setUseWebScanner(true);
                startWebScanner(mode);
            }
        }
    };

    const stopScanner = async () => {
        try {
            document.body.classList.remove('barcode-scanner-active');
            setIsScanning(false);
            setIsProcessingScan(false);
            setIsTorchOn(false);

            try {
                await BarcodeScanner.stopScan();
            } catch (e) {
                console.warn('Scanner ya estaba detenido:', e.message);
            }

            try {
                await BarcodeScanner.removeAllListeners();
            } catch (e) {
                console.warn('Error removiendo listeners:', e.message);
            }
        } catch (err) {
            console.error('Error general al detener scanner:', err);
        }
    };

    const toggleTorch = async () => {
        try {
            const newState = !isTorchOn;
            await BarcodeScanner.setTorchEnabled({ enabled: newState });
            setIsTorchOn(newState);
        } catch (e) {
            console.error('Error linterna:', e);
        }
    };

    const startWebScanner = (mode = 'bottles') => {
        setScanMode(mode);
        setIsScanning(true);
        setIsProcessingScan(false);

        const scannerElement = document.createElement('div');
        scannerElement.id = 'html5-scanner';
        scannerElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            background: white;
        `;
        document.body.appendChild(scannerElement);

        const scanner = new Html5QrcodeScanner(
            'html5-scanner',
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [0, 1] // QR_CODE and BARCODE
            },
            false
        );

        scanner.render(
            async (decodedText) => {
                try {
                    const cleanText = decodedText.trim().replace(/[\n\r\t]/g, '');

                    if (mode === 'bottles') {
                        let data = null;
                        const docSnap = await getDoc(doc(db, "profiles", cleanText));
                        if (docSnap.exists()) {
                            data = { id: docSnap.id, ...docSnap.data() };
                        } else {
                            // Buscar por matrícula
                            const q = query(
                                collection(db, "profiles"),
                                where("matricula", "==", cleanText.toUpperCase()),
                                limit(1)
                            );
                            const querySnapshot = await getDocs(q);
                            if (!querySnapshot.empty) {
                                data = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                            }
                        }

                        if (data) {
                            setSelectedStudent(data);
                            setSearch(data.full_name);
                        } else {
                            setMessage({ type: 'error', text: 'Alumno no encontrado.' });
                            setTimeout(() => setMessage(null), 4000);
                        }
                    } else if (mode === 'canje' && cleanText.startsWith('CANJE|')) {
                        const parts = cleanText.split('|');
                        await processRedemption(parts[1], parseInt(parts[2]), parts[3]);
                    }

                    scanner.clear();
                    document.body.removeChild(scannerElement);
                    setIsScanning(false);
                    setUseWebScanner(false);
                } catch (err) {
                    console.error('Error procesando scan:', err);
                    setMessage({ type: 'error', text: 'Error procesando código' });
                }
            },
            (error) => {
                console.warn('Scanner error:', error);
            }
        );
    };

    const processRedemption = async (sId, cost, name) => {
        // Evitar procesamiento múltiple
        if (loading || isSubmitting) {
            console.log('Canje ignorado: ya procesando');
            return;
        }

        setLoading(true);
        setIsSubmitting(true);
        console.log('Iniciando procesamiento de canje...');

        try {
            const studentRef = doc(db, "profiles", sId);
            const transactionRef = collection(db, "transactions");

            await runTransaction(db, async (transaction) => {
                const sDoc = await transaction.get(studentRef);
                if (!sDoc.exists()) throw new Error("Alumno no existe");

                const currentPoints = sDoc.data().points || 0;
                if (currentPoints < cost) {
                    throw new Error('Error: El alumno ya no tiene puntos suficientes.');
                }

                // 1. Actualizar perfil
                transaction.update(studentRef, {
                    points: increment(-cost)
                });

                // 2. Registrar transacción
                const newTransRef = doc(transactionRef);
                transaction.set(newTransRef, {
                    student_id: sId,
                    student_name: sDoc.data().full_name,
                    performer_id: userId,
                    points: -cost,
                    type: 'canje',
                    description: `Canje Validado: ${name}`,
                    timestamp: serverTimestamp()
                });

                // 3. Actualizar Estadísticas Globales
                const statsRef = doc(db, "global_stats", "totals");
                transaction.set(statsRef, {
                    total_points: increment(-cost),
                    last_update: serverTimestamp()
                }, { merge: true });
            });

            console.log('Canje procesado exitosamente');
            setMessage({ type: 'success', text: `¡Canje VALIDADO! -${cost} pts por ${name}` });
        } catch (err) {
            console.error('Error en processRedemption:', err);
            alert('Error al procesar canje: ' + err.message);
        } finally {
            setLoading(false);
            setIsSubmitting(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleRegister = async () => {
        if (isProcessingRegister || isSubmitting || loading) return;

        const bottles = parseFloat(amount) || 0;
        const caps = parseFloat(amountCaps) || 0;

        if (!selectedStudent || (bottles <= 0 && caps <= 0)) {
            alert('Selecciona un alumno y una cantidad válida (botellas o tapitas).');
            return;
        }

        setIsProcessingRegister(true);
        setLoading(true);
        setIsSubmitting(true);

        try {
            const pts = (bottles * 10) + (caps * 3);
            const studentRef = doc(db, "profiles", selectedStudent.id);
            const transactionRef = collection(db, "transactions");

            await runTransaction(db, async (transaction) => {
                const sDoc = await transaction.get(studentRef);
                if (!sDoc.exists()) throw new Error("Alumno no existe");

                // 1. Actualizar perfil
                transaction.update(studentRef, {
                    points: increment(pts),
                    total_bottles: increment(bottles),
                    total_caps: increment(caps),
                    lifetime_points: increment(pts)
                });

                // 2. Registrar transacción
                const newTransRef = doc(transactionRef);
                const desc = `Registro: ${bottles} botellas${caps > 0 ? `, ${caps} tapitas` : ''}`;
                transaction.set(newTransRef, {
                    student_id: selectedStudent.id,
                    student_name: selectedStudent.full_name,
                    performer_id: auth.currentUser?.uid,
                    points: pts,
                    bottles: bottles,
                    caps: caps,
                    type: 'registro',
                    description: desc,
                    timestamp: serverTimestamp()
                });

                // 3. Actualizar Estadísticas Globales (Agregador NoSQL)
                const statsRef = doc(db, "global_stats", "totals");
                transaction.set(statsRef, {
                    total_points: increment(pts),
                    total_bottles: increment(bottles),
                    total_caps: increment(caps),
                    total_kg: increment(bottles * 0.05),
                    last_update: serverTimestamp()
                }, { merge: true });
            });

            setMessage({ type: 'success', text: `¡Éxito! +${pts} pts a ${selectedStudent.full_name}` });
            setAmount('');
            setAmountCaps('');
            setSearch('');
            setSelectedStudent(null);
        } catch (err) {
            console.error('Error en handleRegister:', err);
            setMessage({ type: 'error', text: `Error de Registro (${err.code || 'CODE_UNKNOWN'}): ${err.message}` });
        } finally {
            setLoading(false);
            setIsSubmitting(false);
            setIsProcessingRegister(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <>

            <div className={`p-4 h-full flex flex-col space-y-6 overflow-y-auto ${isScanning ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <header className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 border-l-8 border-l-indigo-600 mb-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-100">
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">Escáner</h2>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em] mt-1">Bio-Registro</p>
                        </div>
                    </div>
                </header>

                {message && (
                    <div className={`p-4 rounded-xl text-sm font-bold text-center animate-bounce-in shadow-sm ${message.type === 'success' ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* Botones estilo Tarjeta (Rediseño) */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => startScanner('bottles')}
                        disabled={isSubmitting}
                        className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl shadow-lg flex flex-col items-center justify-center gap-3 text-white transition-all active:scale-95 hover:shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="bg-white/20 p-3 rounded-2xl">
                            <Smartphone size={32} />
                        </div>
                        <span className="font-bold text-sm">Asignar Puntos</span>
                    </button>

                    <button
                        onClick={() => startScanner('canje')}
                        disabled={isSubmitting}
                        className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-3xl shadow-lg flex flex-col items-center justify-center gap-3 text-white transition-all active:scale-95 hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="bg-white/20 p-3 rounded-2xl">
                            <Award size={32} />
                        </div>
                        <span className="font-bold text-sm">Validar Canje</span>
                    </button>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <User size={18} className="text-indigo-500" />
                        {selectedStudent ? 'Seleccionado Manualmente' : 'Registro Manual'}
                    </h3>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o matrícula..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                if (selectedStudent) setSelectedStudent(null);
                            }}
                            className="w-full p-4 border-2 border-gray-50 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        {/* Buscador de alumnos (Manual) */}
                        {students.length > 0 && !selectedStudent && (
                            <div className="absolute top-full left-0 right-0 bg-white border rounded-2xl mt-2 shadow-2xl z-50 max-h-60 overflow-y-auto border-gray-100">
                                {students.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            setSelectedStudent(s);
                                            setSearch(s.full_name);
                                            setStudents([]);
                                        }}
                                        className="w-full p-4 text-left hover:bg-indigo-50 border-b last:border-0 border-gray-50 transition-colors"
                                    >
                                        <p className="font-bold text-sm text-gray-800">{s.full_name}</p>
                                        <p className="text-xs text-gray-500">{s.matricula}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Botellas (10 pts)</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full p-4 border-2 border-indigo-50 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none text-xl font-bold text-center text-indigo-600 shadow-inner"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Tapitas (3 pts)</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={amountCaps}
                                onChange={(e) => setAmountCaps(e.target.value)}
                                className="w-full p-4 border-2 border-indigo-50 rounded-2xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none text-xl font-bold text-center text-indigo-600 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 mt-2 animate-pulse-slow">
                        <p className="text-center font-black text-indigo-600 text-sm tracking-tight">
                            VALOR ESTIMADO: + {(amount ? parseFloat(amount) * 10 : 0) + (amountCaps ? parseFloat(amountCaps) * 3 : 0)} PUNTOS
                        </p>
                    </div>

                    <button
                        onClick={handleRegister}
                        disabled={loading || !selectedStudent}
                        className={`w-full py-5 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${selectedStudent
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                            }`}
                    >
                        {loading ? 'Procesando...' : 'Confirmar Registro'}
                    </button>
                </div>
            </div>

            {/* UI de Escaneo Nativo (Visor Panorámico para Barras Largas) */}
            {isScanning && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-auto bg-black/40">
                    {/* Marco Rectangular optimizado para Credenciales y Barras */}
                    <div className="w-[85vw] h-56 border-2 border-white/40 rounded-3xl flex items-center justify-center relative shadow-[0_0_0_100vmax_rgba(0,0,0,0.85)]">
                        <div className="absolute inset-0 border-4 border-indigo-500/40 rounded-3xl animate-pulse"></div>

                        {/* Línea de escaneo estilizada */}
                        <div className="absolute left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] animate-scan-line"></div>

                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/20 shadow-2xl min-w-[300px] text-center">
                            <p className="text-white text-xs font-black uppercase tracking-widest leading-none mb-1">
                                {scanMode === 'canje' ? 'Escanear QR de Canje' : 'Modo: Credencial / Matrícula'}
                            </p>
                            <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">
                                El código debe cruzar la línea roja
                            </p>
                        </div>

                        {/* Esquinas Reforzadas */}
                        <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-indigo-400 rounded-tl-2xl"></div>
                        <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-indigo-400 rounded-tr-2xl"></div>
                        <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-indigo-400 rounded-bl-2xl"></div>
                        <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-indigo-400 rounded-br-2xl"></div>
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-6">
                        {torchAvailable && (
                            <button
                                onClick={toggleTorch}
                                className={`p-5 rounded-full backdrop-blur-xl border border-white/20 shadow-2xl transition-all active:scale-95 ${isTorchOn ? 'bg-yellow-400 text-black border-yellow-500' : 'bg-white/10 text-white'}`}
                            >
                                <Smartphone size={28} className={isTorchOn ? 'animate-pulse' : ''} />
                                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">
                                    {isTorchOn ? 'Flash Encendido' : 'Activar Flash'}
                                </span>
                            </button>
                        )}

                        <button
                            onClick={stopScanner}
                            className="bg-white text-gray-900 px-12 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(255,255,255,0.2)] active:scale-90 transition-all flex items-center gap-3"
                        >
                            <X size={20} /> Salir del Escáner
                        </button>
                    </div>

                    <div className="mt-8 text-white/40 font-black text-[8px] uppercase tracking-[0.4em] animate-fade-in">
                        SOPORTE AVANZADO SEP • QR • BARCODE
                    </div>
                </div>
            )}
        </>
    )
}

function RegistrarUsersList() {
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "profiles"), where("role", "==", "student"));
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(data);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching students:', error);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filtered = students.filter(s =>
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.matricula?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 border-l-8 border-l-green-600 mb-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-1">
                    <div className="bg-green-600 p-2.5 rounded-2xl text-white shadow-lg shadow-green-100">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">Alumnado</h2>
                        <p className="text-[10px] text-green-600 font-black uppercase tracking-[0.2em] mt-1">Comunidad R3PET</p>
                    </div>
                </div>
            </header>

            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-2 group focus-within:border-green-300 transition-all">
                <div className="pl-3 text-gray-400 group-focus-within:text-green-500 transition-colors">
                    <Search size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Buscar por nombre o matrícula..."
                    className="w-full p-3 bg-transparent border-none focus:ring-0 text-sm font-medium"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-10 text-gray-400">Cargando alumnos...</div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-dashed text-center text-gray-400">
                        No se encontraron alumnos.
                    </div>
                ) : (
                    filtered.map(s => (
                        <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 overflow-hidden">
                                {s.avatar_url ? (
                                    <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} />
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{s.full_name}</p>
                                <p className="text-sm text-gray-500">{s.matricula}</p>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                        {s.points || 0} pts
                                    </span>
                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                                        Histórico: {s.lifetime_points || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function ProfileScreen() {
    const { userId, onLogout } = useOutletContext();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (userId) {
            fetchProfile();
        }
    }, [userId]);

    const fetchProfile = async () => {
        const docSnap = await getDoc(doc(db, "profiles", userId));
        if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() });
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            alert('La imagen debe pesar menos de 3MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten imágenes');
            return;
        }

        setUploading(true);
        try {
            // Nota: En Firebase Storage no es estrictamente necesario borrar el anterior 
            // si usamos el mismo path, pero generaremos un nombre único.
            const fileExt = file.name.split('.').pop();
            const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;
            const storageRef = ref(storage, fileName);

            // Subir archivo
            await uploadBytes(storageRef, file);

            // Obtener URL
            const publicUrl = await getDownloadURL(storageRef);

            // Actualizar perfil en Firestore
            await updateDoc(doc(db, "profiles", userId), {
                avatar_url: publicUrl
            });

        } catch (error) {
            console.error('Error al subir imagen:', error);
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <header className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 border-l-8 border-l-green-600 mb-6 flex items-center gap-6 animate-fade-in relative overflow-hidden">
                <div className="relative flex-shrink-0">
                    {profile?.avatar_url ? (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                            <img
                                src={profile.avatar_url}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 border-2 border-green-100 shadow-inner">
                            <User size={32} />
                        </div>
                    )}
                    <label className="absolute -bottom-2 -right-2 bg-green-600 text-white p-2 rounded-xl cursor-pointer hover:bg-green-700 shadow-lg border-2 border-white active:scale-95 transition-all" title="Cambiar foto">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                        {uploading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : '📷'}
                    </label>
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter leading-none mb-1">{profile?.full_name || 'Cargando...'}</h2>
                    <p className="text-xs font-bold text-gray-400 lowercase truncate max-w-[180px]">{profile?.email}</p>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-black bg-green-600 text-white px-2 py-0.5 rounded-md uppercase tracking-widest">Mi Perfil</span>
                        <span className="text-[10px] font-black bg-gray-100 text-gray-400 px-2 py-0.5 rounded-md uppercase tracking-widest">v1.2.0</span>
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border divide-y">
                <div className="p-4 flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Matrícula</span>
                    <span className="text-gray-900 font-bold">{profile?.matricula || '---'}</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Rol</span>
                    <span className="text-gray-900 font-bold capitalize">{profile?.role}</span>
                </div>
                {profile?.role === 'student' && (
                    <div className="p-4 flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Puntos Actuales</span>
                        <span className="text-green-600 font-bold">{profile?.points}</span>
                    </div>
                )}
            </div>

            {profile?.role === 'student' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-4">
                    <h3 className="font-bold text-gray-800">Mi Pase de Reciclaje</h3>
                    <div className="p-4 bg-gray-50 rounded-xl border-4 border-primary shadow-inner">
                        <QRCodeCanvas value={userId || ''} size={180} />
                    </div>
                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">Escanea para entregar botellas</p>
                </div>
            )}

            <div className="space-y-3">
                <h3 className="font-bold text-gray-700">Historial</h3>
                {profile?.role === 'student' ? (
                    <>
                        <Link to="/app/profile/points-history" className="w-full bg-white border p-4 rounded-lg flex items-center justify-between hover:bg-gray-50 transition">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                                    <Leaf size={20} />
                                </div>
                                <span className="font-medium text-gray-800">Historial de Puntos</span>
                            </div>
                            <span className="text-gray-400">→</span>
                        </Link>
                        <Link to="/app/profile/redemptions-history" className="w-full bg-white border p-4 rounded-lg flex items-center justify-between hover:bg-gray-50 transition">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                    <Award size={20} />
                                </div>
                                <span className="font-medium text-gray-800">Historial de Canjes</span>
                            </div>
                            <span className="text-gray-400">→</span>
                        </Link>
                    </>
                ) : profile?.role === 'registrar' ? (
                    <Link to="/app/profile/work-history" className="w-full bg-white border p-4 rounded-lg flex items-center justify-between hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <QrCode size={20} />
                            </div>
                            <span className="font-medium text-gray-800">Historial de Registros</span>
                        </div>
                        <span className="text-gray-400">→</span>
                    </Link>
                ) : null}

                {profile?.role === 'admin' && (
                    <>
                        <Link to="/app/admin/statistics" className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-2 rounded-lg text-purple-600 group-hover:scale-110 transition-transform">
                                    <BarChart size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">Eco-Analytics Global</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Estadísticas y Rendimiento</p>
                                </div>
                            </div>
                            <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                        <Link to="/app/admin/history" className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-amber-50 hover:border-amber-200 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">Historial Global</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Todas las Transacciones</p>
                                </div>
                            </div>
                            <span className="text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    </>
                )}
            </div>

            <button
                onClick={onLogout}
                className="w-full bg-red-50 text-red-600 py-3 rounded-lg font-bold border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 transition"
            >
                <LogOut size={18} />
                Cerrar Sesión
            </button>

            <div className="text-center text-xs text-gray-300 mt-8">
                ID: {userId}
            </div>
        </div>
    );
}

function PointsHistory() {
    const { userId } = useOutletContext();
    const [transactions, setTransactions] = useState([]);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (userId) {
            const q = query(
                collection(db, "transactions"),
                where("student_id", "==", userId),
                orderBy("timestamp", "desc")
            );

            const unsub = onSnapshot(q, (snapshot) => {
                const txs = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        created_at: doc.data().timestamp?.toDate() || new Date()
                    }))
                    .filter(tx => tx.points > 0);
                setTransactions(txs);
            }, (err) => {
                console.error("PointsHistory Error:", err);
            });
            return () => unsub();
        }
    }, [userId]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative">
            <HistoryHeader title="Historial de Puntos" to="/app/profile" />
            <div className="p-4 space-y-4">
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">No has ganado puntos aún.</p>
                    ) : (
                        transactions.map(tx => (
                            <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 p-2 rounded-lg text-green-600">
                                        <Leaf size={18} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-gray-800 text-sm">{tx.description || 'Puntos ganados'}</p>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                            Registrado por: <span className="font-bold text-gray-700">
                                                {tx.performer?.full_name || tx.registar_by || 'Sistema'}
                                            </span>
                                            • {new Date(tx.created_at).toLocaleDateString('es-MX')}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-green-600 font-black text-lg">+{tx.points}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Botón flotante Volver Arriba */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-24 right-6 p-4 bg-white text-green-600 rounded-full shadow-2xl border border-green-50 z-40 transition-all duration-300 active:scale-90 flex items-center justify-center ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
            >
                <ArrowUp size={24} />
            </button>
        </div>
    );
}

function RedemptionsHistory() {
    const { userId } = useOutletContext();
    const [transactions, setTransactions] = useState([]);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (userId) {
            const q = query(
                collection(db, "transactions"),
                where("student_id", "==", userId),
                orderBy("timestamp", "desc")
            );

            const unsub = onSnapshot(q, (snapshot) => {
                const txs = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        created_at: doc.data().timestamp?.toDate() || new Date()
                    }))
                    .filter(tx => tx.points < 0);
                setTransactions(txs);
            }, (err) => {
                console.error("RedemptionsHistory Error:", err);
            });
            return () => unsub();
        }
    }, [userId]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative">
            <HistoryHeader title="Historial de Canjes" to="/app/profile" />
            <div className="p-4 space-y-4">
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">No has canjeado premios aún.</p>
                    ) : (
                        transactions.map(tx => (
                            <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                        <Award size={18} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-gray-800 text-sm">{tx.description || 'Premio canjeado'}</p>
                                        <p className="text-[10px] text-gray-500">
                                            Validado por: <span className="font-bold text-gray-700">
                                                {tx.performer?.full_name || tx.registar_by || 'Personal Autorizado'}
                                            </span>
                                            <span className="mx-1">•</span>
                                            {new Date(tx.created_at).toLocaleDateString('es-MX')}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-orange-600 font-black text-lg">{tx.points}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Botón flotante Volver Arriba */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-24 right-6 p-4 bg-white text-orange-600 rounded-full shadow-2xl border border-orange-50 z-40 transition-all duration-300 active:scale-90 flex items-center justify-center ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
            >
                <ArrowUp size={24} />
            </button>
        </div>
    );
}

function RegistrarWorkHistory() {
    const { userId } = useOutletContext();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [filterType, setFilterType] = useState('all'); // 'all', 'points', 'redemptions'
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        fetchWorkHistory();
    }, []);

    const fetchWorkHistory = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "transactions"),
                where("performer_id", "==", userId),
                orderBy("timestamp", "desc")
            );

            const unsub = onSnapshot(q, (snapshot) => {
                const txs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    created_at: doc.data().timestamp?.toDate() || new Date()
                }));
                setTransactions(txs);
                setLoading(false);
            }, (err) => {
                console.error('Error fetching work history:', err);
                setLoading(false);
            });

            return () => unsub();
        } catch (err) {
            console.error('Error fetching work history:', err);
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = !search ||
            tx.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            tx.profiles?.matricula?.toLowerCase().includes(search.toLowerCase());

        const matchesDate = (!dateRange.start || new Date(tx.created_at) >= new Date(dateRange.start)) &&
            (!dateRange.end || new Date(tx.created_at) <= new Date(dateRange.end));

        const matchesType = filterType === 'all' ||
            (filterType === 'points' && tx.points > 0) ||
            (filterType === 'redemptions' && tx.points < 0);

        return matchesSearch && matchesDate && matchesType;
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative">
            <HistoryHeader title="Mis Registros" to="/app/profile" />
            <div className="p-4 space-y-4">

                {/* Estadísticas */}
                {!loading && filteredTransactions.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-xl text-white shadow-lg">
                        <h3 className="font-bold mb-3 text-center">Resumen de Actividad</h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold">{filteredTransactions.length}</p>
                                <p className="text-xs opacity-80">Registros</p>
                            </div>
                            <div>
                                <p className="text-xl font-bold">
                                    {filteredTransactions.reduce((sum, tx) => tx.amount > 0 ? sum + tx.amount : sum, 0)}
                                </p>
                                <p className="text-xs opacity-80">Pts Asignados</p>
                            </div>
                            <div>
                                <p className="text-xl font-bold">
                                    {Math.abs(filteredTransactions.reduce((sum, tx) => tx.amount < 0 ? sum + tx.amount : sum, 0))}
                                </p>
                                <p className="text-xs opacity-80">Pts Canjeados</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filtros */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-3 text-sm">Filtrar por tipo</h3>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`py-2 px-3 rounded-lg font-medium text-xs transition-all ${filterType === 'all'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            📊 Todos
                        </button>
                        <button
                            onClick={() => setFilterType('points')}
                            className={`py-2 px-3 rounded-lg font-medium text-xs transition-all ${filterType === 'points'
                                ? 'bg-green-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            🌿 Puntos
                        </button>
                        <button
                            onClick={() => setFilterType('redemptions')}
                            className={`py-2 px-3 rounded-lg font-medium text-xs transition-all ${filterType === 'redemptions'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            🏆 Canjes
                        </button>
                    </div>
                </div>

                {/* Filtros de búsqueda */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar alumno o matrícula..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="px-2 py-2 border rounded-lg bg-gray-50 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="px-2 py-2 border rounded-lg bg-gray-50 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Lista de transacciones */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Cargando historial...</div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl border border-dashed text-center text-gray-400">
                            No hay registros con los filtros aplicados.
                        </div>
                    ) : (
                        filteredTransactions.map(tx => (
                            <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {tx.amount > 0 ? <Leaf size={18} /> : <Award size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{tx.student_name || 'Alumno'}</p>
                                            <p className="text-[10px] text-gray-500">{tx.student_id?.substring(0, 8) || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <span className={`font-black text-sm ${tx.points > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                        {tx.points > 0 ? '+' : ''}{tx.points}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                    <p className="text-[10px] text-gray-500 italic">{tx.description || (tx.points > 0 ? 'Botellas entregadas' : 'Canje realizado')}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {new Date(tx.created_at).toLocaleDateString('es-MX')} • {new Date(tx.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Botón flotante Volver Arriba */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-24 right-6 p-4 bg-white text-blue-600 rounded-full shadow-2xl border border-blue-50 z-40 transition-all duration-300 active:scale-90 flex items-center justify-center ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
            >
                <ArrowUp size={24} />
            </button>
        </div>
    );
}

function RankingScreen() {
    const [topAlumnos, setTopAlumnos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        console.log("RankingScreen: Iniciando carga de datos Firestore...");
        const q = query(
            collection(db, "profiles"),
            where("role", "==", "student"),
            orderBy("lifetime_points", "desc")
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const ranking = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                lifetime_points: doc.data().lifetime_points || 0
            }));
            setTopAlumnos(ranking);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-medium italic">Cargando clasificación ambiental...</p>
        </div>
    );

    const podium = topAlumnos.slice(0, 3);
    const rest = topAlumnos.slice(3);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 relative">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 pt-12 pb-20 px-4 rounded-b-[40px] shadow-lg relative overflow-hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-8 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all z-30 active:scale-90"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="relative z-10 text-center space-y-2">
                    <Trophy className="mx-auto text-yellow-300 drop-shadow-lg" size={48} />
                    <h1 className="text-2xl font-black text-white">Ranking Escolar</h1>
                    <p className="text-green-100 text-sm font-medium">Top Alumnos con Impacto Ambiental</p>
                </div>
            </div>

            <div className="px-4 -mt-12 space-y-6 relative z-20">
                {/* Podio (Top 3) */}
                <div className="flex justify-center items-end gap-2 mb-8 relative z-10">
                    {podium.length > 1 && (
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full border-4 border-gray-300 overflow-hidden shadow-lg mb-2 relative bg-gray-200">
                                {podium[1].avatar_url ? (
                                    <img src={podium[1].avatar_url} alt={podium[1].full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={`https://ui-avatars.com/api/?name=${podium[1].full_name}&background=random`} alt={podium[1].full_name} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="bg-gray-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-md -mt-4 z-20 mb-1">2</div>
                            <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl text-center shadow-sm w-24">
                                <p className="font-bold text-gray-800 text-xs truncate w-full">{podium[1].full_name.split(' ')[0]}</p>
                                <p className="text-gray-500 text-[10px] font-bold">{podium[1].lifetime_points} pts</p>
                            </div>
                        </div>
                    )}

                    {podium.length > 0 && (
                        <div className="flex flex-col items-center -mb-4 z-20">
                            <div className="relative flex flex-col items-center">
                                <Crown size={32} className="text-yellow-400 mb-1 animate-bounce-in" style={{ animationDelay: '0.2s' }} />
                                <div className="w-28 h-28 rounded-full border-4 border-yellow-400 overflow-hidden shadow-xl relative bg-yellow-100">
                                    {podium[0].avatar_url ? (
                                        <img src={podium[0].avatar_url} alt={podium[0].full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={`https://ui-avatars.com/api/?name=${podium[0].full_name}&background=random`} alt={podium[0].full_name} className="w-full h-full object-cover" />
                                    )}
                                </div>
                            </div>
                            <div className="-mt-4  bg-gradient-to-r from-yellow-400 to-orange-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white shadow-lg z-20 mb-2">1</div>
                            <div className="bg-white/90 backdrop-blur-sm p-4 pt-4 rounded-2xl text-center shadow-lg w-36 border-2 border-yellow-100 flex flex-col justify-center">
                                <p className="font-bold text-gray-800 text-sm truncate w-full mb-1">{podium[0].full_name.split(' ')[0]}</p>
                                <p className="text-orange-500 font-extrabold text-xs truncate w-full px-1">{podium[0].lifetime_points} pts</p>
                            </div>
                        </div>
                    )}

                    {podium.length > 2 && (
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full border-4 border-orange-300 overflow-hidden shadow-lg mb-2 relative bg-orange-100">
                                {podium[2].avatar_url ? (
                                    <img src={podium[2].avatar_url} alt={podium[2].full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={`https://ui-avatars.com/api/?name=${podium[2].full_name}&background=random`} alt={podium[2].full_name} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-md -mt-4 z-20 mb-1">3</div>
                            <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl text-center shadow-sm w-24">
                                <p className="font-bold text-gray-800 text-xs truncate w-full">{podium[2].full_name.split(' ')[0]}</p>
                                <p className="text-gray-500 text-[10px] font-bold">{podium[2].lifetime_points} pts</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lista Restante */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Posición y Alumno</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Puntos Totales</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {rest.map((alumno, index) => (
                            <div key={alumno.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-black text-gray-300 w-6 italic">#{index + 4}</span>
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-green-50 aspect-square">
                                        {alumno.avatar_url ? (
                                            <img src={alumno.avatar_url} alt={alumno.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={`https://ui-avatars.com/api/?name=${alumno.full_name}&background=random`} alt={alumno.full_name} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 line-clamp-1 w-40">{alumno.full_name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{alumno.matricula || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-green-600 underline decoration-green-200 underline-offset-4">{alumno.lifetime_points}</p>
                                    <p className="text-[9px] text-green-400 font-bold">Puntos PET</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Botón flotante Volver Arriba */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-24 right-6 p-4 bg-white text-green-600 rounded-full shadow-2xl border border-green-50 z-40 transition-all duration-300 active:scale-90 flex items-center justify-center ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
            >
                <ArrowUp size={24} />
            </button>
        </div>
    );
}


// 4. ADMIN VISTAS
function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalKg: 0,
        totalPoints: 0,
        adminCount: 0,
        studentCount: 0,
        registrarCount: 0
    });

    useEffect(() => {
        // Suscripción al agregador global (Eficiente para números grandes)
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

        // Conteo de usuarios (Sigue siendo snapshot por ahora, pero más ligero)
        const unsubProfiles = onSnapshot(collection(db, "profiles"), (snapshot) => {
            let adminCount = 0;
            let studentCount = 0;
            let registrarCount = 0;
            snapshot.forEach((doc) => {
                const r = doc.data().role;
                if (r === 'admin') adminCount++;
                if (r === 'student') studentCount++;
                if (r === 'registrar') registrarCount++;
            });

            setStats(prev => ({
                ...prev,
                totalUsers: snapshot.size,
                adminCount,
                studentCount,
                registrarCount
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
                <div
                    onDoubleClick={() => navigate('/app/admin/statistics')}
                    className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500 cursor-pointer active:scale-95 transition-all outline-none"
                    title="Doble clic para ver estadísticas"
                >
                    <p className="text-gray-500 text-xs uppercase font-bold">Total Reciclado</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalKg} kg</p>
                </div>
                <div
                    onDoubleClick={() => navigate('/app/admin/statistics')}
                    className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 cursor-pointer active:scale-95 transition-all outline-none"
                    title="Doble clic para ver estadísticas"
                >
                    <p className="text-gray-500 text-xs uppercase font-bold">Puntos Generados</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalPoints}</p>
                </div>
                <div
                    onDoubleClick={() => navigate('/app/admin/users')}
                    className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 cursor-pointer active:scale-95 transition-all outline-none"
                    title="Doble clic para gestionar alumnos"
                >
                    <p className="text-gray-500 text-xs uppercase font-bold">Alumnos</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.studentCount}</p>
                </div>
                <div
                    onDoubleClick={() => navigate('/app/admin/users')}
                    className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500 cursor-pointer active:scale-95 transition-all outline-none"
                    title="Doble clic para gestionar registradores"
                >
                    <p className="text-gray-500 text-xs uppercase font-bold">Registradores</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.registrarCount}</p>
                </div>
                <div
                    onDoubleClick={() => navigate('/app/admin/users')}
                    className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-600 col-span-2 cursor-pointer active:scale-95 transition-all outline-none"
                    title="Doble clic para gestionar administradores"
                >
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
            </div>
        </div>
    );
}

function AdminStatistics() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        studentCount: 0,
        registrarCount: 0,
        adminCount: 0,
        totalPointsCreated: 0,
        totalPointsRedeemed: 0,
        totalKgRecycled: 0,
        totalCo2Saved: 0,
        totalTransactions: 0,
        totalCaps: 0,
        avgPointsPerStudent: 0,
        weeklyData: [],
        impactDistribution: []
    });
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('metrics'); // 'metrics' or 'visual'

    useEffect(() => {
        // Suscripción a perfiles para conteos de usuarios
        const unsubProfiles = onSnapshot(collection(db, "profiles"), (snapshot) => {
            let sCount = 0;
            let rCount = 0;
            let aCount = 0;
            snapshot.forEach(doc => {
                const r = doc.data().role;
                if (r === 'student') sCount++;
                if (r === 'registrar') rCount++;
                if (r === 'admin') aCount++;
            });
            setStats(prev => ({
                ...prev,
                totalUsers: snapshot.size,
                studentCount: sCount,
                registrarCount: rCount,
                adminCount: aCount,
                avgPointsPerStudent: sCount > 0 ? (prev.totalPointsCreated / sCount).toFixed(0) : 0
            }));
        });

        // Suscripción a transacciones para métricas acumuladas
        const unsubTrans = onSnapshot(collection(db, "transactions"), (snapshot) => {
            let ptsCreated = 0;
            let ptsRedeemed = 0;
            let totalKg = 0;
            let totalCaps = 0;
            snapshot.forEach(doc => {
                const tx = doc.data();
                if (tx.points > 0) ptsCreated += tx.points;
                if (tx.points < 0) ptsRedeemed += Math.abs(tx.points);
                if (tx.bottles) totalKg += tx.bottles * 0.05;
                if (tx.caps) totalCaps += tx.caps;
            });

            setStats(prev => ({
                ...prev,
                totalPointsCreated: ptsCreated,
                totalPointsRedeemed: ptsRedeemed,
                totalKgRecycled: totalKg.toFixed(1),
                totalCo2Saved: (totalKg * 1.5).toFixed(1),
                totalTransactions: snapshot.size,
                totalCaps: totalCaps,
                avgPointsPerStudent: prev.studentCount > 0 ? (ptsCreated / prev.studentCount).toFixed(0) : 0
            }));
            setLoading(false);
        }, (err) => {
            console.error("AdminStatistics Trans Error:", err);
            setLoading(false);
        });

        return () => {
            unsubProfiles();
            unsubTrans();
        };
    }, []);

    useEffect(() => {
        // Simular fin de carga inicial una vez que los datos lleguen por primera vez
        if (stats.totalTransactions > 0 || stats.totalUsers > 0) {
            setLoading(false);
        }
    }, [stats.totalTransactions, stats.totalUsers]);

    // Componentes de Gráficas Artesanales (SVG)
    const EcoBarChart = ({ data }) => {
        const maxVal = Math.max(...data.map(d => Math.max(d.earned, d.redeemed)), 10);

        return (
            <div className="space-y-4">
                <div className="w-full h-48 flex items-end justify-between gap-3 px-2">
                    {data.map((d, i) => {
                        const earnedHeight = (d.earned / maxVal) * 100;
                        const redeemedHeight = (d.redeemed / maxVal) * 100;

                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                                {/* Tooltip Combinado */}
                                <div className="absolute -top-12 bg-gray-900/95 backdrop-blur text-white text-[7px] font-bold px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20 whitespace-nowrap shadow-xl border border-white/10 pointer-events-none">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        <span>+{d.earned} pts</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                        <span>-{d.redeemed} pts</span>
                                    </div>
                                </div>

                                {/* Contenedor de Barras Dobles */}
                                <div className="w-full flex items-end gap-1 h-full max-h-[140px]">
                                    <div
                                        className="flex-1 bg-gradient-to-t from-green-600 to-emerald-400 rounded-t-sm shadow-md transition-all duration-700 hover:brightness-110"
                                        style={{ height: `${earnedHeight}%`, minHeight: d.earned > 0 ? '2px' : '0' }}
                                    ></div>
                                    <div
                                        className="flex-1 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-sm shadow-md transition-all duration-700 hover:brightness-110"
                                        style={{ height: `${redeemedHeight}%`, minHeight: d.redeemed > 0 ? '2px' : '0' }}
                                    ></div>
                                </div>

                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">
                                    {new Date(d.date).toLocaleDateString('es-MX', { weekday: 'short' })}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Leyenda */}
                <div className="flex justify-center gap-6 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Generados</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm"></div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Canjeados</span>
                    </div>
                </div>
            </div>
        );
    };

    const EcoPieChart = ({ data }) => {
        const total = data.reduce((sum, d) => sum + d.value, 0);
        let currentAngle = 0;

        return (
            <div className="flex flex-col items-center gap-6 py-4">
                <div className="flex items-center justify-around w-full">
                    <div className="relative group/pie">
                        <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90 drop-shadow-xl">
                            {total > 0 ? data.map((d, i) => {
                                const angle = (d.value / total) * 360;
                                const x1 = 50 + 42 * Math.cos((currentAngle * Math.PI) / 180);
                                const y1 = 50 + 42 * Math.sin((currentAngle * Math.PI) / 180);
                                const x2 = 50 + 42 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                                const y2 = 50 + 42 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
                                const largeArc = angle > 180 ? 1 : 0;
                                const path = `M 50 50 L ${x1} ${y1} A 42 42 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                currentAngle += angle;
                                return (
                                    <path
                                        key={i}
                                        d={path}
                                        fill={d.color}
                                        className="transition-all duration-500 hover:opacity-90 hover:scale-105 origin-center cursor-pointer"
                                    >
                                        <title>{`${d.label}: ${d.value} pts`}</title>
                                    </path>
                                );
                            }) : (
                                <circle cx="50" cy="50" r="40" fill="#f3f4f6" />
                            )}
                            <circle cx="50" cy="50" r="28" fill="white" className="shadow-inner" />
                        </svg>

                        {/* Indicador Central */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-[10px] font-black text-gray-900 leading-none">TOTAL</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Impacto</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {data.map((d, i) => (
                            <div key={i} className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-xl border border-transparent hover:border-gray-100 transition-all">
                                <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-tighter leading-none mb-1">{d.label}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs font-black text-gray-700">{d.value.toLocaleString()}</span>
                                        <span className="text-[8px] font-bold text-gray-400">pts</span>
                                        <span className="ml-2 text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">
                                            {total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full bg-green-50/50 p-3 rounded-2xl border border-green-100/50">
                    <p className="text-[9px] text-green-700 font-medium leading-relaxed italic text-center">
                        <span className="font-bold underline">Análisis Eco:</span> La distribución muestra el balance de puntos activos frente a la redención. Una tasa de canje equilibrada favorece la economía circular.
                    </p>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Analizando Eco-Datos...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-purple-600 p-6 rounded-b-[40px] shadow-xl border-b-4 border-purple-700 mb-6 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="bg-white/20 p-2.5 rounded-xl text-white active:scale-95 transition-all">
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter leading-none mb-1">Eco-Analytics</h2>
                            <p className="text-[10px] text-purple-100 font-bold uppercase tracking-widest opacity-80">R3PET Global Intelligence</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex bg-purple-700/50 p-1 rounded-xl relative z-10 border border-purple-400/30">
                    <button
                        onClick={() => setViewMode('metrics')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'metrics' ? 'bg-white text-purple-700 shadow-md' : 'text-purple-200 hover:text-white'}`}
                    >
                        Métricas
                    </button>
                    <button
                        onClick={() => setViewMode('visual')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'visual' ? 'bg-white text-purple-700 shadow-md' : 'text-purple-200 hover:text-white'}`}
                    >
                        Visualización
                    </button>
                </div>
            </header>

            <div className="px-4 space-y-6 animate-fade-in" key={viewMode}>
                {viewMode === 'metrics' ? (
                    <>
                        <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Leaf size={100} />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-80">Impacto Ambiental Acumulado</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <p className="text-3xl font-black leading-none">{stats.totalKgRecycled}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest opacity-70">KG PET</p>
                                </div>
                                <div className="space-y-1 border-l border-white/20 pl-3">
                                    <p className="text-3xl font-black leading-none">{stats.totalCaps}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest opacity-70">Tapitas</p>
                                </div>
                                <div className="space-y-1 border-l border-white/20 pl-3">
                                    <p className="text-3xl font-black leading-none text-emerald-100">{stats.totalCo2Saved}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest opacity-70">KG CO₂</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1">
                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-2">
                                    <Users size={18} />
                                </div>
                                <p className="text-2xl font-black text-gray-900">{stats.totalUsers}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Usuarios Totales</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1">
                                <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-2">
                                    <User size={18} />
                                </div>
                                <p className="text-2xl font-black text-gray-900">{stats.studentCount}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Alumnos Activos</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-gray-50 space-y-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center">Resumen Financiero Eco</p>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-gray-50 pb-3">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 mb-1">Puntos Generados</p>
                                        <p className="text-xl font-black text-green-600">+{stats.totalPointsCreated.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Eco-Emisión</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Histórico Total</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end border-b border-gray-50 pb-3">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 mb-1">Puntos Canjeados</p>
                                        <p className="text-xl font-black text-orange-600">-{stats.totalPointsRedeemed.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Eco-Redención</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Tasa: {stats.totalPointsCreated > 0 ? ((stats.totalPointsRedeemed / stats.totalPointsCreated) * 100).toFixed(1) : 0}%</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 mb-1">Promedio p/ Alumno</p>
                                        <p className="text-xl font-black text-blue-600">{stats.avgPointsPerStudent} pts</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Densidad Eco</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Media Global</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-[32px] shadow-lg border border-gray-50">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-6 flex items-center justify-between">
                                Tendencia de Reciclaje (Puntos)
                                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full">Últimos 7 días</span>
                            </h3>
                            <EcoBarChart data={stats.weeklyData} />
                        </div>

                        <div className="bg-white p-6 rounded-[32px] shadow-lg border border-gray-50">
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                                Distribución de Impacto
                                <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded-full">Global</span>
                            </h3>
                            <EcoPieChart data={stats.impactDistribution} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}



function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ points: 0, role: 'student' });
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

    const filteredUsers = users
        .filter(u => roleFilter === 'all' || u.role === roleFilter)
        .filter(u => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                u.full_name?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query) ||
                u.matricula?.toLowerCase().includes(query)
            );
        });

    return (
        <div className="p-4">
            <header className="bg-white p-4 rounded-2xl shadow-lg shadow-green-100/30 border border-green-50 border-l-8 border-l-green-600 mb-4 animate-fade-in flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="bg-gray-50 p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tighter leading-none mb-0.5">Usuarios</h2>
                        <p className="text-[9px] text-green-600 font-black uppercase tracking-[0.15em]">Gestión de Cuentas</p>
                    </div>
                </div>
                <Link to="/app/admin/create" className="bg-green-600 text-white p-2.5 rounded-xl shadow-lg shadow-green-100 active:scale-95 transition-all">
                    <PlusCircle size={22} />
                </Link>
            </header>

            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2 group focus-within:border-green-300 transition-all mb-4">
                <div className="pl-2.5 text-gray-400 group-focus-within:text-green-500 transition-colors">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    placeholder="Nombre, email o matrícula..."
                    className="w-full p-2 bg-transparent border-none focus:ring-0 text-sm font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Filtrar por rol</p>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button
                        onClick={() => setRoleFilter('all')}
                        className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${roleFilter === 'all'
                            ? 'bg-green-600 text-white shadow-lg shadow-green-100 scale-105'
                            : 'bg-white text-gray-400 border border-gray-100 hover:border-green-200'
                            }`}
                    >
                        Todos · {users.length}
                    </button>
                    <button
                        onClick={() => setRoleFilter('student')}
                        className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${roleFilter === 'student'
                            ? 'bg-green-600 text-white shadow-lg shadow-green-100 scale-105'
                            : 'bg-white text-gray-400 border border-gray-100 hover:border-green-200'
                            }`}
                    >
                        Alumnos · {users.filter(u => u.role === 'student').length}
                    </button>
                    <button
                        onClick={() => setRoleFilter('registrar')}
                        className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${roleFilter === 'registrar'
                            ? 'bg-green-600 text-white shadow-lg shadow-green-100 scale-105'
                            : 'bg-white text-gray-400 border border-gray-100 hover:border-green-200'
                            }`}
                    >
                        Registradores · {users.filter(u => u.role === 'registrar').length}
                    </button>
                    <button
                        onClick={() => setRoleFilter('admin')}
                        className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${roleFilter === 'admin'
                            ? 'bg-green-600 text-white shadow-lg shadow-green-100 scale-105'
                            : 'bg-white text-gray-400 border border-gray-100 hover:border-green-200'
                            }`}
                    >
                        Admins · {users.filter(u => u.role === 'admin').length}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {filteredUsers.map(user => (
                    <div key={user.id} className={`p-4 rounded-xl border-2 animate-fade-in transition-all hover:translate-x-1 ${user.role === 'admin' ? 'bg-purple-50/40 border-purple-100/60' :
                        user.role === 'registrar' ? 'bg-amber-50/40 border-amber-100/60' :
                            'bg-green-50/40 border-green-100/60'
                        }`}>
                        {editingUser?.id === user.id ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-100/50 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-gray-400 font-bold">{user.full_name?.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-900 truncate max-w-[150px]">{user.full_name}</h3>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-green-100">Guardar</button>
                                        <button onClick={() => setEditingUser(null)} className="bg-white text-gray-500 border border-gray-200 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all">Regresar</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/80 p-3 rounded-lg border border-gray-100">
                                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Puntos</label>
                                        <input
                                            type="number"
                                            value={formData.points}
                                            onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-700 focus:ring-0"
                                        />
                                    </div>
                                    <div className="bg-white/80 p-3 rounded-lg border border-gray-100">
                                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Rol</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-700 focus:ring-0 capitalize"
                                        >
                                            <option value="student">Alumno</option>
                                            <option value="registrar">Registrador</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-white transition-transform ${user.role === 'admin' ? 'bg-purple-600' :
                                            user.role === 'registrar' ? 'bg-amber-500' :
                                                'bg-green-600'
                                            }`}>
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                user.full_name?.charAt(0).toUpperCase() || '?'
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-gray-900 text-base uppercase tracking-tight truncate leading-tight">
                                                    {user.full_name}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-600 text-white' :
                                                    user.role === 'registrar' ? 'bg-amber-500 text-white' :
                                                        'bg-green-600 text-white'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                                <p className="text-[9px] font-semibold text-gray-400 truncate lowercase">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/60 backdrop-blur-sm p-2.5 rounded-lg border border-white/50 shadow-sm">
                                            <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
                                                <CreditCard size={8} /> Matrícula
                                            </p>
                                            <p className="text-[11px] font-bold text-gray-700 break-all leading-tight">
                                                {user.matricula || '---'}
                                            </p>
                                        </div>
                                        <div className="bg-white/60 backdrop-blur-sm p-2.5 rounded-lg border border-white/50 shadow-sm">
                                            <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
                                                <Trophy size={8} /> Balance
                                            </p>
                                            <p className={`text-xs font-bold ${user.role === 'admin' ? 'text-purple-600' :
                                                user.role === 'registrar' ? 'text-amber-600' :
                                                    'text-green-600'
                                                }`}>
                                                {user.points || 0} pts
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleEdit(user)}
                                    className={`p-3 rounded-lg shadow-md active:scale-95 transition-all border-2 border-white text-white ${user.role === 'admin' ? 'bg-purple-600 hover:bg-purple-700' :
                                        user.role === 'registrar' ? 'bg-amber-500 hover:bg-amber-600' :
                                            'bg-green-600 hover:bg-green-700'
                                        }`}
                                    title="Editar"
                                >
                                    <Settings size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function AdminCreateUser() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', matricula: '', role: 'student' });
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        // Validación básica
        if (formData.role === 'student' && !formData.matricula) {
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className={`p-6 border-b-4 animate-fade-in transition-colors duration-500 ${formData.role === 'admin' ? 'bg-purple-600 border-purple-700 shadow-purple-100' :
                formData.role === 'registrar' ? 'bg-amber-500 border-amber-600 shadow-amber-100' :
                    'bg-green-600 border-green-700 shadow-green-100'
                } shadow-xl flex items-center gap-4 sticky top-0 z-40`}>
                <button
                    onClick={() => navigate(-1)}
                    className="bg-white/20 p-2.5 rounded-xl text-white hover:bg-white/30 transition-all active:scale-95 shadow-sm"
                >
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

                <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-100 space-y-5">
                    {/* Selector de Rol */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                        {['student', 'registrar', 'admin'].map((role) => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => setFormData({ ...formData, role })}
                                className={`py-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${formData.role === role
                                    ? (role === 'admin' ? 'bg-purple-600 text-white shadow-md' : role === 'registrar' ? 'bg-amber-500 text-white shadow-md' : 'bg-green-600 text-white shadow-md')
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {role === 'student' ? 'Alumno' : role === 'registrar' ? 'Registro' : 'Admin'}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full p-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold text-gray-700 focus:border-green-100 focus:bg-white transition-all outline-none"
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>

                        {formData.role === 'student' && (
                            <div className="animate-fade-in">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Matrícula Escolar</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={formData.matricula}
                                        onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                                        className="w-full p-3.5 pl-10 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold text-gray-700 focus:border-green-100 focus:bg-white transition-all outline-none"
                                        placeholder="Número de control"
                                    />
                                    <CreditCard size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold text-gray-700 focus:border-green-100 focus:bg-white transition-all outline-none"
                                placeholder="usuario@escuela.edu"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full p-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-sm font-bold text-gray-700 focus:border-green-100 focus:bg-white transition-all outline-none"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all mt-4 disabled:opacity-50 flex items-center justify-center gap-2 ${formData.role === 'admin' ? 'bg-purple-600 shadow-purple-100' :
                            formData.role === 'registrar' ? 'bg-amber-500 shadow-amber-100' :
                                'bg-green-600 shadow-green-100'
                            }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <PlusCircle size={18} />
                                Crear Cuenta
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-8">
                    R3PET Management System • Professional Edition
                </p>
            </div>
        </div>
    );
}

function AdminProfile() {
    const { userId, onLogout } = useOutletContext();
    const [profile, setProfile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (userId) {
        }
    }, [userId]);

    const fetchProfile = async () => {
        const docSnap = await getDoc(doc(db, "profiles", userId));
        if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() });
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            alert('La imagen debe pesar menos de 3MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten imágenes');
            return;
        }

        setUploading(true);
        try {
            // Nota: En Firebase Storage no es estrictamente necesario borrar el anterior 
            // si usamos el mismo path, pero generaremos un nombre único.
            const fileExt = file.name.split('.').pop();
            const fileName = `avatars/${userId}-${Date.now()}.${fileExt}`;
            const storageRef = ref(storage, fileName);

            // Subir archivo
            await uploadBytes(storageRef, file);

            // Obtener URL
            const publicUrl = await getDownloadURL(storageRef);

            // Actualizar perfil en Firestore
            await updateDoc(doc(db, "profiles", userId), {
                avatar_url: publicUrl
            });

        } catch (error) {
            console.error('Error al subir imagen:', error);
            alert('Error al subir imagen: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <header className="bg-white p-6 rounded-3xl shadow-xl shadow-green-100/50 border border-green-50 border-l-8 border-l-green-600 mb-6 flex items-center gap-6 animate-fade-in relative overflow-hidden">
                <div className="relative flex-shrink-0">
                    {profile?.avatar_url ? (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                            <img
                                src={profile.avatar_url}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 border-2 border-green-100 shadow-inner">
                            <User size={32} />
                        </div>
                    )}
                    <label className="absolute -bottom-2 -right-2 bg-green-600 text-white p-2 rounded-xl cursor-pointer hover:bg-green-700 shadow-lg border-2 border-white active:scale-95 transition-all" title="Cambiar foto">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                        {uploading ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : '📷'}
                    </label>
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tighter leading-none mb-1">{profile?.full_name || 'Cargando...'}</h2>
                    <p className="text-xs font-bold text-gray-400 lowercase truncate max-w-[180px]">{profile?.email}</p>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-black bg-green-600 text-white px-2 py-0.5 rounded-md uppercase tracking-widest">Admin Root</span>
                        <span className="text-[10px] font-black bg-gray-100 text-gray-400 px-2 py-0.5 rounded-md uppercase tracking-widest">v1.1.0</span>
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border divide-y">
                <div className="p-4 flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Matrícula</span>
                    <span className="text-gray-900 font-bold">{profile?.matricula || '---'}</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Rol</span>
                    <span className="text-purple-700 font-bold capitalize bg-purple-100 px-3 py-1 rounded">{profile?.role}</span>
                </div>
            </div>

            <button
                onClick={onLogout}
                className="w-full bg-red-50 text-red-600 py-3 rounded-lg font-bold border border-red-100 flex items-center justify-center gap-2 hover:bg-red-100 transition"
            >
                <LogOut size={18} />
                Cerrar Sesión
            </button>

            <div className="text-center text-xs text-gray-300 mt-8">
                ID: {userId}
            </div>
        </div>
    );
}


// --- LAYOUTS ---

function MainLayout({ role, userId, onLogout }) {
    const [points, setPoints] = useState(0);
    const [lifetimePoints, setLifetimePoints] = useState(0);
    const [totalCaps, setTotalCaps] = useState(0);
    const [fullName, setFullName] = useState('');
    const location = useLocation();

    // 1. Fetch Points on Load & when changed
    useEffect(() => {
        if (userId) {
            const unsub = onSnapshot(doc(db, "profiles", userId), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setPoints(data.points || 0);
                    setLifetimePoints(data.total_bottles || 0);
                    setTotalCaps(data.total_caps || 0);
                    setFullName(data.full_name);
                }
            });
            return () => unsub();
        }
    }, [userId]);

    // Manejar botón de retroceso de Android
    useEffect(() => {
        const setupBackButton = async () => {
            // Definir páginas principales para cada rol
            const mainPages = {
                'student': '/app/dashboard',
                'registrar': '/app/registrar',
                'admin': '/app/admin'
            };

            const handleBackAction = () => {
                const currentPath = location.pathname;
                const isMainPage = mainPages[role] === currentPath;

                if (isMainPage) {
                    // Si estamos en la página principal
                    if (window.Capacitor) {
                        // En dispositivo Android, minimizar la app en lugar de cerrarla
                        CapacitorApp.minimizeApp();
                    } else {
                        // En navegador web, mostrar mensaje o hacer nada
                        console.log('Estás en la página principal. Usa el menú de navegación para moverte.');
                    }
                } else {
                    // Si no estamos en la página principal, retroceder
                    window.history.back();
                }
            };

            if (window.Capacitor) {
                // Configurar listener para el botón de retroceso usando Capacitor (Android/iOS)
                try {
                    const listener = await CapacitorApp.addListener('backButton', handleBackAction);

                    return () => {
                        listener.remove();
                    };
                } catch (error) {
                    console.log('Error configurando botón de retroceso con Capacitor:', error);
                }
            } else {
                // En navegador web, también podemos manejar el retroceso con teclado
                const handlePopState = (event) => {
                    event.preventDefault();
                    handleBackAction();
                };

                window.addEventListener('popstate', handlePopState);

                return () => {
                    window.removeEventListener('popstate', handlePopState);
                };
            }
        };

        const cleanup = setupBackButton();

        return () => {
            if (cleanup && typeof cleanup.then === 'function') {
                cleanup.then(cleanupFn => {
                    if (typeof cleanupFn === 'function') {
                        cleanupFn();
                    }
                });
            }
        };
    }, [location.pathname, role]);


    const getNavItems = () => {
        if (role === 'student') return [
            { path: '/app/dashboard', icon: Home, label: 'Inicio' },
            { path: '/app/ranking', icon: Trophy, label: 'Clasificación' },
            { path: '/app/rewards', icon: Award, label: 'Premios' },
            { path: '/app/profile', icon: User, label: 'Perfil' }
        ];
        if (role === 'registrar') return [
            { path: '/app/registrar', icon: QrCode, label: 'Inicio' },
            { path: '/app/ranking', icon: Trophy, label: 'Ranking' },
            { path: '/app/registrar/list', icon: Users, label: 'Alumnos' },
            { path: '/app/profile', icon: User, label: 'Perfil' }
        ];
        if (role === 'admin') return [
            { path: '/app/admin', icon: BarChart, label: 'Inicio' },
            { path: '/app/ranking', icon: Trophy, label: 'Ranking' },
            { path: '/app/admin/users', icon: Users, label: 'Usuarios' },
            { path: '/app/profile', icon: User, label: 'Perfil' }
        ];
        return [];
    };

    const navItems = getNavItems();
    const isActive = (path) => location.pathname === path;
    const themeColor = role === 'admin' ? 'border-purple-600 text-purple-600' :
        role === 'registrar' ? 'border-blue-600 text-blue-600' : 'border-green-600 text-green-600';

    // --- SWIPE & VISIBILITY LOGIC ---
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [showHelpers, setShowHelpers] = useState(true);
    const navigate = useNavigate();

    // Temporizador para ocultar botones
    useEffect(() => {
        let timer;
        if (showHelpers) {
            timer = setTimeout(() => setShowHelpers(false), 3000);
        }
        return () => clearTimeout(timer);
    }, [showHelpers]);

    const handleInteraction = () => {
        if (!showHelpers) setShowHelpers(true);
    };

    // Distancia mínima para considerar un swipe
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        handleInteraction();
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe || isRightSwipe) {
            const currentIndex = navItems.findIndex(item => item.path === location.pathname);
            if (currentIndex === -1) return;

            if (isLeftSwipe && currentIndex < navItems.length - 1) {
                // Swipe a la izquierda -> Siguiente pestaña
                navigate(navItems[currentIndex + 1].path);
            } else if (isRightSwipe && currentIndex > 0) {
                // Swipe a la derecha -> Pestaña anterior
                navigate(navItems[currentIndex - 1].path);
            }
        }
    };

    return (
        <div
            className="min-h-screen bg-gray-50 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-200 flex flex-col"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >

            {/* Content with Animation Container */}
            <div className="flex-1 overflow-y-auto pb-20 relative">
                <div key={location.pathname} className="animate-fade-in">
                    <Outlet context={{ role, userId, points, setPoints, onLogout, lifetimePoints, totalCaps, fullName }} />
                </div>
            </div>

            {/* Helper Navigation Buttons */}
            {navItems.findIndex(i => i.path === location.pathname) > 0 && (
                <button
                    onClick={() => { handleInteraction(); navigate(navItems[navItems.findIndex(i => i.path === location.pathname) - 1].path); }}
                    className={`nav-helper-btn left hover-bounce-l text-primary ${!showHelpers ? 'hidden-nav' : ''}`}
                >
                    <ChevronLeft size={24} />
                </button>
            )}

            {navItems.findIndex(i => i.path === location.pathname) < navItems.length - 1 && (
                <button
                    onClick={() => { handleInteraction(); navigate(navItems[navItems.findIndex(i => i.path === location.pathname) + 1].path); }}
                    className={`nav-helper-btn right hover-bounce-r text-primary ${!showHelpers ? 'hidden-nav' : ''}`}
                >
                    <ChevronRight size={24} />
                </button>
            )}

            <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around py-2 pb-4 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-40">
                {navItems.map((item) => (
                    <Link key={item.path} to={item.path} className={`flex flex-col items-center px-4 py-1 transition-colors ${isActive(item.path) ? themeColor : 'text-gray-400'}`}>
                        <item.icon size={24} strokeWidth={isActive(item.path) ? 2.5 : 2} />
                        <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}


function App() {
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null); // Nuevo estado para ID
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // Use useNavigate hook

    useEffect(() => {
        let unsubProfile = null;
        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                // Escuchador en tiempo real para el perfil (incluyendo cambios de rol)
                unsubProfile = onSnapshot(doc(db, "profiles", user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const profileData = docSnap.data();
                        setUserRole(profileData.role);
                        // Estos setters no existen en App, se derivan de la sesión o se manejan en subcomponentes
                        console.log("Sesión activa para:", profileData.full_name);
                    } else {
                        setUserRole('student');
                        setLoading(false);
                    }
                    setLoading(false);
                });
            } else {
                setUserRole(null);
                setUserId(null);
                setLoading(false);
                if (unsubProfile) unsubProfile();
            }
        });

        return () => {
            unsubAuth();
            if (unsubProfile) unsubProfile();
        };
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        setUserRole(null);
        setUserId(null);
        navigate('/'); // Navigate to login screen after logout
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando R3PET...</div>;
    }

    const getHomePath = (role) => {
        if (role === 'admin') return '/app/admin';
        if (role === 'registrar') return '/app/registrar';
        return '/app/dashboard';
    };

    return (
        <Routes>
            <Route path="/" element={
                !userRole ? <LoginScreen /> : <Navigate to={getHomePath(userRole)} />
            } />

            {userRole && (
                <Route path="/app" element={<MainLayout role={userRole} userId={userId} onLogout={handleLogout} />}>

                    {userRole === 'student' && (
                        <>
                            <Route path="dashboard" element={<StudentDashboard />} />
                            <Route path="rewards" element={<RewardsScreen />} />
                            <Route path="profile" element={<ProfileScreen />} />
                            <Route path="profile/points-history" element={<PointsHistory />} />
                            <Route path="profile/redemptions-history" element={<RedemptionsHistory />} />
                        </>
                    )}

                    <Route path="ranking" element={<RankingScreen />} />

                    {userRole === 'registrar' && (
                        <>
                            <Route path="registrar" element={<RegistrarScanner />} />
                            <Route path="registrar/list" element={<RegistrarUsersList />} />
                            <Route path="profile" element={<ProfileScreen />} />
                            <Route path="profile/work-history" element={<RegistrarWorkHistory />} />
                        </>
                    )}

                    {userRole === 'admin' && (
                        <>
                            <Route path="admin" element={<AdminDashboard />} />
                            <Route path="admin/users" element={<AdminUserManagement />} />
                            <Route path="admin/create" element={<AdminCreateUser />} />
                            <Route path="admin/statistics" element={<AdminStatistics />} />
                            <Route path="admin/history" element={<AdminTransactionHistory />} />
                            <Route path="profile" element={<ProfileScreen />} />
                        </>
                    )}
                </Route>
            )}

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

// Componente de Historial Global de Transacciones
function AdminTransactionHistory() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'positive', 'negative'
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'custom'
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const itemsPerPage = 20;

    useEffect(() => {
        fetchTransactionHistory();
    }, []);

    const fetchTransactionHistory = async () => {
        setLoading(true);
        try {
            // Obtener todas las transacciones de Firestore
            const txQuery = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
            const txSnapshot = await getDocs(txQuery);
            const transactionsData = txSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Normalizar timestamp para compatibilidad con la UI de fechas
                created_at: doc.data().timestamp?.toDate() || new Date()
            }));

            // Obtener todos los perfiles para mapear nombres
            const profilesSnapshot = await getDocs(collection(db, "profiles"));
            const profilesMap = {};
            profilesSnapshot.forEach(d => {
                profilesMap[d.id] = { id: d.id, ...d.data() };
            });

            setProfiles(profilesMap);
            setTransactions(transactionsData || []);
        } catch (error) {
            console.error('Error al cargar historial de transacciones:', error);
        } finally {
            setLoading(false);
        }
    };

    // Función para filtrar por fechas
    const filterByDate = (transactionDate) => {
        const txDate = new Date(transactionDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Final del día

        switch (dateFilter) {
            case 'all':
                return true;
            case 'today':
                const startOfDay = new Date(today);
                startOfDay.setHours(0, 0, 0, 0);
                return txDate >= startOfDay && txDate <= today;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return txDate >= weekAgo && txDate <= today;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return txDate >= monthAgo && txDate <= today;
            case 'custom':
                if (!customDateRange.start || !customDateRange.end) return true;
                const startDate = new Date(customDateRange.start);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(customDateRange.end);
                endDate.setHours(23, 59, 59, 999);
                return txDate >= startDate && txDate <= endDate;
            default:
                return true;
        }
    };

    // Filtrar transacciones
    const filteredTransactions = transactions.filter(tx => {
        const matchesFilter = filter === 'all' ||
            (filter === 'positive' && tx.points > 0) ||
            (filter === 'negative' && tx.points < 0);

        const matchesDate = filterByDate(tx.created_at);

        const studentProfile = profiles[tx.student_id];
        const registrarProfile = tx.registar_by ? profiles[tx.registar_by] : null;

        const matchesSearch = searchQuery === '' ||
            (studentProfile && (
                studentProfile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                studentProfile.matricula?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                studentProfile.email?.toLowerCase().includes(searchQuery.toLowerCase())
            )) ||
            (registrarProfile && (
                registrarProfile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                registrarProfile.email?.toLowerCase().includes(searchQuery.toLowerCase())
            )) ||
            tx.description?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesDate && matchesSearch;
    });

    // Paginación
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Función para limpiar todos los filtros
    const clearAllFilters = () => {
        setFilter('all');
        setDateFilter('all');
        setSearchQuery('');
        setCustomDateRange({ start: '', end: '' });
        setShowDatePicker(false);
        setCurrentPage(1);
    };

    const getTransactionIcon = (amount, description) => {
        if (amount > 0) {
            return <Leaf size={16} className="text-green-500" />;
        } else {
            return <Award size={16} className="text-orange-500" />;
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cargando Historial Global...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-amber-600 p-6 rounded-b-[40px] shadow-xl border-b-4 border-amber-700 mb-6 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-white/20 p-2.5 rounded-xl text-white active:scale-95 transition-all"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter leading-none mb-1">Historial Global</h2>
                            <p className="text-[10px] text-amber-100 font-bold uppercase tracking-widest opacity-80">Transacciones Detalladas R3PET</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 bg-amber-700/50 p-3 rounded-xl relative z-10 border border-amber-400/30">
                    <div className="flex items-center justify-between">
                        <div className="text-white">
                            <p className="text-[10px] font-medium opacity-80">Transacciones filtradas</p>
                            <p className="text-lg font-black">{filteredTransactions.length}</p>
                            <p className="text-[9px] opacity-70">
                                {filteredTransactions.length !== transactions.length &&
                                    `de ${transactions.length} totales`}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <div className="text-green-100 text-center">
                                <p className="text-[10px] font-medium">Registros</p>
                                <p className="text-sm font-bold">
                                    {filteredTransactions.filter(t => t.points > 0).length}
                                </p>
                            </div>
                            <div className="text-orange-100 text-center">
                                <p className="text-[10px] font-medium">Canjes</p>
                                <p className="text-sm font-bold">
                                    {filteredTransactions.filter(t => t.points < 0).length}
                                </p>
                            </div>
                            {(filter !== 'all' || dateFilter !== 'all' || searchQuery) && (
                                <button
                                    onClick={clearAllFilters}
                                    className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold text-white transition-all active:scale-95"
                                >
                                    Limpiar Filtros
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Filtros y Búsqueda */}
            <div className="px-4 mb-6 space-y-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, matrícula, email o descripción..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                </div>

                {/* Filtro por Tipo */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filter === 'all'
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Todas ({transactions.length})
                    </button>
                    <button
                        onClick={() => setFilter('positive')}
                        className={`flex-1 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filter === 'positive'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Registros PET ({transactions.filter(t => t.points > 0).length})
                    </button>
                    <button
                        onClick={() => setFilter('negative')}
                        className={`flex-1 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filter === 'negative'
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Canjes ({transactions.filter(t => t.points < 0).length})
                    </button>
                </div>

                {/* Filtro por Fechas */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Clock size={16} className="text-amber-600" />
                            Filtrar por Periodo
                        </h3>
                        <span className="text-xs text-gray-400 font-medium">
                            {dateFilter === 'all' && 'Todas las fechas'}
                            {dateFilter === 'today' && 'Hoy'}
                            {dateFilter === 'week' && 'Últimos 7 días'}
                            {dateFilter === 'month' && 'Últimos 30 días'}
                            {dateFilter === 'custom' && (customDateRange.start && customDateRange.end ?
                                `${customDateRange.start} al ${customDateRange.end}` : 'Seleccionar rango')}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                            onClick={() => {
                                setDateFilter('all');
                                setShowDatePicker(false);
                                setCurrentPage(1);
                            }}
                            className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${dateFilter === 'all'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => {
                                setDateFilter('today');
                                setShowDatePicker(false);
                                setCurrentPage(1);
                            }}
                            className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${dateFilter === 'today'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Hoy
                        </button>
                        <button
                            onClick={() => {
                                setDateFilter('week');
                                setShowDatePicker(false);
                                setCurrentPage(1);
                            }}
                            className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${dateFilter === 'week'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            7 días
                        </button>
                        <button
                            onClick={() => {
                                setDateFilter('custom');
                                setShowDatePicker(!showDatePicker);
                                setCurrentPage(1);
                            }}
                            className={`py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-normal transition-all flex items-center justify-center text-center ${dateFilter === 'custom'
                                ? 'bg-teal-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Personalizado
                        </button>
                    </div>

                    {/* Selector de Fechas Personalizadas */}
                    {showDatePicker && (
                        <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-200 space-y-3 animate-fade-in">
                            <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">Rango de Fechas Personalizado</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                                        Desde
                                    </label>
                                    <input
                                        type="date"
                                        value={customDateRange.start}
                                        onChange={(e) => {
                                            setCustomDateRange(prev => ({ ...prev, start: e.target.value }));
                                            setCurrentPage(1);
                                        }}
                                        className="w-full p-2 border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                                        Hasta
                                    </label>
                                    <input
                                        type="date"
                                        value={customDateRange.end}
                                        onChange={(e) => {
                                            setCustomDateRange(prev => ({ ...prev, end: e.target.value }));
                                            setCurrentPage(1);
                                        }}
                                        className="w-full p-2 border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                        max={new Date().toISOString().split('T')[0]}
                                        min={customDateRange.start}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const today = new Date();
                                        const weekAgo = new Date(today);
                                        weekAgo.setDate(weekAgo.getDate() - 7);
                                        setCustomDateRange({
                                            start: weekAgo.toISOString().split('T')[0],
                                            end: today.toISOString().split('T')[0]
                                        });
                                        setCurrentPage(1);
                                    }}
                                    className="flex-1 py-2 bg-teal-100 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-200 transition-all"
                                >
                                    Última Semana
                                </button>
                                <button
                                    onClick={() => {
                                        const today = new Date();
                                        const monthAgo = new Date(today);
                                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                                        setCustomDateRange({
                                            start: monthAgo.toISOString().split('T')[0],
                                            end: today.toISOString().split('T')[0]
                                        });
                                        setCurrentPage(1);
                                    }}
                                    className="flex-1 py-2 bg-teal-100 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-200 transition-all"
                                >
                                    Último Mes
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de Transacciones */}
            <div className="px-4 space-y-3">
                {paginatedTransactions.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-400 font-bold">No se encontraron transacciones</p>
                        <p className="text-gray-300 text-sm mt-2">
                            {filter !== 'all' || dateFilter !== 'all' || searchQuery ?
                                `Con los filtros actuales (${filteredTransactions.length !== transactions.length ? filteredTransactions.length + ' de ' + transactions.length + ' totales' : ''})` :
                                'No hay transacciones registradas en el sistema'
                            }
                        </p>
                        {(filter !== 'all' || dateFilter !== 'all' || searchQuery) && (
                            <button
                                onClick={clearAllFilters}
                                className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-all active:scale-95"
                            >
                                Mostrar Todas las Transacciones
                            </button>
                        )}
                    </div>
                ) : (
                    paginatedTransactions.map((transaction, index) => {
                        const studentProfile = profiles[transaction.student_id];
                        const registrarProfile = transaction.registar_by ? profiles[transaction.registar_by] : null;
                        const dateTime = formatDateTime(transaction.created_at);
                        const isPositive = transaction.points > 0;

                        return (
                            <div
                                key={transaction.id}
                                className={`bg-white p-4 rounded-2xl shadow-sm border-2 animate-fade-in transition-all hover:shadow-md ${isPositive
                                    ? 'border-green-100 hover:border-green-200'
                                    : 'border-orange-100 hover:border-orange-200'
                                    }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${isPositive ? 'bg-green-100' : 'bg-orange-100'
                                            }`}>
                                            {getTransactionIcon(transaction.points, transaction.description)}
                                        </div>
                                        <div>
                                            <span className={`text-sm font-bold ${isPositive ? 'text-green-700' : 'text-orange-700'
                                                }`}>
                                                {isPositive ? 'Registro PET' : 'Canje Realizado'}
                                            </span>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">
                                                {transaction.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-lg font-black ${isPositive ? 'text-green-600' : 'text-orange-600'
                                            }`}>
                                            {isPositive ? '+' : ''}{transaction.points.toLocaleString()} pts
                                        </span>
                                    </div>
                                </div>

                                {/* Información del estudiante */}
                                <div className="mb-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Estudiante Beneficiado</p>
                                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <User size={14} className="text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-800">
                                                {studentProfile?.full_name || 'Usuario Eliminado'}
                                            </p>
                                            <div className="flex gap-4 text-[9px] text-gray-500">
                                                <span>Matrícula: {studentProfile?.matricula || 'N/A'}</span>
                                                <span>Email: {studentProfile?.email || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Información del registrador (solo para canjes o si existe) */}
                                {registrarProfile && (
                                    <div className="mb-3">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            Registrado Por
                                        </p>
                                        <div className="flex items-center gap-3 bg-amber-50 p-3 rounded-xl">
                                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                                <Shield size={14} className="text-amber-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-800">
                                                    {registrarProfile?.full_name}
                                                </p>
                                                <div className="flex gap-4 text-[9px] text-gray-500">
                                                    <span>Rol: {registrarProfile?.role === 'admin' ? 'Administrador' : registrarProfile?.role === 'registrar' ? 'Registrador' : 'Estudiante'}</span>
                                                    <span>Email: {registrarProfile?.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Fecha y hora */}
                                <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                        <Clock size={12} />
                                        <span>{dateTime.date}</span>
                                        <span>•</span>
                                        <span>{dateTime.time}</span>
                                    </div>
                                    {transaction.client_tx_id && (
                                        <div className="flex items-center gap-1 text-[9px] text-gray-300">
                                            <span>ID:</span>
                                            <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">
                                                {transaction.client_tx_id.slice(0, 12)}...
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="px-4 mt-8 flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-[10px] text-gray-400">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length} transacciones
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-gray-600 px-3">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
