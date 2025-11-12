

import React, { useState, useEffect } from 'react';
import type { MissionPreset, UserRole, Location } from '../types';
import { useTranslation } from '../contexts/I18nContext';
import { METERS_TO_FEET } from '../constants';

interface MissionModalProps {
    isOpen: boolean;
    target: string | null;
    onClose: () => void;
    onSubmit: (lat: number, lon: number, alt: number) => void;
    presets: MissionPreset[];
    userRole: UserRole;
    onSavePreset: (name: string, location: Location) => boolean;
    onDeletePreset: (name: string) => void;
    getDroneDisplayName: (droneId: string) => string;
}

export const MissionModal: React.FC<MissionModalProps> = ({ isOpen, target, onClose, onSubmit, presets, userRole, onSavePreset, onDeletePreset, getDroneDisplayName }) => {
    const { t } = useTranslation();
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [alt, setAlt] = useState(''); // This state will now store altitude in FEET
    const [newPresetName, setNewPresetName] = useState('');
    const [selectedPresetName, setSelectedPresetName] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setLat('');
            setLon('');
            setAlt('');
            setNewPresetName('');
            setSelectedPresetName('');
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = () => {
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        const altNumFeet = parseFloat(alt);

        if (isNaN(latNum) || isNaN(lonNum) || isNaN(altNumFeet)) {
            alert(t('mission_modal.alert.invalid_coords'));
            return;
        }
        
        // Convert altitude from feet back to meters before submitting
        const altNumMeters = altNumFeet / METERS_TO_FEET;
        
        onSubmit(latNum, lonNum, altNumMeters);
    };
    
    const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const presetName = e.target.value;
        setSelectedPresetName(presetName);
        const preset = presets.find(p => p.name === presetName);
        if (preset) {
            setLat(preset.location.lat.toString());
            setLon(preset.location.lon.toString());
            
            // Convert altitude from meters (stored) to feet (for display)
            const altInFeet = preset.location.alt * METERS_TO_FEET;
            setAlt(altInFeet.toFixed(1));

            setNewPresetName(''); // Clear save field when loading
        }
    };

    const handleDeleteClick = () => {
        if (selectedPresetName && window.confirm(t('mission_modal.confirm_delete', { name: selectedPresetName }))) {
            onDeletePreset(selectedPresetName);
            // Clear fields after confirmed deletion
            setLat('');
            setLon('');
            setAlt('');
            setSelectedPresetName('');
        }
    };

    const handleSaveClick = () => {
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        const altNumFeet = parseFloat(alt);

        if (isNaN(latNum) || isNaN(lonNum) || isNaN(altNumFeet)) {
            alert(t('mission_modal.alert.invalid_coords'));
            return;
        }
        if (!newPresetName.trim()) {
            alert(t('mission_modal.alert.invalid_preset_name'));
            return;
        }

        const altNumMeters = altNumFeet / METERS_TO_FEET;
        const location = { lat: latNum, lon: lonNum, alt: altNumMeters };

        const success = onSavePreset(newPresetName.trim(), location);

        if (success) {
            setSelectedPresetName(newPresetName.trim());
            setNewPresetName('');
        } else {
            alert(t('mission_modal.alert.preset_exists', { name: newPresetName.trim() }));
        }
    };

    const targetName = target === 'fleet' ? 'Fleet' : getDroneDisplayName(target || '');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6" id="modal-title">
                    {t('mission_modal.title', { targetName })}
                </h2>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="preset_select" className="block text-sm font-medium text-gray-400">{t('mission_modal.load_preset')}</label>
                         <div className="flex items-center gap-2 mt-1">
                            <select
                                id="preset_select"
                                value={selectedPresetName}
                                onChange={handlePresetSelect}
                                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                            >
                                <option value="">{t('mission_modal.select_preset')}</option>
                                {presets.map(preset => (
                                    <option key={preset.name} value={preset.name}>{preset.name}</option>
                                ))}
                            </select>
                            {userRole === 'Admin' && selectedPresetName && (
                                <button 
                                    onClick={handleDeleteClick} 
                                    className="p-2 bg-red-600 hover:bg-red-700 rounded-md transition"
                                    title={t('mission_modal.delete_preset')}
                                    aria-label={t('mission_modal.delete_preset')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="target_lat" className="block text-sm font-medium text-gray-400">{t('mission_modal.target_lat')}</label>
                        <input 
                            type="text" 
                            id="target_lat" 
                            value={lat}
                            onChange={(e) => setLat(e.target.value)}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" 
                            placeholder="e.g., 37.7749"
                        />
                    </div>
                    <div>
                        <label htmlFor="target_lon" className="block text-sm font-medium text-gray-400">{t('mission_modal.target_lon')}</label>
                        <input 
                            type="text" 
                            id="target_lon" 
                            value={lon}
                            onChange={(e) => setLon(e.target.value)}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" 
                            placeholder="e.g., -122.4194"
                        />
                    </div>
                     <div>
                        <label htmlFor="target_alt" className="block text-sm font-medium text-gray-400">{t('mission_modal.target_alt')}</label>
                        <input 
                            type="text" 
                            id="target_alt" 
                            value={alt}
                            onChange={(e) => setAlt(e.target.value)}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" 
                            placeholder="e.g., 330"
                        />
                    </div>
                    <div className="pt-2">
                        <label htmlFor="preset_name" className="block text-sm font-medium text-gray-400">{t('mission_modal.save_as_preset')}</label>
                        <input
                            type="text"
                            id="preset_name"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                            placeholder="e.g., Survey Route Alpha"
                        />
                    </div>
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition">{t('mission_modal.cancel')}</button>
                    <button
                        onClick={handleSaveClick}
                        disabled={!newPresetName.trim() || !lat || !lon || !alt}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold text-white transition disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                        {t('mission_modal.save_preset')}
                    </button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold text-white transition">
                        {t('mission_modal.plan_and_acquire')}
                    </button>
                </div>
            </div>
        </div>
    );
};
