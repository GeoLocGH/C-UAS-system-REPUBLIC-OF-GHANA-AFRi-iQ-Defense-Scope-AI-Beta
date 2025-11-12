import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/I18nContext';
import { ToggleSwitch } from './ToggleSwitch';

interface GeofenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newGeofence: { name: string; alertOnEntry: boolean; alertOnExit: boolean; color: string; interceptorDefense: boolean; }) => void;
    existingNames: string[];
}

const GEOFENCE_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export const GeofenceModal: React.FC<GeofenceModalProps> = ({ isOpen, onClose, onSave, existingNames }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [alertOnEntry, setAlertOnEntry] = useState(true);
    const [alertOnExit, setAlertOnExit] = useState(true);
    const [interceptorDefense, setInterceptorDefense] = useState(true);
    const [color, setColor] = useState(GEOFENCE_COLORS[0]);
    const [nameError, setNameError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName('');
            setAlertOnEntry(true);
            setAlertOnExit(true);
            setInterceptorDefense(true);
            setColor(GEOFENCE_COLORS[Math.floor(Math.random() * GEOFENCE_COLORS.length)]);
            setNameError('');
        }
    }, [isOpen]);
    
    useEffect(() => {
        const isDuplicate = existingNames.some(existing => existing.toLowerCase() === name.trim().toLowerCase());
        if (isDuplicate) {
            setNameError(t('geofence.modal.error.duplicate_name'));
        } else if (name.trim().length === 0) {
            setNameError(t('geofence.modal.error.name_required'));
        } else {
            setNameError('');
        }
    }, [name, existingNames, t]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!nameError && name.trim().length > 0) {
            onSave({ name: name.trim(), alertOnEntry, alertOnExit, color, interceptorDefense });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" role="dialog" aria-modal="true">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">{t('geofence.modal.title')}</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="geofence_name" className="block text-sm font-medium text-gray-400">{t('geofence.modal.name')}</label>
                        <input
                            type="text"
                            id="geofence_name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`mt-1 block w-full bg-gray-700 border rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 ${nameError ? 'border-red-500' : 'border-gray-600'}`}
                            placeholder={t('geofence.modal.name_placeholder')}
                        />
                         {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('geofence.modal.color')}</label>
                        <div className="flex gap-2">
                            {GEOFENCE_COLORS.map(c => (
                                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition ${color === c ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''}`} style={{ backgroundColor: c }} aria-label={`Select color ${c}`}></button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3 pt-2">
                        <label className="flex items-center justify-between cursor-pointer p-2 bg-gray-900 rounded-md">
                            <span className="ml-3 text-white">{t('geofence.modal.alert_on_entry')}</span>
                            <ToggleSwitch isEnabled={alertOnEntry} onToggle={() => setAlertOnEntry(p => !p)} />
                        </label>
                         <label className="flex items-center justify-between cursor-pointer p-2 bg-gray-900 rounded-md">
                            <span className="ml-3 text-white">{t('geofence.modal.alert_on_exit')}</span>
                            <ToggleSwitch isEnabled={alertOnExit} onToggle={() => setAlertOnExit(p => !p)} />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer p-2 bg-gray-900 rounded-md">
                            <span className="ml-3 font-semibold text-cyan-400">{t('geofence.modal.interceptor_defense')}</span>
                            <ToggleSwitch isEnabled={interceptorDefense} onToggle={() => setInterceptorDefense(p => !p)} />
                        </label>
                    </div>
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition">{t('geofence.modal.cancel')}</button>
                    <button onClick={handleSave} disabled={!!nameError || name.trim().length === 0} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold text-white transition disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed">
                        {t('geofence.modal.save')}
                    </button>
                </div>
            </div>
        </div>
    );
};