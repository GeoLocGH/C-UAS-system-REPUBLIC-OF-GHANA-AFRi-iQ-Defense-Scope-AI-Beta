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

    const threatPercent = system.currentTargetInfo ? Math.min(100, (system.currentTargetInfo.threatScore / 4.0) * 100) : 0;
    const getThreatBarColor = () => {
        if (threatPercent > 75) return 'bg-red-500';
        if (threatPercent > 40) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">{t('counter_uas.title_id', { id: systemName })}</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                
                {/* Status Section */}
                <div className="md:col-span-1 flex flex-col items-center justify-center bg-gray-900 p-4 rounded-lg">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">{t('counter_uas.status')}</span>
                    <span className={`mt-2 px-4 py-2 text-lg font-bold rounded-full ${statusStyle.bg} ${statusStyle.text} ${statusStyle.pulse ? 'animate-pulse' : ''}`}>
                        {t(`counter_uas.status.${system.status}`)}
                    </span>
                </div>

                {/* Ammo Section */}
                <div className="md:col-span-1 flex flex-col items-center justify-center bg-gray-900 p-4 rounded-lg">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">{t('counter_uas.ammo')}</span>
                    <p className="text-3xl font-bold mt-1 text-white">
                        {system.ammo} <span className="text-lg text-gray-500">/ {system.maxAmmo}</span>
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                        <div className="bg-cyan-400 h-2.5 rounded-full" style={{ width: `${(system.ammo / system.maxAmmo) * 100}%` }}></div>
                    </div>
                </div>

                {/* Target Section */}
                <div className="md:col-span-3 flex flex-col justify-center bg-gray-900 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">{t('counter_uas.target_lock')}</span>
                        <span className="text-lg font-mono font-bold text-red-400 truncate">
                            {system.currentTargetInfo ? system.currentTargetInfo.id.split('_').pop()?.toUpperCase() : '---'}
                        </span>
                    </div>
                    {system.currentTargetInfo ? (
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-xs text-gray-500">{t('counter_uas.target_dist')}</p>
                                <p className="text-lg font-bold text-white">{(system.currentTargetInfo.distance / 1000).toFixed(1)} km</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('counter_uas.target_speed')}</p>
                                <p className="text-lg font-bold text-white">{system.currentTargetInfo.speed.toFixed(0)} km/h</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">{t('counter_uas.target_threat')}</p>
                                <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                                    <div className={`${getThreatBarColor()} h-2.5 rounded-full`} style={{ width: `${threatPercent}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 mt-4">{t('counter_uas.no_target')}</div>
                    )}
                </div>

            </div>
             <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 p-3 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-400">{t('counter_uas.mode')}:</span>
                    <span className="bg-gray-700 text-white font-semibold rounded-md py-1.5 px-3">
                        {t(`counter_uas.mode.${system.mode}`)}
                    </span>
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