import React, { useState } from 'react';
import { DroneStatus, type Drones, type DroneNicknames, type Drone } from '../types';
import { useTranslation } from '../contexts/I18nContext';
import { AIVisionIndicator } from './AIVisionIndicator';

interface VideoFeedProps {
    droneId: string;
    displayName: string;
    drone: Drone;
    onClick?: () => void;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ droneId, displayName, drone, onClick }) => {
    const { t } = useTranslation();
    const imageUrl = `https://placehold.co/600x400/1a202c/e2e8f0?text=${encodeURIComponent(displayName)}%0AFeed%20Live`;
    const isClickable = !!onClick;

    return (
        <div 
            onClick={onClick}
            className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden ring-1 ring-gray-700 ${isClickable ? 'cursor-pointer hover:ring-cyan-400 transition' : ''}`}
        >
            <img src={imageUrl} alt={`Video feed from ${displayName}`} className="w-full h-full object-cover" />
             {/* AI Vision Overlay */}
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm p-1.5 rounded-md">
                <AIVisionIndicator isTargetLocked={drone.target_locked} size="small" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-white font-semibold truncate">{displayName}</h4>
                    <div className="flex items-center gap-1 text-xs text-red-500 font-bold animate-pulse">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span>{t('video_feeds.rec')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface VideoFeedsPanelProps {
    drones: Drones;
    droneNicknames: DroneNicknames;
}

export const VideoFeedsPanel: React.FC<VideoFeedsPanelProps> = ({ drones, droneNicknames }) => {
    const { t } = useTranslation();
    const [expandedDroneId, setExpandedDroneId] = useState<string | null>(null);
    
    const getDroneDisplayName = (droneId: string) => {
        if (droneNicknames[droneId]) {
            return droneNicknames[droneId];
        }
        const parts = droneId.split('-');
        if (parts.length === 2) {
            return `${parts[0]}-DRONE ${parts[1]}`;
        }
        return droneId.replace('_', ' ').toUpperCase();
    };

    const missionDrones = React.useMemo(() => 
        Object.entries(drones).filter(
            ([, drone]: [string, Drone]) => {
                const isStandardMissionStatus = [DroneStatus.MISSION, DroneStatus.HOVERING_ON_TARGET, DroneStatus.AI_OVERRIDE].includes(drone.status);
                const isInterceptorDispatched = drone.droneType === 'Interceptor' && [DroneStatus.LAUNCHING, DroneStatus.INTERCEPTING].includes(drone.status);
                return isStandardMissionStatus || isInterceptorDispatched;
            }
        ),
    [drones]);

    const gridColsClass = 
        missionDrones.length >= 9 ? 'grid-cols-3' : 
        missionDrones.length >= 2 ? 'grid-cols-2' : 
        'grid-cols-1';
        
    const expandedDrone = expandedDroneId ? missionDrones.find(([id]) => id === expandedDroneId) : null;

    return (
        <div className="h-full min-h-[450px] flex flex-col p-6">
            {expandedDrone ? (
                <div className="flex-grow relative">
                    <VideoFeed
                        droneId={expandedDrone[0]}
                        drone={expandedDrone[1]}
                        displayName={getDroneDisplayName(expandedDrone[0])}
                    />
                    <button
                        onClick={() => setExpandedDroneId(null)}
                        className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-2 hover:bg-red-600 transition"
                        aria-label={t('video_feeds.close_expanded')}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            ) : missionDrones.length > 0 ? (
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className={`grid ${gridColsClass} gap-4`}>
                        {missionDrones.map(([id, drone]) => (
                            <VideoFeed
                                key={id}
                                droneId={id}
                                drone={drone}
                                displayName={getDroneDisplayName(id)}
                                onClick={() => setExpandedDroneId(id)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center text-gray-500">
                    <p>{t('video_feeds.no_feeds')}</p>
                </div>
            )}
        </div>
    );
};