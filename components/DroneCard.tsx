
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Drone, DroneStatus, Threat, UnidentifiedFlyingObject } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { SignalStrengthIndicator } from './SignalStrengthIndicator';
import { DroneTypeIcon } from './DroneTypeIcon';
import { useTranslation } from '../contexts/I18nContext';
import { METERS_TO_FEET, MULTIPLIER_TO_MPH } from '../constants';
import { AIVisionIndicator } from './AIVisionIndicator';

interface DroneCardProps {
    droneId: string;
    drone: Drone;
    onSingleCommand: (droneId: string, action: string) => void;
    onShowMissionModal: (droneId: string) => void;
    isSelected: boolean;
    highSeverityAnomalyCount: number;
    healthScore: number | undefined;
    hasFlightPath: boolean;
    nickname?: string;
    onSetNickname: (droneId: string, nickname: string) => void;
    threats: Threat[];
    ufos: UnidentifiedFlyingObject[];
}

export const DroneCard: React.FC<DroneCardProps> = React.memo(({ droneId, drone, onSingleCommand, onShowMissionModal, isSelected, highSeverityAnomalyCount, healthScore = 100, hasFlightPath, nickname, onSetNickname, threats, ufos }) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(nickname || '');
    const inputRef = useRef<HTMLInputElement>(null);

    const getFormattedId = (id: string) => {
        const parts = id.split('-');
        if (parts.length === 2) {
            return `${parts[0]}-DRONE ${parts[1]}`;
        }
        return id.replace('_', ' ').toUpperCase();
    };
    
    const displayName = nickname || getFormattedId(droneId);

    useEffect(() => {
        setEditText(nickname || '');
    }, [nickname]);
    
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);


    const handleSave = () => {
        if (editText.trim()) {
            onSetNickname(droneId, editText.trim());
        } else {
            // If user clears the name, reset to original nickname or empty
            setEditText(nickname || '');
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setEditText(nickname || '');
            setIsEditing(false);
        }
    };


    const cardClasses = [
        "bg-gray-800",
        "rounded-lg",
        "shadow-lg",
        "p-5",
        "flex",
        "flex-col",
        "justify-between",
        "transition-all",
        "duration-300",
        "scroll-mt-4", // Add margin when scrolled into view
        isSelected ? "ring-2 ring-cyan-400 ring-offset-4 ring-offset-gray-900" : ""
    ].join(" ");
    
    const getHealthColor = (health: number) => {
        if (health < 30) return 'bg-red-500';
        if (health <= 55) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const healthColor = getHealthColor(healthScore);
    
    const isGrounded = drone.status === DroneStatus.GROUNDED;
    const isTransitional = drone.status === DroneStatus.LAUNCHING || drone.status === DroneStatus.LANDING;
    // A drone can only start a mission if a target is set and it is hovering at base, ready.
    const canStartMission = !!drone.mission_target && drone.status === DroneStatus.HOVERING_AT_BASE;
    const canReturnHome = !isGrounded;
    const canCancelMission = drone.mission_target && [DroneStatus.MISSION, DroneStatus.HOVERING_ON_TARGET].includes(drone.status);

    const displayCruisingSpeed = isGrounded ? "0.0" : (drone.cruisingSpeed * MULTIPLIER_TO_MPH).toFixed(1);

    const formatETA = (totalSeconds: number): string => {
        if (isNaN(totalSeconds) || totalSeconds < 0) {
            return `0m 0s`;
        }
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes}m ${seconds}s`;
    };

    const isEngaging = drone.droneType === 'Interceptor' && drone.status === DroneStatus.INTERCEPTING;
    
    const engagementTarget = useMemo(() => {
        if (!isEngaging) return null;
        if (drone.interceptTargetId) {
            return ufos.find(u => u.id === drone.interceptTargetId);
        }
        if (drone.interceptThreatId) {
            return threats.find(t => t.id === drone.interceptThreatId);
        }
        return null;
    }, [isEngaging, drone.interceptTargetId, drone.interceptThreatId, ufos, threats]);

    return (
        <div id={droneId} className={cardClasses}>
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                        <DroneTypeIcon type={drone.droneType} className="h-6 w-6 text-gray-400 flex-shrink-0" />
                        {isEditing ? (
                             <input
                                ref={inputRef}
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                className="text-xl font-bold bg-gray-700 text-white rounded px-2 py-1 w-full"
                            />
                        ) : (
                            <div className="flex items-center gap-2 group min-w-0">
                                <h3 className="text-xl font-bold text-cyan-400 truncate" title={displayName}>{displayName}</h3>
                                <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-white" title={t('drone_card.edit_nickname')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                     <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        {drone.status === DroneStatus.MISSION && (
                           <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                {t('drone_card.mission')}
                           </span>
                        )}
                         {highSeverityAnomalyCount > 0 && (
                           <span title={`${highSeverityAnomalyCount} high-severity anomalies detected`} className="flex items-center bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.01-1.742 3.01H4.42c-1.53 0-2.493-1.676-1.743-3.01l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                               </svg>
                                {highSeverityAnomalyCount}
                           </span>
                        )}
                    </div>
                </div>
                 <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-mono text-gray-500">{droneId}</p>
                    <div className="text-sm font-semibold">
                        <StatusIndicator status={drone.status} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-y-3 text-gray-400 text-sm">
                    <p><strong>{t('drone_card.location')}</strong></p>
                    <p className="text-right font-mono">{drone.location.lat.toFixed(4)}, {drone.location.lon.toFixed(4)}</p>
                    
                    <p><strong>{t('drone_card.altitude')}</strong></p>
                    <p className="text-right font-mono">{(drone.location.alt * METERS_TO_FEET).toFixed(0)} ft AGL</p>

                    {[DroneStatus.MISSION, DroneStatus.AI_OVERRIDE, DroneStatus.RETURNING_TO_BASE].includes(drone.status) && drone.eta != null && (
                        <>
                            <p><strong>{t('drone_card.eta')}</strong></p>
                            <p className={`text-right font-mono ${drone.status === DroneStatus.RETURNING_TO_BASE ? 'text-yellow-400' : 'text-green-400'} animate-pulse`}>{formatETA(drone.eta)}</p>
                        </>
                    )}

                     <p><strong>{t('drone_card.signal')}</strong></p>
                    <div className="flex justify-end items-center">
                        <SignalStrengthIndicator strength={drone.signal_strength} />
                    </div>

                    <p><strong>{t('drone_card.battery')}</strong></p>
                     <p className={`text-right font-bold ${drone.battery < 20 ? 'text-red-500' : 'text-green-400'}`}>
                        {drone.battery.toFixed(1)}%
                    </p>
                    
                    <p><strong>{t('drone_card.health')}</strong></p>
                    <div className="flex items-center justify-end gap-2">
                         <div className="w-full bg-gray-600 rounded-full h-2.5">
                            <div className={`${healthColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${healthScore}%` }}></div>
                        </div>
                        <span className="font-bold text-white w-10 text-right">{healthScore.toFixed(0)}%</span>
                    </div>

                    <p><strong>{t('drone_card.cruising_speed')}</strong></p>
                    <p className="text-right font-mono">{`${displayCruisingSpeed} mph`}</p>

                    <p><strong>{t('drone_card.ai_vision')}</strong></p>
                    <div className="flex justify-end items-center">
                        <AIVisionIndicator isTargetLocked={drone.target_locked} />
                    </div>

                    <p className="flex items-center col-span-1 pt-2">
                        <strong>{t('drone_card.target_acquired')}</strong>
                    </p>
                    <div className="flex justify-end items-center col-span-1 pt-2">
                        {(() => {
                            if (isEngaging && engagementTarget) {
                                return (
                                    <div className="text-right">
                                        <p className="flex items-center justify-end font-bold text-fuchsia-400 animate-pulse">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                            </svg>
                                            {t('drone_card.engaging')}
                                        </p>
                                        <p className="text-xs text-gray-400">{t('drone_card.target_id', { id: engagementTarget.id.slice(-6).toUpperCase() })}</p>
                                    </div>
                                );
                            }
                            if (isEngaging) { // Fallback if target not found
                                return (
                                    <span className="flex items-center font-bold text-fuchsia-400 animate-pulse">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                        {t('drone_card.engaging')}
                                    </span>
                                );
                            }
                            if (drone.target_locked) {
                                return (
                                    <span className="flex items-center font-bold text-green-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                        </svg>
                                        {t('drone_card.locked')}
                                    </span>
                                );
                            }
                            return (
                                <span className="flex items-center font-bold text-red-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 3a3 3 0 013 3v2H7V7a3 3 0 013-3z" />
                                    </svg>
                                    {t('drone_card.no_lock')}
                                </span>
                            );
                        })()}
                    </div>
                    {isEngaging && engagementTarget && (
                        <>
                            <div className="col-span-2 mt-3 pt-3 border-t border-gray-700">
                                <p className="font-semibold text-fuchsia-300 text-center uppercase tracking-wider">{t('drone_card.telemetry_match')}</p>
                            </div>
                            
                            <p className="text-sm">{t('drone_card.gps_match')}</p>
                            <p className="text-right font-mono font-bold text-sm text-green-400 flex items-center justify-end gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {t('drone_card.locked_on')}
                            </p>

                            <p className="text-sm">{t('drone_card.speed_match')}</p>
                            <p className="text-right font-mono font-bold text-sm text-green-400 flex items-center justify-end gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {t('drone_card.locked_on')}
                            </p>

                            <p className="text-sm">{t('drone_card.heading_match')}</p>
                            <p className="text-right font-mono font-bold text-sm text-green-400 flex items-center justify-end gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {t('drone_card.locked_on')}
                            </p>
                        </>
                    )}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => onSingleCommand(droneId, 'launch')}
                        disabled={!isGrounded}
                        className="bg-gray-700 hover:bg-green-600 text-xs font-bold py-2 px-3 rounded transition disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                        {t('drone_card.launch')}
                    </button>
                    <button 
                        onClick={() => onSingleCommand(droneId, 'start_mission')} 
                        disabled={!canStartMission}
                        className="bg-gray-700 hover:bg-purple-600 text-xs font-bold py-2 px-3 rounded transition disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                        {t('drone_card.start_mission')}
                    </button>
                    <button 
                        onClick={() => onShowMissionModal(droneId)} 
                        disabled={isTransitional}
                        className="bg-gray-700 hover:bg-cyan-600 text-xs font-bold py-2 px-3 rounded transition disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                        {t('drone_card.set_target')}
                    </button>
                    <button 
                        onClick={() => onSingleCommand(droneId, 'return_to_base')} 
                        disabled={!canReturnHome}
                        className="bg-gray-700 hover:bg-blue-600 text-xs font-bold py-2 px-3 rounded transition disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                        {t('drone_card.return_home')}
                    </button>
                </div>
                {canCancelMission && (
                     <button
                        onClick={() => onSingleCommand(droneId, 'cancel_mission')}
                        className="w-full mt-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                    >
                        {t('drone_card.cancel_mission')}
                    </button>
                )}
                 <button
                    onClick={() => onSingleCommand(droneId, 'replay_flight_path')}
                    disabled={!hasFlightPath}
                    className="w-full mt-3 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                    {t('drone_card.replay_flight_path')}
                </button>
                <button
                    onClick={() => onSingleCommand(droneId, 'run_diagnostics')}
                    className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                >
                    {t('drone_card.run_diagnostics')}
                </button>
            </div>
        </div>
    );
});
