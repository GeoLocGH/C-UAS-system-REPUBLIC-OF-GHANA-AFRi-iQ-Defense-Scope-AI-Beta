
import React, { useState, useMemo } from 'react';
import { DroneCard } from './DroneCard';
import { Drone, Drones, DroneStatus, FlightPaths, DroneNicknames, Threat, UnidentifiedFlyingObject } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface DroneFleetProps {
    drones: Drones;
    error: string | null;
    onSingleCommand: (droneId: string, action: string) => void;
    onShowMissionModal: (droneId: string) => void;
    selectedDroneId: string | null;
    highSeverityCounts: Record<string, number>;
    healthScores: Record<string, number>;
    flightPaths: FlightPaths;
    droneNicknames: DroneNicknames;
    onSetNickname: (droneId: string, nickname: string) => void;
    onGroupCommand: (droneIds: string[], action: string) => void;
    threats: Threat[];
    ufos: UnidentifiedFlyingObject[];
}

const TYPE_ORDER: Drone['droneType'][] = ['Assault', 'Interceptor', 'Recon'];

const missionStatuses: DroneStatus[] = [
    DroneStatus.MISSION,
    DroneStatus.HOVERING_ON_TARGET,
    DroneStatus.AI_OVERRIDE,
    DroneStatus.INTERCEPTING,
    DroneStatus.EVADING,
];

const missionStatusOrder: DroneStatus[] = [
    DroneStatus.INTERCEPTING,
    DroneStatus.AI_OVERRIDE,
    DroneStatus.EVADING,
    DroneStatus.MISSION,
    DroneStatus.HOVERING_ON_TARGET,
];


export const DroneFleet: React.FC<DroneFleetProps> = ({ 
    drones, 
    error, 
    onSingleCommand, 
    onShowMissionModal, 
    selectedDroneId, 
    highSeverityCounts, 
    healthScores, 
    flightPaths,
    droneNicknames,
    onSetNickname,
    onGroupCommand,
    threats,
    ufos
}) => {
    const { t } = useTranslation();
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        Assault: true,
        Interceptor: true,
        Recon: true,
    });

    const groupedDrones = useMemo(() => {
        const onMission: {id: string, drone: Drone}[] = [];
        const byType: Partial<Record<Drone['droneType'], {id: string, drone: Drone}[]>> = {};

        for (const id in drones) {
            const drone = drones[id];
            if (missionStatuses.includes(drone.status)) {
                onMission.push({ id, drone });
            } else {
                if (!byType[drone.droneType]) {
                    byType[drone.droneType] = [];
                }
                byType[drone.droneType]!.push({ id, drone });
            }
        }

        onMission.sort((a, b) => {
            return missionStatusOrder.indexOf(a.drone.status) - missionStatusOrder.indexOf(b.drone.status);
        });

        return { onMission, byType };
    }, [drones]);

    const orderedTypes = useMemo(() => 
        TYPE_ORDER.filter(type => groupedDrones.byType[type] && groupedDrones.byType[type]!.length > 0),
    [groupedDrones]);

    const toggleGroup = (type: string) => {
        setExpandedGroups(prev => ({...prev, [type]: !prev[type]}));
    };
    
    if (error) {
        return (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 my-8">
                <div className="text-center text-red-400 bg-red-900 bg-opacity-50 p-6 rounded-lg">
                    <h3 className="font-bold text-xl">{t('drone_fleet.connection_error.title')}</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }
    
    if (Object.keys(drones).length === 0 && !error) {
        return (
             <div className="bg-gray-800 rounded-lg shadow-lg p-6 my-8">
                <div className="text-center text-gray-500 p-6">
                    <h3 className="font-bold text-xl">{t('drone_fleet.awaiting_signals.title')}</h3>
                    <p>{t('drone_fleet.awaiting_signals.body')}</p>
                </div>
            </div>
        )
    }

    const returnableStatuses: DroneStatus[] = [
        DroneStatus.MISSION,
        DroneStatus.HOVERING_ON_TARGET,
        DroneStatus.HOVERING_AT_BASE,
        DroneStatus.EVADING,
        DroneStatus.AI_OVERRIDE,
        DroneStatus.INTERCEPTING
    ];
    
    const onMissionDrones = groupedDrones.onMission;

    return (
        <div id="drone-fleet-groups">
            {onMissionDrones.length > 0 && (
                <div className="mb-6 bg-gray-800 rounded-lg shadow-lg">
                    <div className="bg-purple-900/50 rounded-t-lg p-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold text-purple-300">{t('drone_fleet.on_mission')} ({onMissionDrones.length})</h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                        {onMissionDrones.map(({ id, drone }) => (
                            <DroneCard 
                                key={id}
                                droneId={id}
                                drone={drone}
                                onSingleCommand={onSingleCommand}
                                onShowMissionModal={onShowMissionModal}
                                isSelected={id === selectedDroneId}
                                highSeverityAnomalyCount={highSeverityCounts[id] || 0}
                                healthScore={healthScores[id]}
                                hasFlightPath={!!flightPaths[id] && flightPaths[id].length > 1}
                                nickname={droneNicknames[id]}
                                onSetNickname={onSetNickname}
                                threats={threats}
                                ufos={ufos}
                            />
                        ))}
                    </div>
                </div>
            )}

            {orderedTypes.map(type => {
                const dronesInGroup = groupedDrones.byType[type]!;
                if (dronesInGroup.length === 0) return null;

                const groupName = `${type}s`;
                const isExpanded = expandedGroups[type];

                const groundedDronesInGroup = dronesInGroup.filter(d => d.drone.status === DroneStatus.GROUNDED);
                const returnableDronesInGroup = dronesInGroup.filter(d => returnableStatuses.includes(d.drone.status));

                const canLaunch = groundedDronesInGroup.length > 0;
                const canReturn = returnableDronesInGroup.length > 0;
                
                return (
                    <div key={type} className="mb-6 bg-gray-800 rounded-lg shadow-lg">
                        <div 
                            className="bg-gray-700 rounded-t-lg p-3 flex justify-between items-center cursor-pointer"
                            onClick={() => toggleGroup(type)}
                        >
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-semibold">{groupName} ({dronesInGroup.length})</h3>
                                <button>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {canLaunch && <button onClick={(e) => { e.stopPropagation(); onGroupCommand(groundedDronesInGroup.map(d => d.id), 'launch'); }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition">{t('drone_fleet.launch_group')}</button>}
                                {canReturn && <button onClick={(e) => { e.stopPropagation(); onGroupCommand(returnableDronesInGroup.map(d => d.id), 'return_to_base'); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition">{t('drone_fleet.return_group')}</button>}
                            </div>
                        </div>
                        {isExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                                {dronesInGroup.sort((a,b) => a.id.localeCompare(b.id)).map(({ id, drone }) => (
                                    <DroneCard 
                                        key={id}
                                        droneId={id}
                                        drone={drone}
                                        onSingleCommand={onSingleCommand}
                                        onShowMissionModal={onShowMissionModal}
                                        isSelected={id === selectedDroneId}
                                        highSeverityAnomalyCount={highSeverityCounts[id] || 0}
                                        healthScore={healthScores[id]}
                                        hasFlightPath={!!flightPaths[id] && flightPaths[id].length > 1}
                                        nickname={droneNicknames[id]}
                                        onSetNickname={onSetNickname}
                                        threats={threats}
                                        ufos={ufos}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
