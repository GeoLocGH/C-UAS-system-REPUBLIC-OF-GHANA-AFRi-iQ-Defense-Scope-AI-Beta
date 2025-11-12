
import React from 'react';
import type { FlightPath } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface ReplayControlsProps {
    droneId: string;
    path: FlightPath;
    progress: number;
    isPlaying: boolean;
    speed: number;
    onPlayPause: () => void;
    onClose: () => void;
    onProgressChange: (progress: number) => void;
    onSpeedChange: (speed: number) => void;
    getDroneDisplayName: (droneId: string) => string;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
    droneId,
    path,
    progress,
    isPlaying,
    speed,
    onPlayPause,
    onClose,
    onProgressChange,
    onSpeedChange,
    getDroneDisplayName,
}) => {
    const { t } = useTranslation();
    const droneName = getDroneDisplayName(droneId);

    const formatTimestamp = (timestamp: number) => {
        if (!timestamp) return '00:00:00';
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    const startTime = path[0]?.timestamp;
    const endTime = path[path.length - 1]?.timestamp;

    const progressPercent = path.length > 1 ? (progress / (path.length - 1)) * 100 : 0;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm text-white p-4 z-40 shadow-2xl-top animate-slide-in-bottom">
            <div className="container mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-shrink-0">
                        <h3 className="text-lg font-bold">{t('replay.title', { droneName })}</h3>
                    </div>

                    <div className="flex-grow w-full md:w-auto flex items-center gap-4">
                        <button onClick={onPlayPause} className="p-2 bg-gray-700 hover:bg-cyan-600 rounded-full transition" aria-label={isPlaying ? t('replay.pause') : t('replay.play')}>
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                        <div className="flex-grow flex items-center gap-2">
                            <span className="text-xs font-mono">{formatTimestamp(startTime)}</span>
                            <input
                                type="range"
                                min="0"
                                max={path.length > 0 ? path.length - 1 : 0}
                                value={progress}
                                onChange={(e) => onProgressChange(parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #2dd4bf ${progressPercent}%, #374151 ${progressPercent}%)`
                                }}
                            />
                            <span className="text-xs font-mono">{formatTimestamp(endTime)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm">{t('replay.speed')}</span>
                             <select
                                value={speed}
                                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                                className="bg-gray-700 rounded-md py-1 px-2 text-sm"
                            >
                                <option value="0.5">0.5x</option>
                                <option value="1">1x</option>
                                <option value="2">2x</option>
                                <option value="4">4x</option>
                            </select>
                        </div>
                         <button onClick={onClose} className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition" aria-label={t('replay.close')}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
