import React from 'react';
import { CounterUASSystem } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface CounterUASPanelProps {
    system: CounterUASSystem | null;
    onCeaseFire: () => void;
}

const statusColors: Record<string, { bg: string; text: string; pulse: boolean }> = {
    standby: { bg: 'bg-gray-500', text: 'text-white', pulse: false },
    scanning: { bg: 'bg-blue-500', text: 'text-white', pulse: true },
    targeting: { bg: 'bg-yellow-500', text: 'text-black', pulse: true },
    engaging: { bg: 'bg-red-500', text: 'text-white', pulse: true },
    reloading: { bg: 'bg-indigo-500', text: 'text-white', pulse: false },
    disabled: { bg: 'bg-gray-700', text: 'text-gray-400', pulse: false },
};


export const CounterUASPanel: React.FC<CounterUASPanelProps> = ({ system, onCeaseFire }) => {
    const { t } = useTranslation();

    if (!system) {
        return null; // Or a loading state
    }

    const statusStyle = statusColors[system.status] || statusColors.disabled;
    const systemName = system.id.split('-')[0].toUpperCase();

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">{t('counter_uas.title_id', { id: systemName })}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Status Section */}
                <div className="flex flex-col items-center justify-center bg-gray-900 p-4 rounded-lg">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">{t('counter_uas.status')}</span>
                    <span className={`mt-2 px-4 py-2 text-lg font-bold rounded-full ${statusStyle.bg} ${statusStyle.text} ${statusStyle.pulse ? 'animate-pulse' : ''}`}>
                        {t(`counter_uas.status.${system.status}`)}
                    </span>
                </div>

                {/* Ammo Section */}
                <div className="flex flex-col items-center justify-center bg-gray-900 p-4 rounded-lg">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">{t('counter_uas.ammo')}</span>
                    <p className="text-3xl font-bold mt-1 text-white">
                        {system.ammo} <span className="text-lg text-gray-500">/ {system.maxAmmo}</span>
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                        <div className="bg-cyan-400 h-2.5 rounded-full" style={{ width: `${(system.ammo / system.maxAmmo) * 100}%` }}></div>
                    </div>
                </div>

                {/* Target Section */}
                <div className="flex flex-col items-center justify-center bg-gray-900 p-4 rounded-lg">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">{t('counter_uas.target')}</span>
                    <span className="mt-2 text-lg font-mono font-bold text-red-400 truncate">
                        {system.currentTargetId ? system.currentTargetId.split('_').pop()?.toUpperCase() : '---'}
                    </span>
                </div>

            </div>
             <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 p-3 rounded-lg flex items-center justify-between">
                    <label htmlFor={`uas-mode-${system.id}`} className="text-sm font-medium text-gray-400">{t('counter_uas.mode')}:</label>
                    <select
                        id={`uas-mode-${system.id}`}
                        value={system.mode}
                        disabled // Disabled for now as per plan
                        className="bg-gray-700 text-white rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-not-allowed"
                    >
                        <option value="human_in_loop">{t('counter_uas.mode.human_in_loop')}</option>
                        <option value="autonomous">{t('counter_uas.mode.autonomous')}</option>
                        <option value="manual">{t('counter_uas.mode.manual')}</option>
                    </select>
                </div>
                 <button 
                    onClick={onCeaseFire}
                    disabled={system.status !== 'targeting' && system.status !== 'engaging'}
                    className="bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-lg transition text-lg tracking-wider disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {t('counter_uas.cease_fire')}
                </button>
            </div>
        </div>
    );
};