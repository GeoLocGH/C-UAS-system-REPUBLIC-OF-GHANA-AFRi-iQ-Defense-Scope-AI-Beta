

import React from 'react';
import type { UserRole } from '../types';
import { ToggleSwitch } from './ToggleSwitch';
import { useTranslation } from '../contexts/I18nContext';

interface SettingsPanelProps {
    port: string;
    setPort: (port: string) => void;
    userRole: UserRole;
    onRoleChange: (role: UserRole) => void;
    showGeofences: boolean;
    onShowGeofencesChange: (show: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ port, setPort, userRole, onRoleChange, showGeofences, onShowGeofencesChange }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed bottom-4 right-4 bg-gray-800 p-3 rounded-lg shadow-lg flex flex-col gap-3">
            <div>
                <label htmlFor="role-select" className="text-sm text-gray-400 mr-2">{t('settings.user_role')}</label>
                <select 
                    id="role-select" 
                    value={userRole} 
                    onChange={(e) => onRoleChange(e.target.value as UserRole)}
                    className="bg-gray-700 text-white w-32 text-center rounded-md px-2 py-1"
                >
                    <option value="Operator">{t('settings.role.operator')}</option>
                    <option value="Admin">{t('settings.role.admin')}</option>
                </select>
            </div>
            {userRole === 'Admin' && (
                <div>
                    <label htmlFor="api-port" className="text-sm text-gray-400 mr-2">{t('settings.api_port')}</label>
                    <input 
                        type="text" 
                        id="api-port" 
                        value={port} 
                        onChange={(e) => setPort(e.target.value)}
                        className="bg-gray-700 text-white w-32 text-center rounded-md px-2 py-1"
                    />
                </div>
            )}
            <div className="flex items-center justify-between">
                <label htmlFor="geofence-toggle" className="text-sm text-gray-400">{t('settings.show_geofences')}</label>
                <ToggleSwitch id="geofence-toggle" isEnabled={showGeofences} onToggle={() => onShowGeofencesChange(!showGeofences)} />
            </div>
        </div>
    );
};