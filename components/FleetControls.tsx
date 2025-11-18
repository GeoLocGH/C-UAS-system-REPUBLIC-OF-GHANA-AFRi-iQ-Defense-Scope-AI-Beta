import React from 'react';
import { Drones, DroneStatus } from '../types';
import { useTranslation } from '../contexts/I18nContext';
import { METERS_TO_FEET, FEET_TO_METERS, MULTIPLIER_TO_MPH, MPH_TO_MULTIPLIER } from '../constants';

interface FleetControlsProps {
    onFleetCommand: (action: string) => void;
    onShowMissionModal: () => void;
    onIndividualMissionParamsChange: (droneId: string, params: { speed?: number; altitude?: number }) => void;
    drones: Drones;
    selectedDroneId: string | null;
    getDroneDisplayName: (droneId: string) => string;
}

// Default values in API units
const DEFAULT_CRUISING_SPEED_MULTIPLIER = 5.0;
const DEFAULT_CRUISING_ALTITUDE_METERS = 100;

export const FleetControls: React.FC<FleetControlsProps> = ({ 
    onFleetCommand, 
    onShowMissionModal,
    onIndividualMissionParamsChange,
    drones,
    selectedDroneId,
    getDroneDisplayName,
}) => {
    const { t } = useTranslation();
    const selectedDrone = selectedDroneId ? drones[selectedDroneId] : null;
    
    // Mission parameters can be controlled during these active states.
    const isControlEnabled = selectedDrone?.status === DroneStatus.MISSION 
                          || selectedDrone?.status === DroneStatus.HOVERING_ON_TARGET
                          || selectedDrone?.status === DroneStatus.RETURNING_TO_BASE
                          || selectedDrone?.status === DroneStatus.HOVERING_AT_BASE;

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (selectedDroneId) {
            const speedMph = parseFloat(e.target.value);
            onIndividualMissionParamsChange(selectedDroneId, { speed: speedMph * MPH_TO_MULTIPLIER });
        }
    };

    const handleAltitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (selectedDroneId) {
            const altitudeFt = parseInt(e.target.value, 10);
            onIndividualMissionParamsChange(selectedDroneId, { altitude: altitudeFt * FEET_TO_METERS });
        }
    };

    const handleResetSpeed = () => {
        if (selectedDroneId) {
            onIndividualMissionParamsChange(selectedDroneId, { speed: DEFAULT_CRUISING_SPEED_MULTIPLIER });
        }
    };

    const handleResetAltitude = () => {
        if (selectedDroneId) {
            onIndividualMissionParamsChange(selectedDroneId, { altitude: DEFAULT_CRUISING_ALTITUDE_METERS });
        }
    };
    
    const displaySpeedMph = selectedDrone ? (selectedDrone.cruisingSpeed * MULTIPLIER_TO_MPH).toFixed(1) : '0.0';
    const displayAltitudeFt = selectedDrone ? (selectedDrone.cruisingAltitude * METERS_TO_FEET).toFixed(0) : '0';


    return (
        <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => onFleetCommand('launch')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105">{t('fleet_controls.launch_all')}</button>
                <button onClick={() => onFleetCommand('land')} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105">{t('fleet_controls.land_all')}</button>
                <button onClick={() => onFleetCommand('return_to_base')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105">{t('fleet_controls.return_all')}</button>
                <button onClick={onShowMissionModal} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105">{t('fleet_controls.set_fleet_mission')}</button>
            </div>
            
            {selectedDrone && (
                <div className="mt-6 pt-4 border-t border-gray-700 transition-opacity duration-300">
                    <h3 className="text-xl font-semibold mb-3">{t('fleet_controls.parameters_for', { droneName: getDroneDisplayName(selectedDroneId!) })}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="cruising-speed" className="block text-sm font-medium text-gray-400 mb-1">
                                {t('fleet_controls.cruising_speed', { speed: displaySpeedMph })}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="cruising-speed"
                                    type="range"
                                    min={0.5 * MULTIPLIER_TO_MPH}
                                    max={10 * MULTIPLIER_TO_MPH}
                                    step="1"
                                    value={selectedDrone.cruisingSpeed * MULTIPLIER_TO_MPH}
                                    onChange={handleSpeedChange}
                                    disabled={!isControlEnabled}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                                />
                                <button onClick={handleResetSpeed} disabled={!isControlEnabled} className="text-xs bg-gray-600 hover:bg-gray-700 rounded-md px-2 py-1 transition disabled:opacity-50 disabled:cursor-not-allowed">{t('fleet_controls.reset')}</button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="cruising-altitude" className="block text-sm font-medium text-gray-400 mb-1">
                                {t('fleet_controls.cruising_altitude', { altitude: displayAltitudeFt })}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="cruising-altitude"
                                    type="range"
                                    min={50 * METERS_TO_FEET}
                                    max={500 * METERS_TO_FEET}
                                    step="10"
                                    value={selectedDrone.cruisingAltitude * METERS_TO_FEET}
                                    onChange={handleAltitudeChange}
                                    disabled={!isControlEnabled}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                                />
                                <button onClick={handleResetAltitude} disabled={!isControlEnabled} className="text-xs bg-gray-600 hover:bg-gray-700 rounded-md px-2 py-1 transition disabled:opacity-50 disabled:cursor-not-allowed">{t('fleet_controls.reset')}</button>
                            </div>
                        </div>
                    </div>
                    {!isControlEnabled && (
                        <p className="text-xs text-gray-500 mt-2 text-center md:text-left">
                            {t('fleet_controls.parameters_info')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};