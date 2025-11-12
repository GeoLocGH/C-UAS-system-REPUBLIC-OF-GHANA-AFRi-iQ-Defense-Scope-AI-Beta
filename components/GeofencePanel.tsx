import React, { useState } from 'react';
import { Geofence } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface GeofencePanelProps {
    geofences: Geofence[];
    onStartDrawing: () => void;
    onDelete: (id: string) => void;
}

export const GeofencePanel: React.FC<GeofencePanelProps> = ({ geofences, onStartDrawing, onDelete }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(t('geofence.confirm_delete', { name }))) {
            onDelete(id);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
            <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-3">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15.05 4.95a7 7 0 10-10.1 10.1 7 7 0 0010.1-10.1zM10 16a6 6 0 110-12 6 6 0 010 12z" />
                        <path d="M10 6a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 6zM10 10a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 10z" transform="rotate(45 10 10)" />
                    </svg>
                    <h2 className="text-2xl font-semibold">{t('geofence.title')}</h2>
                </div>
                <button aria-expanded={isOpen}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
            {isOpen && (
                <div className="border-t border-gray-700 pt-4">
                    <button onClick={onStartDrawing} className="w-full mb-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105">
                        {t('geofence.create_new')}
                    </button>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {geofences.length > 0 ? geofences.map(fence => (
                            <div key={fence.id} className="bg-gray-900 p-3 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: fence.color }}></span>
                                    <span className="font-semibold">{fence.name}</span>
                                    {fence.interceptorDefense && (
                                        <div title={t('geofence.panel.defense_active_tooltip')}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5.002L10 18.451l7.834-13.449A11.954 11.954 0 0110 1.944zM10 4.345L4.82 12.915A9.951 9.951 0 0010 15.345a9.951 9.951 0 005.18-2.43L10 4.345z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => handleDelete(fence.id, fence.name)} className="text-gray-500 hover:text-red-500 transition" title={t('geofence.delete_zone')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-4">{t('geofence.no_zones')}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};