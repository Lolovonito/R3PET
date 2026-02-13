import React, { useState, useRef } from 'react';
import AvatarEditor from 'react-avatar-editor';
import { useDropzone } from 'react-dropzone';
import { X, Upload, RotateCw, ZoomIn, Save, Loader } from 'lucide-react';
import { useAvatar } from '../../hooks/useAvatar';

export default function AvatarEditorModal({ isOpen, onClose, user, onSaveSuccess }) {
    const [image, setImage] = useState(null);
    const [scale, setScale] = useState(1.2);
    const [rotate, setRotate] = useState(0);
    const editorRef = useRef(null);
    const { updateAvatar, isUploading, error } = useAvatar();

    const onDrop = (dropped) => {
        if (dropped && dropped.length > 0) {
            setImage(dropped[0]);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1
    });

    const handleSave = async () => {
        if (!editorRef.current) return;

        // Obtener canvas del editor
        const canvas = editorRef.current.getImageScaledToCanvas();

        // Convertir canvas a blob
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            // Crear archivo desde el blob
            const file = new File([blob], "avatar.png", { type: "image/png" });

            try {
                await updateAvatar(user.id || user.uid, file);
                setImage(null); // Resetear
                if (onSaveSuccess) onSaveSuccess();
                onClose();
            } catch (err) {
                // El error se maneja en el hook
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">Editar Foto de Perfil</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col items-center flex-1 min-h-0">

                    {error && (
                        <div className="w-full mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <X size={14} /> {error}
                        </div>
                    )}

                    {!image ? (
                        <div
                            {...getRootProps()}
                            className={`
                                w-full border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                                ${isDragActive ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-primary hover:bg-gray-50'}
                            `}
                        >
                            <input {...getInputProps()} />
                            <div className="w-16 h-16 bg-blue-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload size={32} />
                            </div>
                            <p className="font-bold text-gray-700">Arrastra tu foto aquí</p>
                            <p className="text-xs text-gray-400 mt-2">o haz clic para seleccionar</p>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center">
                            <div className="relative rounded-full shadow-2xl mb-8 bg-gray-900">
                                <AvatarEditor
                                    ref={editorRef}
                                    image={image}
                                    width={250}
                                    height={250}
                                    border={0}
                                    borderRadius={125}
                                    color={[0, 0, 0, 0.6]} // Máscara oscura
                                    scale={scale}
                                    rotate={rotate}
                                    className="rounded-full"
                                />
                            </div>

                            <div className="w-full space-y-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><ZoomIn size={14} /> Zoom</span>
                                        <span className="bg-white px-2 py-0.5 rounded shadow-sm border">{Math.round(scale * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="3"
                                        step="0.05"
                                        value={scale}
                                        onChange={(e) => setScale(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><RotateCw size={14} /> Rotación</span>
                                        <span className="bg-white px-2 py-0.5 rounded shadow-sm border">{rotate}°</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        step="90"
                                        value={rotate}
                                        onChange={(e) => setRotate(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>

                                <button
                                    onClick={() => setImage(null)}
                                    className="text-xs text-center text-gray-500 hover:text-red-500 hover:underline transition-colors w-full py-2"
                                >
                                    Cancelar y elegir otra imagen
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="px-4 py-2 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!image || isUploading}
                        className="px-6 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md hover:bg-purple-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <><Loader size={16} className="animate-spin" /> Guardando...</>
                        ) : (
                            <><Save size={16} /> Guardar Avatar</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
