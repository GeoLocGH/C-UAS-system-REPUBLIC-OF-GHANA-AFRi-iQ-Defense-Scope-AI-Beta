import React, { useState, useMemo } from 'react';
import { AITargetDesignationRequest, Drones, Drone, DroneStatus } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface AITargetDesignationsProps {
    designations: AITargetDesignationRequest[];
    onRespond: (requestId: string, response: { approved: boolean; droneId?: string }) => void;
    onSelect: (designationId: string) => void;
    getDroneDisplayName: (droneId: string) => string;
    drones: Drones;
}

const TargetCard: React.FC<{
    designation: AITargetDesignationRequest;
    onRespond: (requestId: string, response: { approved: boolean; droneId?: string }) => void;
    onSelect: (designationId: string) => void;
    getDroneDisplayName: (droneId: string) => string;
    drones: Drones;
}> = ({ designation, onRespond, onSelect, getDroneDisplayName, drones }) => {
    const { t } = useTranslation();
    const [overrideDroneId, setOverrideDroneId] = useState(designation.suggestedDroneId);

    const suitableDrones = useMemo(() => {
        return Object.entries(drones).filter(([, drone]: [string, Drone]) =>
            (drone.droneType === 'Assault' || drone.droneType === 'Interceptor') &&
            (drone.status === DroneStatus.GROUNDED || drone.status === DroneStatus.HOVERING_AT_BASE)
        );
    }, [drones]);
    
    // Ensure the originally suggested drone is in the list, even if its status has changed
    const droneOptions = useMemo(() => {
        const options = [...suitableDrones];
        if (!options.some(([id]) => id === designation.suggestedDroneId)) {
            const suggestedDrone = drones[designation.suggestedDroneId];
            if (suggestedDrone) {
                options.unshift([designation.suggestedDroneId, suggestedDrone]);
            }
        }
        return options;
    }, [suitableDrones, designation.suggestedDroneId, drones]);

    const handleConfirm = () => {
        onRespond(designation.id, { approved: true, droneId: overrideDroneId });
    };

    const handleDeny = () => {
        onRespond(designation.id, { approved: false });
    };

    return (
        <div
            className="bg-gray-900 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 shadow-md border-l-4 border-cyan-500 cursor-pointer hover:bg-gray-800/50"
            onClick={() => onSelect(designation.id)}
        >
            <div className="flex-grow w-full">
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
                    <span className="font-semibold text-gray-400 text-right">{t('ai_targets.source')}</span>
                    <span className="text-cyan-400 font-bold">{`${designation.sourceType.toUpperCase()}: ${designation.sourceId.slice(-6)}`}</span>

                    <span className="font-semibold text-gray-400 text-right">{t('ai_targets.reason')}</span>
                    <span className="text-gray-300">{designation.reason}</span>
                </div>
            </div>

            <div className="flex-shrink-0 flex flex-col items-stretch gap-3 w-full md:w-[320px]">
                <div className="flex flex-col gap-2 bg-gray-800 p-3 rounded-md">
                    <div className="text-sm">
                        <span className="font-semibold text-gray-400">{t('ai_targets.suggested_drone')} </span>
                        <span className="text-white font-bold">{getDroneDisplayName(designation.suggestedDroneId)}</span>
                    </div>
                    <select
                        value={overrideDroneId}
                        onChange={(e) => setOverrideDroneId(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent card click when interacting with dropdown
                        className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                        aria-label={t('ai_targets.override_drone')}
                    >
                        {droneOptions.map(([id, drone]) => (
                             <option key={id} value={id}>
                                {getDroneDisplayName(id)} ({t(`status.${drone.status}`)})
                            </option>
                        ))}
                    </select>
                </div>
                 <div className="flex items-center gap-3 w-full">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
                    >
                        {t('ai_targets.confirm')}
                    </button>
                    <button
                         onClick={(e) => { e.stopPropagation(); handleDeny(); }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition"
                    >
                        {t('ai_targets.deny')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AITargetDesignations: React.FC<AITargetDesignationsProps> = ({ designations, onRespond, onSelect, getDroneDisplayName, drones }) => {
    const { t } = useTranslation();

    if (designations.length === 0) {
        return null;
    }
    
    return (
        <div className="p-6">
            <div className="space-y-4">
                {designations.map(designation => (
                    <TargetCard
                        key={designation.id}
                        designation={designation}
                        onRespond={onRespond}
                        onSelect={onSelect}
                        getDroneDisplayName={getDroneDisplayName}
                        drones={drones}
                    />
                ))}
            </div>
        </div>
    );
};