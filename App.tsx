import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { FleetControls } from './components/FleetControls';
import { DroneFleet } from './components/DroneFleet';
import { MissionModal } from './components/MissionModal';
import { CommandLog } from './components/CommandLog';
import { fetchDroneStatus, postCommand, fetchAnomalies, initiateAnomalyRepair, runDroneDiagnostics, fetchAIActionRequests, postAIActionResponse, postAIActionOverride, fetchAITargetDesignations, postAITargetResponse, fetchFlightAnalysisSuggestions, postFlightSuggestionResponse, fetchThreats, postThreatResponse, fetchUFOs, setCommandLogCallback, updateGeofenceConfigForAI, fetchEliminationEvents, fetchCounterUASStatus, postCounterUASCommand } from './services/api';
import { DroneStatus, GeofenceObjectType, ThreatType, Location, AIAction, CounterUASSystem } from './types';
import { MULTIPLIER_TO_MPH } from './constants';
import type { Drone, Drones, TelemetryHistory, LogEntry, LogStatus, FlightPaths, AlertPreferences, Anomaly, MissionPreset, DiagnosticsReport, UserRole, DroneNicknames, GroupCommandTarget, AIActionRequest, AITargetDesignationRequest, FlightAnalysisSuggestion, DiagnosticCheck, Threat, Geofence, UnidentifiedFlyingObject, GeofenceEvent, EliminationEvent } from './types';
import { DroneMap } from './components/DroneMap';
import { VideoFeedsPanel } from './components/TelemetryChart';
import { AudioAlerts } from './components/AudioAlerts';
import { playConfiguredSound } from './services/audio';
import { speak, getAvailableVoices } from './services/tts';
import { AnomalyFeed } from './components/AnomalyFeed';
import { ThreatFeed } from './components/ThreatFeed';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { PreFlightChecklistModal } from './components/PreFlightChecklistModal';
import { ReplayControls } from './components/ReplayControls';
import { SettingsPanel } from './components/SettingsPanel';
import { AIActionRequests } from './components/AIActionRequests';
import { AITargetDesignations } from './components/AITargetDesignations';
import { FlightPathAnalysis } from './components/FlightPathAnalysis';
import { AICommAssistant } from './components/AICommAssistant';
import { GeofencePanel } from './components/GeofencePanel';
import { GeofenceModal } from './components/GeofenceModal';
import { GeofenceEventLog } from './components/GeofenceEventLog';
import { useTranslation } from './contexts/I18nContext';
import { CounterUASPanel } from './components/CounterUASPanel';
import { WindowFrame } from './components/WindowFrame';

const CONNECTION_FAIL_THRESHOLD = 3;
const HEALTH_THRESHOLD = 70; // Health score below which is considered a warning

// Utility function for geofence detection
const isPointInPolygon = (point: { lat: number; lon: number }, polygon: { lat: number; lon: number }[]): boolean => {
    const x = point.lat, y = point.lon;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lon;
        const xj = polygon[j].lat, yj = polygon[j].lon;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// Utility function for comparing locations with a tolerance
const locationMatches = (l1: Location, l2: Location, tolerance = 1e-5): boolean => {
    // A slightly larger tolerance for altitude might be needed depending on precision
    const altTolerance = tolerance * 100; 
    return Math.abs(l1.lat - l2.lat) < tolerance &&
           Math.abs(l1.lon - l2.lon) < tolerance &&
           Math.abs(l1.alt - l2.alt) < altTolerance;
};


export default function App() {
    const [drones, setDrones] = useState<Drones>({});
    const [apiPort, setApiPort] = useState<string>('8080');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [modalTarget, setModalTarget] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [telemetryHistory, setTelemetryHistory] = useState<TelemetryHistory>({});
    const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
    const [commandLog, setCommandLog] = useState<LogEntry[]>([]);
    const [flightPaths, setFlightPaths] = useState<FlightPaths>({});
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
    const [threats, setThreats] = useState<Threat[]>([]);
    const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
    const [healthScores, setHealthScores] = useState<Record<string, number>>({});
    const [missionPresets, setMissionPresets] = useState<MissionPreset[]>([]);
    const [userRole, setUserRole] = useState<UserRole>('Operator');
    const [droneNicknames, setDroneNicknames] = useState<DroneNicknames>({});
    const [aiActionRequests, setAiActionRequests] = useState<AIActionRequest[]>([]);
    const [aiTargetDesignations, setAiTargetDesignations] = useState<AITargetDesignationRequest[]>([]);
    const [selectedTargetDesignationId, setSelectedTargetDesignationId] = useState<string | null>(null);
    const [flightSuggestions, setFlightSuggestions] = useState<FlightAnalysisSuggestion[]>([]);
    const [eliminationEvents, setEliminationEvents] = useState<EliminationEvent[]>([]);
    const { t, language } = useTranslation();

    // State for Geofencing
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [isDrawingGeofence, setIsDrawingGeofence] = useState<boolean>(false);
    const [newGeofencePoints, setNewGeofencePoints] = useState<{ lat: number; lon: number }[]>([]);
    const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState<boolean>(false);
    const [geofenceEvents, setGeofenceEvents] = useState<GeofenceEvent[]>([]);
    const [selectedGeofenceEventId, setSelectedGeofenceEventId] = useState<string | null>(null);
    const [showGeofences, setShowGeofences] = useState<boolean>(true);
    const geofenceStatusRef = useRef<Record<string, { fenceId: string; fenceName: string } | null>>({});
    const geofenceHeadingsRef = useRef<Record<string, number>>({}); // For calculating drone headings for events

    // Counter-UAS System
    const [counterUASSystems, setCounterUASSystems] = useState<Record<string, CounterUASSystem>>({});

    // Unidentified Flying Objects
    const [ufos, setUfos] = useState<UnidentifiedFlyingObject[]>([]);


    // State for Diagnostics Modal
    const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState<boolean>(false);
    const [diagnosticsTargetId, setDiagnosticsTargetId] = useState<string | null>(null);
    const [diagnosticsResult, setDiagnosticsResult] = useState<DiagnosticsReport | null>(null);
    const [isDiagnosticsLoading, setIsDiagnosticsLoading] = useState<boolean>(false);

    // State for Pre-Flight Checklist Modal
    const [isChecklistModalOpen, setIsChecklistModalOpen] = useState<boolean>(false);
    const [checklistTargetId, setChecklistTargetId] = useState<string | null>(null);
    const [launchQueue, setLaunchQueue] = useState<{ target: GroupCommandTarget, command: string } | null>(null);
    
    // State for Replay Mode
    const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
    const [replayTargetId, setReplayTargetId] = useState<string | null>(null);
    const [replayProgress, setReplayProgress] = useState<number>(0);
    const [isReplaying, setIsReplaying] = useState<boolean>(false);
    const [replaySpeed, setReplaySpeed] = useState<number>(1);
    const replayIntervalRef = useRef<number | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    const [alertPreferences, setAlertPreferences] = useState<AlertPreferences>({
        master: true,
        connectionLost: true,
        lowBattery: true,
        missionStart: true,
        returnToBase: true,
        highSeverityAnomaly: true,
        repairComplete: true,
        repairFailed: true,
        droneHealthStatus: true,
        aiRequestReceived: true,
        newThreatDetected: true,
        newAITargetDesignation: true,
        aiMissionComplete: true,
        presetMissionSuccess: true,
        interceptionSuccess: true,
        geofenceEntry: true,
        geofenceExit: true,
        cuasNeutralization: true,
        readAloud: true,
        selectedVoice: null,
        sounds: {
            success: '1',
            notification: '1',
            warning: '1',
            error: '1',
        },
    });
    
    // Refs for tracking previous state for alerts
    const prevDronesRef = useRef<Drones>({});
    const prevErrorRef = useRef<string | null>(null);
    const prevAnomaliesRef = useRef<Anomaly[]>([]);
    const prevThreatsRef = useRef<Threat[]>([]);
    const prevHealthScoresRef = useRef<Record<string, number>>({});
    const prevAiRequestsRef = useRef<AIActionRequest[]>([]);
    const prevAiTargetDesignationsRef = useRef<AITargetDesignationRequest[]>([]);
    const consecutiveFailsRef = useRef(0);
    
    // ... [Rest of the hooks and logic remain unchanged] ...

    const getDroneDisplayName = useCallback((droneId: string) => {
        if (droneNicknames[droneId]) {
            return droneNicknames[droneId];
        }
        const parts = droneId.split('-');
        if (parts.length === 2) {
            return `${parts[0]}-DRONE ${parts[1]}`;
        }
        return droneId.replace('_', ' ').toUpperCase();
    }, [droneNicknames]);


    const addLogEntry = useCallback((target: string, command: string, status: LogStatus, details: string = '-') => {
        setCommandLog(prevLog => {
            const newEntry: LogEntry = {
                timestamp: new Date().toISOString(),
                target,
                command,
                details,
                status,
            };
            return [newEntry, ...prevLog].slice(0, 100);
        });
    }, []);
    
    const triggerAlert = useCallback((soundType: 'success' | 'notification' | 'warning' | 'error', message: string) => {
        const { readAloud, sounds, selectedVoice } = alertPreferences;
        playConfiguredSound(soundType, sounds[soundType]);
        if (readAloud) {
            speak(message, selectedVoice, language);
        }
    }, [alertPreferences, language]);

    useEffect(() => {
        setCommandLogCallback((log: any) => {
            addLogEntry(log.target, log.command, log.status, log.details);
            if (log.alert && alertPreferences.master) {
                if (log.alert.preferenceKey && !alertPreferences[log.alert.preferenceKey as keyof AlertPreferences]) {
                    return;
                }
                let alertOptions = log.alert.options || {};
                if (alertOptions.droneId) {
                    alertOptions = { ...alertOptions, droneName: getDroneDisplayName(alertOptions.droneId) };
                }
                const message = t(log.alert.messageKey, alertOptions);
                triggerAlert(log.alert.type, message);
            }
        });
    }, [addLogEntry, t, triggerAlert, alertPreferences, getDroneDisplayName]);

    useEffect(() => {
        try {
            const savedPresets = localStorage.getItem('missionPresets');
            if (savedPresets) setMissionPresets(JSON.parse(savedPresets));

            const savedFlightPaths = localStorage.getItem('flightPaths');
            if (savedFlightPaths) setFlightPaths(JSON.parse(savedFlightPaths));

            const savedNicknames = localStorage.getItem('droneNicknames');
            if(savedNicknames) setDroneNicknames(JSON.parse(savedNicknames));
            
            const savedGeofences = localStorage.getItem('geofences');
            if(savedGeofences) setGeofences(JSON.parse(savedGeofences));

            const savedAlertPrefs = localStorage.getItem('alertPreferences');
             if (savedAlertPrefs) {
                try {
                    const parsedPrefs = JSON.parse(savedAlertPrefs);
                    setAlertPreferences(prev => {
                        const sounds = (parsedPrefs.sounds && typeof parsedPrefs.sounds === 'object')
                            ? { ...prev.sounds, ...parsedPrefs.sounds }
                            : prev.sounds;

                        return {
                            master: parsedPrefs.master ?? prev.master,
                            connectionLost: parsedPrefs.connectionLost ?? prev.connectionLost,
                            lowBattery: parsedPrefs.lowBattery ?? prev.lowBattery,
                            missionStart: parsedPrefs.missionStart ?? prev.missionStart,
                            returnToBase: parsedPrefs.returnToBase ?? prev.returnToBase,
                            highSeverityAnomaly: parsedPrefs.highSeverityAnomaly ?? prev.highSeverityAnomaly,
                            repairComplete: parsedPrefs.repairComplete ?? prev.repairComplete,
                            repairFailed: parsedPrefs.repairFailed ?? prev.repairFailed,
                            droneHealthStatus: parsedPrefs.droneHealthStatus ?? prev.droneHealthStatus,
                            aiRequestReceived: parsedPrefs.aiRequestReceived ?? prev.aiRequestReceived,
                            newThreatDetected: parsedPrefs.newThreatDetected ?? prev.newThreatDetected,
                            newAITargetDesignation: parsedPrefs.newAITargetDesignation ?? prev.newAITargetDesignation,
                            aiMissionComplete: parsedPrefs.aiMissionComplete ?? prev.aiMissionComplete,
                            presetMissionSuccess: parsedPrefs.presetMissionSuccess ?? prev.presetMissionSuccess,
                            interceptionSuccess: parsedPrefs.interceptionSuccess ?? prev.interceptionSuccess,
                            geofenceEntry: parsedPrefs.geofenceEntry ?? prev.geofenceEntry,
                            geofenceExit: parsedPrefs.geofenceExit ?? prev.geofenceExit,
                            cuasNeutralization: parsedPrefs.cuasNeutralization ?? prev.cuasNeutralization,
                            readAloud: parsedPrefs.readAloud ?? prev.readAloud,
                            selectedVoice: parsedPrefs.selectedVoice ?? prev.selectedVoice,
                            sounds: sounds
                        };
                    });
                } catch (e) {
                    console.error("Failed to parse saved alert preferences from localStorage", e);
                }
            }
        } catch (e) {
            console.error("Failed to load data from localStorage", e);
        }
    }, []);
    
    useEffect(() => {
        let voiceInterval: number | undefined;
        let voiceTimeout: number | undefined;
        
        const loadAndSetVoices = () => {
            const voices = getAvailableVoices(language);
            if (voices.length > 0) {
                setAvailableVoices(voices);
                if (voiceInterval) clearInterval(voiceInterval);
                if (voiceTimeout) clearTimeout(voiceTimeout);
            }
        };

        loadAndSetVoices(); 
        voiceInterval = window.setInterval(loadAndSetVoices, 500);
        voiceTimeout = window.setTimeout(() => {
            if (voiceInterval) clearInterval(voiceInterval);
        }, 5000); 

        return () => {
            if (voiceInterval) clearInterval(voiceInterval);
            if (voiceTimeout) clearTimeout(voiceTimeout);
        };

    }, [language]);

    useEffect(() => {
        try {
            localStorage.setItem('missionPresets', JSON.stringify(missionPresets));
        } catch (e) {
             console.error("Failed to save mission presets to localStorage", e);
        }
    }, [missionPresets]);
    
    useEffect(() => {
        try {
            localStorage.setItem('flightPaths', JSON.stringify(flightPaths));
        } catch (e) {
            console.error("Failed to save flight paths to localStorage", e);
        }
    }, [flightPaths]);

    useEffect(() => {
        try {
            localStorage.setItem('alertPreferences', JSON.stringify(alertPreferences));
        } catch (e) {
            console.error("Failed to save alert preferences to localStorage", e);
        }
    }, [alertPreferences]);

    useEffect(() => {
        try {
            localStorage.setItem('droneNicknames', JSON.stringify(droneNicknames));
        } catch (e) {
            console.error("Failed to save drone nicknames to localStorage", e);
        }
    }, [droneNicknames]);
    
    useEffect(() => {
        try {
            localStorage.setItem('geofences', JSON.stringify(geofences));
            updateGeofenceConfigForAI(geofences);
        } catch (e) {
            console.error("Failed to save geofences to localStorage", e);
        }
    }, [geofences]);


    const getStatus = useCallback(async () => {
        try {
            const data = await fetchDroneStatus(apiPort);
            setDrones(data);
            setError(null);
            consecutiveFailsRef.current = 0;

            const now = Date.now();
            
            setTelemetryHistory(prevHistory => {
                const newHistory: TelemetryHistory = {};
                Object.keys(data).forEach(id => {
                    const existingData = prevHistory[id] || [];
                    const updatedData = [...existingData, {
                        timestamp: now,
                        altitude: data[id].location.alt,
                        battery: data[id].battery,
                    }];
                    if (updatedData.length > 30) updatedData.shift();
                    newHistory[id] = updatedData;
                });
                return newHistory;
            });

            setFlightPaths(prevPaths => {
                const newPaths: FlightPaths = {};
                Object.keys(data).forEach(id => {
                    const newPoint = { lat: data[id].location.lat, lon: data[id].location.lon, timestamp: Date.now() };
                    const existingPath = prevPaths[id] || [];
                    
                    const lastPoint = existingPath[existingPath.length - 1];
                    let updatedPath = existingPath;
                    if (!lastPoint || lastPoint.lat !== newPoint.lat || lastPoint.lon !== newPoint.lon) {
                        updatedPath = [...existingPath, newPoint];
                    }
                    
                    if (updatedPath.length > 500) updatedPath.shift();
                    newPaths[id] = updatedPath;
                });
                return newPaths;
            });

            setSelectedDroneId(prevId => {
                if (prevId && !data[prevId]) {
                    return null;
                }
                return prevId;
            });

        } catch (err) {
            consecutiveFailsRef.current += 1;
            if (consecutiveFailsRef.current >= CONNECTION_FAIL_THRESHOLD) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(errorMessage);
                setDrones({});
            }
        }
    }, [apiPort]);
    
    const getAnomalies = useCallback(async () => {
        try {
            const newAnomalies = await fetchAnomalies();
            setAnomalies(newAnomalies);
        } catch (e) {
             console.error("Failed to fetch anomalies:", e);
        }
    }, []);
    
    const getThreats = useCallback(async () => {
        try {
            const newThreats = await fetchThreats();
            setThreats(newThreats);
        } catch (e) {
            console.error("Failed to fetch threats:", e);
        }
    }, []);

    const getAIActionRequests = useCallback(async () => {
        try {
            const newRequests = await fetchAIActionRequests();
            setAiActionRequests(newRequests);
        } catch (e) {
            console.error("Failed to fetch AI action requests:", e);
        }
    }, []);

    const getAITargetDesignations = useCallback(async () => {
        try {
            const newDesignations = await fetchAITargetDesignations();
            setAiTargetDesignations(newDesignations);
        } catch (e) {
            console.error("Failed to fetch AI target designations:", e);
        }
    }, []);

    const getFlightSuggestions = useCallback(async () => {
        try {
            const newSuggestions = await fetchFlightAnalysisSuggestions();
            setFlightSuggestions(newSuggestions);
        } catch (e) {
            console.error("Failed to fetch flight path suggestions:", e);
        }
    }, []);

    const getUFOs = useCallback(async () => {
        try {
            const newUFOs = await fetchUFOs();
            setUfos(newUFOs);
        } catch (e) {
            console.error("Failed to fetch UFOs:", e);
        }
    }, []);

    const getEliminationEvents = useCallback(async () => {
        try {
            const newEvents = await fetchEliminationEvents();
            if (newEvents.length > 0) {
                setEliminationEvents(prev => [...prev, ...newEvents]);
            }
        } catch (e) {
            console.error("Failed to fetch elimination events:", e);
        }
    }, []);

    const getCounterUASData = useCallback(async () => {
        try {
            const data = await fetchCounterUASStatus();
            setCounterUASSystems(data);
        } catch (e) {
            console.error("Failed to fetch Counter-UAS status:", e);
        }
    }, []);

    useEffect(() => {
        if (isReplayMode) return;

        getStatus();
        getAnomalies();
        getThreats();
        getAIActionRequests();
        getAITargetDesignations();
        getFlightSuggestions();
        getUFOs();
        getEliminationEvents();
        getCounterUASData();
        const statusIntervalId = setInterval(getStatus, 2000);
        const anomalyIntervalId = setInterval(getAnomalies, 3000);
        const threatIntervalId = setInterval(getThreats, 4500);
        const aiRequestIntervalId = setInterval(getAIActionRequests, 1500);
        const aiTargetDesignationIntervalId = setInterval(getAITargetDesignations, 2500);
        const flightSuggestionIntervalId = setInterval(getFlightSuggestions, 5000);
        const ufoIntervalId = setInterval(getUFOs, 2000);
        const eliminationIntervalId = setInterval(getEliminationEvents, 1000);
        const counterUASIntervalId = setInterval(getCounterUASData, 1500);

        return () => {
            clearInterval(statusIntervalId);
            clearInterval(anomalyIntervalId);
            clearInterval(threatIntervalId);
            clearInterval(aiRequestIntervalId);
            clearInterval(aiTargetDesignationIntervalId);
            clearInterval(flightSuggestionIntervalId);
            clearInterval(ufoIntervalId);
            clearInterval(eliminationIntervalId);
            clearInterval(counterUASIntervalId);
        }
    }, [getStatus, getAnomalies, getThreats, getAIActionRequests, getAITargetDesignations, getFlightSuggestions, getUFOs, getEliminationEvents, getCounterUASData, isReplayMode]);
    
    // ... [Alert checking logic remains unchanged] ...
    const checkConnectionAlerts = useCallback(() => {
        const wasConnected = prevErrorRef.current === null;
        const isDisconnected = error !== null;
        if (alertPreferences.connectionLost && wasConnected && isDisconnected) {
            triggerAlert('error', t('alerts.connection_lost'));
        }
    }, [error, alertPreferences.connectionLost, triggerAlert, t]);

    const checkDroneStatusAlerts = useCallback(() => {
        Object.keys(drones).forEach(id => {
            const currentDrone = drones[id];
            const prevDrone = prevDronesRef.current[id];
            const droneName = getDroneDisplayName(id);

            if (prevDrone) {
                if (alertPreferences.lowBattery && prevDrone.battery >= 20 && currentDrone.battery < 20) {
                    triggerAlert('warning', t('alerts.low_battery', { droneName, battery: currentDrone.battery.toFixed(0) }));
                }
                if (alertPreferences.missionStart && prevDrone.status !== DroneStatus.MISSION && currentDrone.status === DroneStatus.MISSION) {
                    triggerAlert('success', t('alerts.mission_start', { droneName }));
                }
                if (alertPreferences.returnToBase && prevDrone.status !== DroneStatus.RETURNING_TO_BASE && currentDrone.status === DroneStatus.RETURNING_TO_BASE) {
                    triggerAlert('notification', t('alerts.return_to_base', { droneName }));
                }

                const currentHealth = healthScores[id];
                const prevHealth = prevHealthScoresRef.current[id];
                if (currentDrone.status !== DroneStatus.GROUNDED && currentHealth !== undefined && prevHealth !== undefined && alertPreferences.droneHealthStatus && prevHealth >= HEALTH_THRESHOLD && currentHealth < HEALTH_THRESHOLD) {
                    addLogEntry(droneName, t('log.command.health_warning'), 'Failed', t('log.details.health_dropped', { health: currentHealth.toFixed(0) }));
                    triggerAlert('warning', t('alerts.health_warning', { droneName, health: currentHealth.toFixed(0) }));
                }
            }
        });
    }, [drones, healthScores, alertPreferences, getDroneDisplayName, addLogEntry, triggerAlert, t]);

    const checkAnomalyAlerts = useCallback(() => {
        const prevAnomaliesMap = new Map<string, Anomaly>(prevAnomaliesRef.current.map(a => [a.id, a]));
        anomalies.forEach(currentAnomaly => {
            const prevAnomaly = prevAnomaliesMap.get(currentAnomaly.id);
            const droneName = getDroneDisplayName(currentAnomaly.droneId);

            if (!prevAnomaly && currentAnomaly.severity === 'High' && alertPreferences.highSeverityAnomaly) {
                triggerAlert('warning', t('alerts.high_severity_anomaly', { droneName, type: currentAnomaly.type }));
            }

            if (prevAnomaly && prevAnomaly.repairStatus === 'repairing') {
                if (currentAnomaly.repairStatus === 'repaired' && alertPreferences.repairComplete) {
                    addLogEntry(t('log.target.anomaly', { id: currentAnomaly.id.slice(-4) }), t('log.command.auto_repair'), 'Success', t('log.details.on_drone', { droneName }));
                    triggerAlert('success', t('alerts.repair_complete', { droneName }));
                } else if (currentAnomaly.repairStatus === 'failed' && alertPreferences.repairFailed) {
                    addLogEntry(t('log.target.anomaly', { id: currentAnomaly.id.slice(-4) }), t('log.command.auto_repair'), 'Failed', t('log.details.on_drone', { droneName }));
                    triggerAlert('error', t('alerts.repair_failed', { droneName }));
                }
            }
        });
    }, [anomalies, alertPreferences, getDroneDisplayName, addLogEntry, triggerAlert, t]);

    const checkAIRequestAlerts = useCallback(() => {
        const prevRequestIds = new Set(prevAiRequestsRef.current.map(r => r.id));
        const newRequests = aiActionRequests.filter(r => !prevRequestIds.has(r.id));
        if (alertPreferences.aiRequestReceived && newRequests.length > 0) {
            triggerAlert('notification', t('alerts.new_ai_request'));
        }
    }, [aiActionRequests, alertPreferences.aiRequestReceived, triggerAlert, t]);

    const checkAITargetDesignationAlerts = useCallback(() => {
        const prevDesignationIds = new Set(prevAiTargetDesignationsRef.current.map(d => d.id));
        const newDesignations = aiTargetDesignations.filter(d => !prevDesignationIds.has(d.id));
        if (alertPreferences.newAITargetDesignation && newDesignations.length > 0) {
            triggerAlert('notification', t('alerts.new_ai_target_designation'));
        }
    }, [aiTargetDesignations, alertPreferences.newAITargetDesignation, triggerAlert, t]);
    
    const checkThreatAlerts = useCallback(() => {
        const prevThreatIds = new Set(prevThreatsRef.current.map(t => t.id));
        const newThreats = threats.filter(t => !prevThreatIds.has(t.id));

        if (alertPreferences.newThreatDetected && newThreats.length > 0) {
            const highPrioThreat = newThreats.find(t => t.severity === 'Critical' || t.severity === 'High');
            if (highPrioThreat) {
                const threatType = t(`threat_type.${highPrioThreat.type}`);
                triggerAlert('error', t('alerts.new_threat_detected', { severity: highPrioThreat.severity, type: threatType }));
            }
        }
    }, [threats, alertPreferences.newThreatDetected, triggerAlert, t]);

    const checkAICompletionAlerts = useCallback(() => {
        Object.keys(drones).forEach(id => {
            const currentDrone = drones[id];
            const prevDrone = prevDronesRef.current[id];
            const droneName = getDroneDisplayName(id);
    
            if (prevDrone && prevDrone.status === DroneStatus.AI_OVERRIDE && currentDrone.status === DroneStatus.RETURNING_TO_BASE) {
                addLogEntry(droneName, t('log.command.ai_mission_execution'), 'Success', t('log.details.ai_mission_jamming'));
                if (alertPreferences.aiMissionComplete) {
                    triggerAlert('notification', t('alerts.ai_mission_complete', { droneName }));
                }
            }
        });
    }, [drones, getDroneDisplayName, addLogEntry, triggerAlert, t, alertPreferences.aiMissionComplete]);

    const checkPresetMissionCompletionAlerts = useCallback(() => {
        if (!alertPreferences.presetMissionSuccess) return;

        Object.keys(drones).forEach(id => {
            const currentDrone = drones[id];
            const prevDrone = prevDronesRef.current[id];

            if (prevDrone && prevDrone.status === DroneStatus.MISSION && currentDrone.status === DroneStatus.HOVERING_ON_TARGET) {
                const target = currentDrone.mission_target;
                if (target) {
                    const matchedPreset = missionPresets.find(p => locationMatches(p.location, target));
                    if (matchedPreset) {
                        const droneName = getDroneDisplayName(id);
                        addLogEntry(droneName, t('log.command.preset_mission_complete'), 'Success', t('log.details.reached_target', { presetName: matchedPreset.name }));
                        triggerAlert('success', t('alerts.preset_mission_success', { droneName, presetName: matchedPreset.name }));
                    }
                }
            }
        });
    }, [drones, missionPresets, alertPreferences.presetMissionSuccess, getDroneDisplayName, triggerAlert, t, addLogEntry]);


    const calculateBearing = (p1: {lat: number, lon: number}, p2: {lat: number, lon: number}): number => {
        const lat1 = p1.lat * Math.PI / 180;
        const lon1 = p1.lon * Math.PI / 180;
        const lat2 = p2.lat * Math.PI / 180;
        const lon2 = p2.lon * Math.PI / 180;
        const dLon = lon2 - lon1;

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        const brng = Math.atan2(y, x);
        return (brng * 180 / Math.PI + 360) % 360;
    };

    const updateGeofenceStatus = useCallback(() => {
        if (geofences.length === 0) return;

        const allObjects: ({ 
            id: string; 
            location: Location; 
            type: 'drone' | 'ufo'; 
            name: string;
            speed?: number;
            heading?: number;
        })[] = [
            ...Object.keys(drones).map((id) => {
                const drone = drones[id];
                const mph_to_kmh = 1.60934;
                const speed = drone.status === DroneStatus.GROUNDED ? 0 : (drone.cruisingSpeed * MULTIPLIER_TO_MPH * mph_to_kmh);

                let heading = geofenceHeadingsRef.current[id] || 0;
                const path = flightPaths[id];
                if (path && path.length >= 2) {
                    const p1 = path[path.length - 2];
                    const p2 = path[path.length - 1];
                    if (p1.lat !== p2.lat || p1.lon !== p2.lon) {
                        heading = calculateBearing(p1, p2);
                        geofenceHeadingsRef.current[id] = heading;
                    }
                }
                
                return { 
                    id, 
                    location: drone.location, 
                    type: 'drone' as const, 
                    name: getDroneDisplayName(id),
                    speed,
                    heading
                };
            }),
            ...ufos.map(ufo => ({ 
                id: ufo.id, 
                location: ufo.location, 
                type: 'ufo' as const, 
                name: `${t(`ufo_type.${ufo.type}`)} ${ufo.id.replace('_', ' ')}`,
                speed: ufo.speed,
                heading: ufo.heading
            }))
        ];
        
        const newEvents: GeofenceEvent[] = [];

        allObjects.forEach(obj => {
            const objectKey = `${obj.type}_${obj.id}`;
            let currentStatus: { fenceId: string; fenceName: string } | null = null;
            
            for (const geofence of geofences) {
                if (isPointInPolygon(obj.location, geofence.points)) {
                    currentStatus = { fenceId: geofence.id, fenceName: geofence.name };
                    break;
                }
            }

            const prevStatus = geofenceStatusRef.current[objectKey] || null;

            if (currentStatus && (!prevStatus || prevStatus.fenceId !== currentStatus.fenceId)) {
                const geofence = geofences.find(g => g.id === currentStatus!.fenceId)!;
                if (geofence.alertOnEntry) {
                    const event: GeofenceEvent = {
                        id: `gfe_${Date.now()}_${obj.id}`,
                        timestamp: new Date().toISOString(),
                        objectId: obj.id,
                        objectDisplayName: obj.name,
                        objectType: obj.type === 'drone' ? GeofenceObjectType.FLEET_DRONE : GeofenceObjectType.UNIDENTIFIED_OBJECT,
                        eventType: 'entry',
                        geofenceId: geofence.id,
                        geofenceName: geofence.name,
                        location: { lat: obj.location.lat, lon: obj.location.lon },
                        altitude: obj.location.alt,
                        speed: obj.speed,
                        heading: obj.heading,
                    };
                    newEvents.push(event);
                    addLogEntry(obj.name, t('log.command.geofence_breach'), 'Success', t('log.details.entered_zone', { zoneName: geofence.name }));
                    if (alertPreferences.geofenceEntry) {
                        triggerAlert('warning', t('alerts.geofence_entry', { objectName: obj.name, geofenceName: geofence.name }));
                    }
                }
            } else if (!currentStatus && prevStatus) {
                const geofence = geofences.find(g => g.id === prevStatus.fenceId)!;
                 if (geofence && geofence.alertOnExit) {
                    const event: GeofenceEvent = {
                        id: `gfe_${Date.now()}_${obj.id}`,
                        timestamp: new Date().toISOString(),
                        objectId: obj.id,
                        objectDisplayName: obj.name,
                        objectType: obj.type === 'drone' ? GeofenceObjectType.FLEET_DRONE : GeofenceObjectType.UNIDENTIFIED_OBJECT,
                        eventType: 'exit',
                        geofenceId: geofence.id,
                        geofenceName: geofence.name,
                        location: { lat: obj.location.lat, lon: obj.location.lon },
                        altitude: obj.location.alt,
                        speed: obj.speed,
                        heading: obj.heading,
                    };
                    newEvents.push(event);
                    addLogEntry(obj.name, t('log.command.geofence_event'), 'Success', t('log.details.exited_zone', { zoneName: geofence.name }));
                    if (alertPreferences.geofenceExit) {
                        triggerAlert('notification', t('alerts.geofence_exit', { objectName: obj.name, geofenceName: geofence.name }));
                    }
                }
            }
            
            geofenceStatusRef.current[objectKey] = currentStatus;
        });

        if (newEvents.length > 0) {
            setGeofenceEvents(prev => [...newEvents, ...prev].slice(0, 100));
        }

    }, [drones, ufos, geofences, flightPaths, alertPreferences.geofenceEntry, alertPreferences.geofenceExit, getDroneDisplayName, addLogEntry, triggerAlert, t]);


    // Effect for Audio Alerts
    useEffect(() => {
        if (!alertPreferences.master || isReplayMode) return;
        
        checkConnectionAlerts();
        checkDroneStatusAlerts();
        checkAnomalyAlerts();
        checkAIRequestAlerts();
        checkAITargetDesignationAlerts();
        checkThreatAlerts();
        checkAICompletionAlerts();
        checkPresetMissionCompletionAlerts();

        prevDronesRef.current = drones;
        prevErrorRef.current = error;
        prevAnomaliesRef.current = anomalies;
        prevThreatsRef.current = threats;
        prevHealthScoresRef.current = healthScores;
        prevAiRequestsRef.current = aiActionRequests;
        prevAiTargetDesignationsRef.current = aiTargetDesignations;

    }, [drones, error, anomalies, threats, aiActionRequests, aiTargetDesignations, healthScores, missionPresets, alertPreferences.master, isReplayMode, checkConnectionAlerts, checkDroneStatusAlerts, checkAnomalyAlerts, checkAIRequestAlerts, checkAITargetDesignationAlerts, checkThreatAlerts, checkAICompletionAlerts, checkPresetMissionCompletionAlerts]);

    useEffect(() => {
        if (!alertPreferences.master || isReplayMode) return;
        updateGeofenceStatus();
    }, [drones, ufos, geofences, alertPreferences.master, isReplayMode, updateGeofenceStatus]);
    
    // ... [Event handlers and other effects remain unchanged] ...
    
    const handleDroneSelect = useCallback((id: string) => {
        setSelectedDroneId(id);
        setSelectedAnomalyId(null);
        setSelectedThreatId(null);
        setSelectedGeofenceEventId(null);
        setSelectedTargetDesignationId(null);
    }, []);

    const handleAnomalySelect = useCallback((id: string) => {
        setSelectedAnomalyId(id);
        setSelectedDroneId(null);
        setSelectedThreatId(null);
        setSelectedGeofenceEventId(null);
        setSelectedTargetDesignationId(null);
        mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const handleThreatSelect = useCallback((id: string) => {
        setSelectedThreatId(id);
        setSelectedDroneId(null);
        setSelectedAnomalyId(null);
        setSelectedGeofenceEventId(null);
        setSelectedTargetDesignationId(null);
        mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const handleTargetDesignationSelect = useCallback((id: string) => {
        setSelectedTargetDesignationId(id);
        setSelectedDroneId(null);
        setSelectedAnomalyId(null);
        setSelectedThreatId(null);
        setSelectedGeofenceEventId(null);
        mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const handleGeofenceEventSelect = useCallback((eventId: string) => {
        setSelectedGeofenceEventId(eventId);
        setSelectedDroneId(null);
        setSelectedAnomalyId(null);
        setSelectedThreatId(null);
        setSelectedTargetDesignationId(null);
        mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    useEffect(() => {
        if (selectedDroneId) {
            const droneCardElement = document.getElementById(selectedDroneId);
            if (droneCardElement) {
                droneCardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selectedDroneId]);

    const highSeverityCounts = useMemo(() => {
        const counts = Object.keys(drones).reduce((acc, droneId) => {
            acc[droneId] = 0;
            return acc;
        }, {} as Record<string, number>);
        
        anomalies.forEach(anomaly => {
            if (anomaly.severity === 'High' && anomaly.repairStatus === 'pending') {
                if (counts.hasOwnProperty(anomaly.droneId)) {
                    counts[anomaly.droneId]++;
                }
            }
        });
        return counts;
    }, [drones, anomalies]);
    
    useEffect(() => {
        const newHealthScores: Record<string, number> = {};
        Object.keys(drones).forEach(id => {
            const drone = drones[id];
            const anomalyPenalty = highSeverityCounts[id] * 40;
            const baseScore = (drone.battery * 0.5) + (drone.signal_strength * 0.5);
            const finalScore = baseScore - anomalyPenalty;
            newHealthScores[id] = Math.max(0, Math.min(100, finalScore));
        });
        setHealthScores(newHealthScores);
    }, [drones, highSeverityCounts]);


    const handleFleetCommand = useCallback(async (action: string) => {
        if (action === 'launch') {
            setChecklistTargetId('fleet');
            setIsChecklistModalOpen(true);
            return;
        }

        const commandName = t(`log.action.${action}`);
        try {
            await postCommand(apiPort, `/fleet/${action}`);
            addLogEntry(t('log.target.fleet'), commandName, 'Success');
            await getStatus();
        } catch (error) {
            addLogEntry(t('log.target.fleet'), commandName, 'Failed', error instanceof Error ? error.message : 'Unknown error');
        }
    }, [apiPort, getStatus, addLogEntry, t]);

    const handleGroupCommand = useCallback(async (droneIds: string[], action: string) => {
        if (action === 'launch') {
            const groundedDrones = droneIds.filter(id => drones[id]?.status === DroneStatus.GROUNDED);
            if (groundedDrones.length > 0) {
                setLaunchQueue({ target: groundedDrones, command: action });
                setChecklistTargetId('group');
                setIsChecklistModalOpen(true);
            } else {
                addLogEntry(t('log.target.group_command'), t('log.action.launch'), 'Failed', 'No grounded drones in selection.');
            }
            return;
        }

        const commandName = t(`log.action.${action}`);
        addLogEntry(t('log.target.group_command'), commandName, 'Success', t('log.details.targeting_drones', { count: droneIds.length }));
        
        const promises = droneIds.map(droneId => {
            return postCommand(apiPort, `/drones/${droneId}/${action}`).catch(err => {
                addLogEntry(getDroneDisplayName(droneId), commandName, 'Failed', err instanceof Error ? err.message : 'Unknown error');
            });
        });
        
        await Promise.all(promises);
        await getStatus();

    }, [drones, apiPort, getStatus, addLogEntry, getDroneDisplayName, t]);

    const handleIndividualMissionParamsChange = useCallback(async (droneId: string, params: { speed?: number; altitude?: number }) => {
        const drone = drones[droneId];
        if (!drone) return;
        
        const currentParams = { speed: drone.cruisingSpeed, altitude: drone.cruisingAltitude };
        const newParams = { ...currentParams, ...params };

        setDrones(prevDrones => ({
            ...prevDrones,
            [droneId]: {
                ...prevDrones[droneId],
                cruisingSpeed: newParams.speed,
                cruisingAltitude: newParams.altitude,
            }
        }));

        const commandName = t('log.command.set_mission_params');
        const details = t('log.details.mission_params', { speed: newParams.speed.toFixed(1), alt: newParams.altitude });
        try {
            await postCommand(apiPort, `/drones/${droneId}/set_mission_parameters`, newParams);
            addLogEntry(getDroneDisplayName(droneId), commandName, 'Success', details);
        } catch (error) {
            addLogEntry(getDroneDisplayName(droneId), commandName, 'Failed', error instanceof Error ? error.message : 'Unknown error');
            setDrones(prevDrones => ({
                ...prevDrones,
                [droneId]: {
                    ...prevDrones[droneId],
                    ...currentParams,
                }
            }));
        }
    }, [drones, apiPort, addLogEntry, getDroneDisplayName, t]);

    const handleRunDiagnostics = useCallback(async (droneId: string) => {
        const drone = drones[droneId];
        if (!drone) return;

        const targetName = getDroneDisplayName(droneId);
        addLogEntry(targetName, t('log.command.run_diagnostics'), 'Success', t('log.details.initiated'));

        setDiagnosticsTargetId(droneId);
        setIsDiagnosticsLoading(true);
        setDiagnosticsResult(null);
        setIsDiagnosticsModalOpen(true);

        try {
            const result = await runDroneDiagnostics(droneId, drone);
            setDiagnosticsResult(result);
            const overallStatusKey = `diagnostics.status.${result.overallStatus.toLowerCase()}`;
            addLogEntry(targetName, t('log.command.diagnostics_complete'), 'Success', t('log.details.diagnostics_status', { status: t(overallStatusKey) }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            addLogEntry(targetName, 'Diagnostics Failed', 'Failed', message);
        } finally {
            setIsDiagnosticsLoading(false);
        }
    }, [drones, addLogEntry, getDroneDisplayName, t]);
    
    const handleStartReplay = useCallback((droneId: string) => {
        setIsReplayMode(true);
        setReplayTargetId(droneId);
        setReplayProgress(0);
        setIsReplaying(false);
        setSelectedDroneId(null);
        setSelectedAnomalyId(null);
    }, []);

    const handleStopReplay = useCallback(() => {
        setIsReplayMode(false);
        setReplayTargetId(null);
        if (replayIntervalRef.current) {
            clearInterval(replayIntervalRef.current);
            replayIntervalRef.current = null;
        }
    }, []);
    
    useEffect(() => {
        if (isReplaying && replayTargetId) {
            const path = flightPaths[replayTargetId];
            if (!path || path.length === 0) return;

            replayIntervalRef.current = window.setInterval(() => {
                setReplayProgress(prev => {
                    if (prev >= path.length - 1) {
                        setIsReplaying(false); 
                        return path.length - 1;
                    }
                    return prev + 1;
                });
            }, 200 / replaySpeed);
        } else {
            if (replayIntervalRef.current) {
                clearInterval(replayIntervalRef.current);
                replayIntervalRef.current = null;
            }
        }
        return () => {
            if (replayIntervalRef.current) {
                clearInterval(replayIntervalRef.current);
            }
        };
    }, [isReplaying, replayTargetId, flightPaths, replaySpeed]);


    const handleSingleDroneCommand = useCallback(async (droneId: string, action: string) => {
        if (action === 'run_diagnostics') {
            handleRunDiagnostics(droneId);
            return;
        }
        if (action === 'replay_flight_path') {
            handleStartReplay(droneId);
            return;
        }

        const targetName = getDroneDisplayName(droneId);
        const commandName = t(`log.action.${action}`);

        if (action === 'launch') {
            const drone = drones[droneId];
            if (drone && drone.status === DroneStatus.GROUNDED) {
                setChecklistTargetId(droneId);
                setIsChecklistModalOpen(true);
            } else {
                addLogEntry(targetName, commandName, 'Failed', 'Drone is not grounded.');
            }
            return;
        }

        try {
            await postCommand(apiPort, `/drones/${droneId}/${action}`);
            addLogEntry(targetName, commandName, 'Success');
            await getStatus();
        } catch (error) {
            addLogEntry(targetName, commandName, 'Failed', error instanceof Error ? error.message : 'Unknown error');
        }
    }, [apiPort, getStatus, addLogEntry, handleRunDiagnostics, handleStartReplay, drones, getDroneDisplayName, t]);
    
    const handleInitiateRepair = useCallback(async (anomalyId: string) => {
        const anomaly = anomalies.find(a => a.id === anomalyId);
        if (!anomaly) return;

        addLogEntry(t('log.target.anomaly', { id: anomalyId.slice(-4) }), t('log.command.initiate_repair'), 'Success', t('log.details.on_drone', { droneName: getDroneDisplayName(anomaly.droneId) }));
        try {
            await initiateAnomalyRepair(anomalyId);
            await getAnomalies();
        } catch (error) {
             addLogEntry(t('log.target.anomaly', { id: anomalyId.slice(-4) }), t('log.command.initiate_repair'), 'Failed', error instanceof Error ? error.message : 'Unknown error');
        }
    }, [anomalies, addLogEntry, getDroneDisplayName, getAnomalies, t]);

    const handleRespondToThreat = useCallback(async (threatId: string) => {
        const threat = threats.find(t => t.id === threatId);
        if (!threat) return;

        const command = threat.type === ThreatType.JAMMING_SIGNAL ? t('log.command.ack_ai_response') : t('log.command.ack_threat');
        const target = t('log.target.threat', { id: threat.id.slice(-4) });

        try {
            await postThreatResponse(threatId);
            addLogEntry(target, command, 'Success', t('log.details.threat_type', { type: t(`threat_type.${threat.type}`) }));
            await getThreats();
        } catch (error) {
            addLogEntry(target, command, 'Failed', error instanceof Error ? error.message : 'Unknown error');
        }
    }, [threats, addLogEntry, t, getThreats]);


    const showMissionModal = (target: string) => {
        setModalTarget(target);
        setIsModalOpen(true);
    };

    const closeMissionModal = () => {
        setIsModalOpen(false);
        setModalTarget(null);
    };
    
    const handleSavePreset = useCallback((name: string, location: Location): boolean => {
        const newPreset: MissionPreset = { name, location };
        if (missionPresets.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            addLogEntry(t('log.target.system'), t('log.command.save_preset_failed'), 'Failed', t('log.details.preset_exists', { name }));
            return false;
        }
        setMissionPresets(prev => [...prev, newPreset].sort((a, b) => a.name.localeCompare(b.name)));
        addLogEntry('System', 'Mission Preset Saved', 'Success', `Saved "${name}"`);
        return true;
    }, [missionPresets, addLogEntry, t]);

    const handleDeletePreset = useCallback((name: string) => {
        setMissionPresets(prev => prev.filter(p => p.name !== name));
        addLogEntry(t('log.target.system'), t('log.command.preset_deleted'), 'Success', t('log.details.deleted_preset', { name }));
    }, [addLogEntry, t]);


    const submitMission = async (lat: number, lon: number, alt: number) => {
        if (!modalTarget) return;

        handleDeselect();

        const body = { target_lat: lat, target_lon: lon, target_alt: alt };
        const endpointPrefix = modalTarget === 'fleet' ? '/fleet' : `/drones/${modalTarget}`;
        const details = t('log.details.mission_coords', { lat: lat.toFixed(2), lon: lon.toFixed(2), alt: alt.toFixed(1) });
        const targetName = modalTarget === 'fleet' ? t('log.target.fleet') : getDroneDisplayName(modalTarget);

        try {
            await postCommand(apiPort, `${endpointPrefix}/plan_mission`, body);
            await postCommand(apiPort, `${endpointPrefix}/acquire_target`, body);
            addLogEntry(targetName, t('log.command.set_mission'), 'Success', details);
        } catch (e) {
            addLogEntry(targetName, t('log.command.set_mission'), 'Failed', e instanceof Error ? e.message : 'Unknown error');
        } finally {
            closeMissionModal();
            await getStatus();
        }
    };
    
    const handleAIActionResponse = useCallback(async (requestId: string, approved: boolean) => {
        const request = aiActionRequests.find(r => r.id === requestId);
        if (!request) return;

        const droneName = getDroneDisplayName(request.droneId);
        const actionName = t(`action.${request.action}`);
        const status = approved ? 'Success' : 'Failed';
        const logCommand = approved ? t('ai_requests.approve') : t('ai_requests.deny');

        addLogEntry(droneName, `${logCommand}: ${actionName}`, status, t('log.details.operator_responded_ai'));

        try {
            await postAIActionResponse(requestId, approved);
            setAiActionRequests(prev => prev.filter(r => r.id !== requestId));
            await getStatus();
        } catch (error) {
            addLogEntry(droneName, t('log.command.ai_response_failed'), 'Failed', t('log.details.failed_to_send_response', { error: error instanceof Error ? error.message : 'Unknown error' }));
        }

    }, [aiActionRequests, addLogEntry, getDroneDisplayName, t, getStatus]);

    const handleAITargetResponse = useCallback(async (requestId: string, response: { approved: boolean, droneId?: string }) => {
        const designation = aiTargetDesignations.find(d => d.id === requestId);
        if (!designation) return;

        const droneName = response.droneId ? getDroneDisplayName(response.droneId) : 'N/A';
        const logCommand = response.approved ? t('log.command.confirm_ai_target') : t('log.command.deny_ai_target');
        const status = response.approved ? 'Success' : 'Failed';
        
        addLogEntry(droneName, logCommand, status, t('log.details.operator_responded_target', { threatId: designation.sourceId.slice(-6) }));

        try {
            await postAITargetResponse(requestId, response);
            await getAITargetDesignations(); 
            await getStatus(); 
        } catch (error) {
            addLogEntry(t('log.target.ai_targeting_system'), t('log.command.ai_target_response_failed'), 'Failed', t('log.details.failed_to_send_response', { error: error instanceof Error ? error.message : 'Unknown error' }));
        }
    }, [aiTargetDesignations, addLogEntry, getDroneDisplayName, getStatus, t]);


    const handleAIActionOverride = useCallback(async (requestId: string, newAction: AIAction) => {
        const request = aiActionRequests.find(r => r.id === requestId);
        if (!request) return;

        const droneName = getDroneDisplayName(request.droneId);
        const newActionName = t(`action.${newAction}`);

        addLogEntry(droneName, t('log.command.operator_override', { actionName: newActionName }), 'Success', t('log.details.overriding_ai_suggestion', { suggestion: t(`action.${request.action}`) }));

        try {
            await postAIActionOverride(requestId, newAction);
            setAiActionRequests(prev => prev.filter(r => r.id !== requestId));
            await getStatus();
        } catch (error) {
            addLogEntry(droneName, t('log.command.ai_override_failed'), 'Failed', t('log.details.failed_to_send_override', { error: error instanceof Error ? error.message : 'Unknown error' }));
        }
    }, [aiActionRequests, addLogEntry, getDroneDisplayName, t, getStatus]);


    const handleFlightSuggestionResponse = useCallback(async (suggestionId: string, approved: boolean) => {
        const suggestion = flightSuggestions.find(s => s.id === suggestionId);
        if (!suggestion) return;

        const droneName = getDroneDisplayName(suggestion.droneId);
        const logCommand = approved ? t('log.command.accept_path_suggestion') : t('log.command.decline_path_suggestion');
        const status = approved ? 'Success' : 'Failed';

        addLogEntry(droneName, logCommand, status, t('log.details.operator_responded_suggestion'));

        try {
            await postFlightSuggestionResponse(suggestionId, approved);
            setFlightSuggestions(prev => prev.filter(s => s.id !== suggestionId));
            await getStatus();
        } catch (error) {
            addLogEntry(droneName, t('log.command.path_suggestion_failed'), 'Failed', t('log.details.failed_to_send_response', { error: error instanceof Error ? error.message : 'Unknown error' }));
        }
    }, [flightSuggestions, addLogEntry, getDroneDisplayName, getStatus, t]);

    const handleDeselect = useCallback(() => {
        setSelectedDroneId(null);
        setSelectedAnomalyId(null);
        setSelectedThreatId(null);
        setSelectedGeofenceEventId(null);
        setSelectedTargetDesignationId(null);
    }, []);

    const handleConfirmLaunch = useCallback(async (targetId: string) => {
        setIsChecklistModalOpen(false);
        setChecklistTargetId(null);

        if (targetId === 'group' && launchQueue) {
            const droneIds = launchQueue.target;
            const commandName = t('log.action.launch');
            
            addLogEntry(t('log.target.group_launch'), t('log.command.preflight_check'), 'Success', t('log.details.preflight_confirmed_group', { count: droneIds.length }));
            
            const promises = droneIds.map(id => 
                postCommand(apiPort, `/drones/${id}/launch`)
                    .then(() => addLogEntry(getDroneDisplayName(id), commandName, 'Success'))
                    .catch(error => addLogEntry(getDroneDisplayName(id), commandName, 'Failed', error instanceof Error ? error.message : 'Unknown error'))
            );
            
            await Promise.all(promises);
            setLaunchQueue(null); 
            await getStatus();
            return;
        }

        const isFleet = targetId === 'fleet';
        const targetName = isFleet ? t('log.target.fleet') : getDroneDisplayName(targetId);
        const commandName = t('log.action.launch');
        const endpoint = isFleet ? '/fleet/launch' : `/drones/${targetId}/launch`;

        addLogEntry(targetName, t('log.command.preflight_check'), 'Success', t('log.details.preflight_confirmed'));

        try {
            await postCommand(apiPort, endpoint);
            addLogEntry(targetName, commandName, 'Success');
            await getStatus();
        } catch (error) {
            addLogEntry(targetName, commandName, 'Failed', error instanceof Error ? error.message : 'Unknown error');
        }
    }, [apiPort, getStatus, addLogEntry, getDroneDisplayName, launchQueue, t]);

    const handleSetNickname = useCallback((droneId: string, nickname: string) => {
        setDroneNicknames(prev => ({ ...prev, [droneId]: nickname }));
        addLogEntry(getDroneDisplayName(droneId), t('log.command.set_nickname'), 'Success', t('log.details.set_nickname_to', { nickname }));
    }, [getDroneDisplayName, addLogEntry, t]);

    const handleCeaseFire = useCallback(async (systemId: string) => {
        try {
            await postCounterUASCommand(systemId, 'cease_fire');
            await getCounterUASData();
        } catch (error) {
            console.error("Failed to send cease fire command", error);
        }
    }, [getCounterUASData]);

    // --- Geofence Handlers ---
    const handleStartDrawingGeofence = useCallback(() => {
        setIsDrawingGeofence(true);
        setNewGeofencePoints([]);
        handleDeselect();
        mapRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [handleDeselect]);

    const handleCancelDrawingGeofence = useCallback(() => {
        setIsDrawingGeofence(false);
        setNewGeofencePoints([]);
    }, []);

    const handleAddGeofencePoint = useCallback((point: { lat: number; lon: number }) => {
        setNewGeofencePoints(prev => [...prev, point]);
    }, []);

    const handleFinishDrawingGeofence = useCallback(() => {
        if (newGeofencePoints.length < 3) {
            alert(t('geofence.alert.min_points'));
            return;
        }
        setIsDrawingGeofence(false);
        setIsGeofenceModalOpen(true);
    }, [newGeofencePoints, t]);

    const handleSaveGeofence = useCallback((newGeofence: Omit<Geofence, 'id' | 'points'>) => {
        const geofenceToAdd: Geofence = {
            ...newGeofence,
            id: `gf_${Date.now()}`,
            points: newGeofencePoints,
        };

        setGeofences(prev => [...prev, geofenceToAdd]);

        addLogEntry(t('log.target.system'), t('log.command.geofence_created'), 'Success', t('log.details.zone_defined', { name: newGeofence.name }));
        
        setIsGeofenceModalOpen(false);
        setNewGeofencePoints([]);
    }, [newGeofencePoints, addLogEntry, t]);

    const handleDeleteGeofence = useCallback((id: string) => {
        const fenceName = geofences.find(f => f.id === id)?.name || 'Unknown';
        setGeofences(prev => prev.filter(f => f.id !== id));
        addLogEntry(t('log.target.system'), t('log.command.geofence_deleted'), 'Success', t('log.details.zone_removed', { name: fenceName }));
    }, [geofences, addLogEntry, t]);


    const replayPath = replayTargetId ? flightPaths[replayTargetId] : null;

    return (
        <div>
            <div className="container mx-auto px-4 md:px-8 pb-8">
                <Header />
                
                {/* Controls and Status Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                    <WindowFrame title={t('fleet_controls.title')}>
                        <FleetControls
                            onFleetCommand={handleFleetCommand}
                            onShowMissionModal={() => showMissionModal('fleet')}
                            drones={drones}
                            selectedDroneId={selectedDroneId}
                            onIndividualMissionParamsChange={handleIndividualMissionParamsChange}
                            getDroneDisplayName={getDroneDisplayName}
                        />
                    </WindowFrame>
                    <div className="space-y-8">
                        {(Object.values(counterUASSystems) as CounterUASSystem[]).sort((a: CounterUASSystem, b: CounterUASSystem) => a.id.localeCompare(b.id)).map((system: CounterUASSystem) => (
                            <WindowFrame key={system.id} title={t('counter_uas.title_id', { id: system.id.split('-')[0].toUpperCase() })}>
                                <CounterUASPanel 
                                    system={system} 
                                    onCeaseFire={() => handleCeaseFire(system.id)} 
                                />
                            </WindowFrame>
                        ))}
                        <WindowFrame title={t('geofence.title')}>
                            <GeofencePanel
                                geofences={geofences}
                                onStartDrawing={handleStartDrawingGeofence}
                                onDelete={handleDeleteGeofence}
                            />
                        </WindowFrame>
                        <WindowFrame title={t('audio_alerts.title')}>
                             <AudioAlerts
                                preferences={alertPreferences}
                                onPreferencesChange={setAlertPreferences}
                                availableVoices={availableVoices}
                            />
                        </WindowFrame>
                    </div>
                </div>

                {/* Map and Video Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8" ref={mapRef}>
                    <WindowFrame title="Live Geo-Spatial Map" className="h-full">
                        <DroneMap
                            drones={drones}
                            selectedDroneId={selectedDroneId}
                            flightPaths={flightPaths}
                            anomalies={anomalies}
                            selectedAnomalyId={selectedAnomalyId}
                            threats={threats}
                            selectedThreatId={selectedThreatId}
                            aiTargetDesignations={aiTargetDesignations}
                            selectedTargetDesignationId={selectedTargetDesignationId}
                            geofences={geofences}
                            isDrawingGeofence={isDrawingGeofence}
                            newGeofencePoints={newGeofencePoints}
                            ufos={ufos}
                            geofenceEvents={geofenceEvents}
                            selectedGeofenceEventId={selectedGeofenceEventId}
                            eliminationEvents={eliminationEvents}
                            counterUAS={counterUASSystems}
                            onDroneSelect={handleDroneSelect}
                            onAnomalySelect={handleAnomalySelect}
                            onThreatSelect={handleThreatSelect}
                            onDeselect={handleDeselect}
                            onAddGeofencePoint={handleAddGeofencePoint}
                            onCancelDrawing={handleCancelDrawingGeofence}
                            onFinishDrawing={handleFinishDrawingGeofence}
                            isReplayMode={isReplayMode}
                            replayDroneId={replayTargetId}
                            replayProgressIndex={replayProgress}
                            droneNicknames={droneNicknames}
                            showGeofences={showGeofences}
                            getDroneDisplayName={getDroneDisplayName}
                        />
                    </WindowFrame>
                    <WindowFrame title={t('video_feeds.title', { count: Object.values(drones).filter(d => [DroneStatus.MISSION, DroneStatus.HOVERING_ON_TARGET, DroneStatus.AI_OVERRIDE].includes(d.status)).length })} className="h-full">
                        <VideoFeedsPanel drones={drones} droneNicknames={droneNicknames} />
                    </WindowFrame>
                </div>
                
                {isReplayMode && replayPath && (
                    <ReplayControls
                        droneId={replayTargetId!}
                        path={replayPath}
                        progress={replayProgress}
                        isPlaying={isReplaying}
                        speed={replaySpeed}
                        onPlayPause={() => setIsReplaying(!isReplaying)}
                        onClose={handleStopReplay}
                        onProgressChange={setReplayProgress}
                        onSpeedChange={setReplaySpeed}
                        getDroneDisplayName={getDroneDisplayName}
                    />
                )}

                {/* AI and Intelligence Section */}
                <div className="space-y-8 mb-8">
                    <WindowFrame title={t('ai_requests.title', { count: aiActionRequests.length })}>
                        <AIActionRequests
                            requests={aiActionRequests}
                            onRespond={handleAIActionResponse}
                            onOverride={handleAIActionOverride}
                            getDroneDisplayName={getDroneDisplayName}
                        />
                    </WindowFrame>
                    
                    <WindowFrame title={t('ai_targets.title', { count: aiTargetDesignations.length })}>
                        <AITargetDesignations
                            designations={aiTargetDesignations}
                            onRespond={handleAITargetResponse}
                            onSelect={handleTargetDesignationSelect}
                            getDroneDisplayName={getDroneDisplayName}
                            drones={drones}
                        />
                    </WindowFrame>
                    
                    <WindowFrame title={t('path_intelligence.title', { count: flightSuggestions.length })}>
                        <FlightPathAnalysis
                            suggestions={flightSuggestions}
                            onRespond={handleFlightSuggestionResponse}
                            getDroneDisplayName={getDroneDisplayName}
                        />
                    </WindowFrame>
                </div>

                {/* Feeds Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
                    <WindowFrame title={t('threat_feed.title', { count: threats.length })}>
                        <ThreatFeed
                            threats={threats}
                            onSelectThreat={handleThreatSelect}
                            selectedThreatId={selectedThreatId}
                            onRespondToThreat={handleRespondToThreat}
                        />
                    </WindowFrame>
                    <WindowFrame title={t('anomaly_feed.title')}>
                        <AnomalyFeed
                            anomalies={anomalies}
                            onSelectAnomaly={handleAnomalySelect}
                            onInitiateRepair={handleInitiateRepair}
                            selectedAnomalyId={selectedAnomalyId}
                            droneNicknames={droneNicknames}
                        />
                    </WindowFrame>
                    <WindowFrame title={t('geofence_event_log.title')}>
                        <GeofenceEventLog
                            events={geofenceEvents}
                            ufos={ufos}
                            onSelectEvent={handleGeofenceEventSelect}
                        />
                    </WindowFrame>
                </div>

                {/* Fleet Management Section */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                    <div className="xl:col-span-2">
                        <WindowFrame title="Drone Fleet Overview">
                             <DroneFleet
                                drones={drones}
                                error={error}
                                onSingleCommand={handleSingleDroneCommand}
                                onShowMissionModal={showMissionModal}
                                selectedDroneId={selectedDroneId}
                                highSeverityCounts={highSeverityCounts}
                                healthScores={healthScores}
                                flightPaths={flightPaths}
                                droneNicknames={droneNicknames}
                                onSetNickname={handleSetNickname}
                                onGroupCommand={handleGroupCommand}
                                threats={threats}
                                ufos={ufos}
                            />
                        </WindowFrame>
                    </div>
                    <div className="space-y-8">
                        <WindowFrame title={t('comm_assistant.title')}>
                            <AICommAssistant />
                        </WindowFrame>
                    </div>
                </div>

                <WindowFrame title={t('command_log.title')}>
                    <CommandLog logEntries={commandLog} />
                </WindowFrame>

                 <SettingsPanel
                    port={apiPort}
                    setPort={setApiPort}
                    userRole={userRole}
                    onRoleChange={setUserRole}
                    showGeofences={showGeofences}
                    onShowGeofencesChange={setShowGeofences}
                />

                {isModalOpen && (
                    <MissionModal
                        isOpen={isModalOpen}
                        target={modalTarget}
                        onClose={closeMissionModal}
                        onSubmit={submitMission}
                        presets={missionPresets}
                        userRole={userRole}
                        onSavePreset={handleSavePreset}
                        onDeletePreset={handleDeletePreset}
                        getDroneDisplayName={getDroneDisplayName}
                    />
                )}

                {isDiagnosticsModalOpen && (
                    <DiagnosticsModal
                        isOpen={isDiagnosticsModalOpen}
                        onClose={() => setIsDiagnosticsModalOpen(false)}
                        droneId={diagnosticsTargetId}
                        isLoading={isDiagnosticsLoading}
                        result={diagnosticsResult}
                        getDroneDisplayName={getDroneDisplayName}
                    />
                )}

                {isChecklistModalOpen && (
                    <PreFlightChecklistModal
                        isOpen={isChecklistModalOpen}
                        onClose={() => setIsChecklistModalOpen(false)}
                        onConfirmLaunch={handleConfirmLaunch}
                        droneId={checklistTargetId}
                        getDroneDisplayName={getDroneDisplayName}
                    />
                )}

                {isGeofenceModalOpen && (
                    <GeofenceModal
                        isOpen={isGeofenceModalOpen}
                        onClose={() => setIsGeofenceModalOpen(false)}
                        onSave={handleSaveGeofence}
                        existingNames={geofences.map(g => g.name)}
                    />
                )}

            </div>
        </div>
    );
}