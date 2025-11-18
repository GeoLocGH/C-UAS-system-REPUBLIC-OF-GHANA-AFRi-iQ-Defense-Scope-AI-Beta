import React, { useEffect, useRef, useState } from 'react';
import { DroneStatus, type Drones, type Location, type FlightPaths, type Anomaly, type Threat, type Drone, type FlightPath, type DroneNicknames, type Geofence, UnidentifiedFlyingObject, GeofenceEvent, UFOType, ThreatType, AITargetDesignationRequest, EliminationEvent, CounterUASSystem } from '../types';
import { useTranslation } from '../contexts/I18nContext';
import { METERS_TO_FEET } from '../constants';

// ... [Props interface and helper functions remain unchanged] ...
// Let TypeScript know that 'L' is a global object from the Leaflet script
declare const L: any;

interface DroneMapProps {
    drones: Drones;
    selectedDroneId: string | null;
    flightPaths: FlightPaths;
    anomalies: Anomaly[];
    selectedAnomalyId: string | null;
    threats: Threat[];
    selectedThreatId: string | null;
    aiTargetDesignations: AITargetDesignationRequest[];
    selectedTargetDesignationId: string | null;
    geofences: Geofence[];
    isDrawingGeofence: boolean;
    newGeofencePoints: { lat: number; lon: number }[];
    ufos: UnidentifiedFlyingObject[];
    geofenceEvents: GeofenceEvent[];
    selectedGeofenceEventId: string | null;
    eliminationEvents: EliminationEvent[];
    counterUAS: Record<string, CounterUASSystem>;
    onDroneSelect: (id: string) => void;
    onAnomalySelect: (id: string) => void;
    onThreatSelect: (id: string) => void;
    onDeselect: () => void;
    onAddGeofencePoint: (point: { lat: number; lon: number }) => void;
    onCancelDrawing: () => void;
    onFinishDrawing: () => void;
    isReplayMode: boolean;
    replayDroneId: string | null;
    replayProgressIndex: number;
    droneNicknames: DroneNicknames;
    showGeofences: boolean;
    getDroneDisplayName: (droneId: string) => string;
}

// ... [Helper functions like getAnomalyIcon, getDroneIconSVG, etc. remain unchanged] ...
const getAnomalyIcon = (anomaly: Anomaly) => {
    const severityColors: Record<string, string> = { High: 'text-red-500', Medium: 'text-yellow-400', Low: 'text-blue-400' };
    
    switch (anomaly.repairStatus) {
        case 'repairing':
            return {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 text-cyan-400 animate-spin"><path fill-rule="evenodd" d="M12 22.5c-5.798 0-10.5-4.702-10.5-10.5S6.202 1.5 12 1.5c2.18 0 4.204.66 5.965 1.833a.75.75 0 01-.63 1.334 8.966 8.966 0 00-4.835-1.167 9 9 0 00-9 9 9 9 0 009 9 9 9 0 008.03-4.555.75.75 0 011.328.67_10.5 10.5_0 01-9.358 5.385z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M8.21 10.243a.75.75 0 011.06 0l1.47 1.47a.75.75 0 01-1.06 1.06l-1.47-1.47a.75.75 0 010-1.06zm5.212 1.03a.75.75 0 010 1.06l-1.47 1.47a.75.75 0 01-1.06-1.06l1.47-1.47a.75.75 0 011.06 0z" clip-rule="evenodd" /><path d="M12.75 4.5a.75.75 0 00-1.5 0v2.25a.75.75 0 001.5 0V4.5z" /><path d="M12.75 17.25a.75.75 0 00-1.5 0V19.5a.75.75 0 001.5 0v-2.25z" /><path d="M4.5 11.25a.75.75 0 000 1.5h2.25a.75.75 0 000-1.5H4.5z" /><path d="M17.25 11.25a.75.75 0 000 1.5h2.25a.75.75 0 000-1.5h-2.25z" /></svg>`,
                color: 'text-cyan-400'
            };
        case 'repaired':
             return {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-green-500"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" /></svg>`,
                color: 'text-green-500'
            };
        case 'failed':
             return {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-red-500"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75 9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clip-rule="evenodd" /></svg>`,
                color: 'text-red-500'
            };
        case 'pending':
        default:
            return {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 ${severityColors[anomaly.severity]}"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.01-1.742 3.01H4.42c-1.53 0-2.493-1.676-1.743-3.01l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`,
                color: severityColors[anomaly.severity]
            };
    }
};

const getDroneIconSVG = (drone: Drone, isSelected: boolean, heading: number) => {
    const isLockedOn = drone.target_locked;
    let iconContent: string;
    
    const color = isSelected ? '#2dd4bf' : '#9ca3af'; // cyan-400 or gray-400

    switch (drone.droneType) {
        case 'Assault':
            iconContent = `<path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" fill="${color}" />`;
            break;
        case 'Interceptor':
            iconContent = `<path d="M12 2 L2 22 L12 17 L22 22 Z" fill="${color}" />`;
            break;
        case 'Recon':
        default:
            iconContent = `
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-7 2H2v3h3v-3zm14 0h-3v3h3v-3z" fill="${color}" />
                <path d="M12 2v5" stroke="${color}" stroke-width="1.5" fill="none" />
            `;
            break;
    }
    
    const pulseClass = isLockedOn ? 'drone-locked-pulse' : '';
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-8 h-8 ${pulseClass}">
        <g transform="rotate(${heading} 12 12)">${iconContent}</g>
    </svg>`;
};


const getThreatIcon = (threat: Threat) => {
    const severityColors: Record<string, string> = { Critical: '#a855f7', High: '#ef4444', Medium: '#f59e0b' }; // purple, red, amber
    const color = severityColors[threat.severity];

    if (threat.type === ThreatType.UNIDENTIFIED_DRONE) {
        const droneIconPath = `<path fill-rule="evenodd" d="M11 11V7.5a.5.5 0 011 0V11h3.5a.5.5 0 010 1H12v3.5a.5.5 0 01-1 0V12H7.5a.5.5 0 010-1H11zM12 1a2 2 0 100 4 2 2 0 000-4zm2 11a2 2 0 104 0 2 2 0 00-4 0zm9 9a2 2 0 100 4 2 2 0 000-4zm9-9a2 2 0 104 0 2 2 0 00-4 0z" clip-rule="evenodd" />`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-8 h-8">${droneIconPath}</svg>`;
    }

    // Original icon for other threats
    const otherThreatIconPath = `<path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75 9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clip-rule="evenodd" />`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-8 h-8">${otherThreatIconPath}</svg>`;
};

const getUFOIcon = (ufo: UnidentifiedFlyingObject) => {
    let path;
    let rotation = ufo.heading; // Default rotation for vertically oriented icons
    const color = (ufo.type === 'fpv_drone' || ufo.type === 'unknown_uav') ? '#f43f5e' : '#6b7280'; // rose-500 or gray-500

    switch (ufo.type) {
        case 'helicopter':
            // New, more realistic top-down helicopter icon
            path = `<path d="M12 2.5a.5.5 0 01.5.5v8a.5.5 0 01-1 0V3a.5.5 0 01.5-.5zM3 11.5a.5.5 0 01.5-.5h17a.5.5 0 010 1H3.5a.5.5 0 01-.5-.5zM12.99 15.18a3.5 3.5 0 10-1.98 0l-5.65 2.18a.5.5 0 00-.36.65l1.37 3.78c.17.47.64.7.9.5l4.73-3.64 4.73 3.64c.26.2.73 0 .9-.5l1.37-3.78a.5.5 0 00-.36-.65l-5.65-2.18z"/>`;
            break;
        case 'fpv_drone':
        case 'unknown_uav':
            path = `<path fill-rule="evenodd" d="M11 11V7.5a.5.5 0 011 0V11h3.5a.5.5 0 010 1H12v3.5a.5.5 0 01-1 0V12H7.5a.5.5 0 010-1H11zM12 1a2 2 0 100 4 2 2 0 000-4zm2 11a2 2 0 104 0 2 2 0 00-4 0zm9 9a2 2 0 100 4 2 2 0 000-4zm9-9a2 2 0 104 0 2 2 0 00-4 0z" clip-rule="evenodd" />`;
            break;
        case 'commercial_jet':
        case 'private_plane':
            // New stylized jet icon
            path = `<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>`;
            break;
        default: // a fallback for any new non-hostile types
            path = `<path d="M18.717 9.19a.75.75 0 01.375 1.159l-4.25 6.5a.75.75 0 01-1.159-.75l2-3.25H6.323l2 3.25a.75.75 0 11-1.16.75l-4.25-6.5A.75.75 0 013.28 9.19l4.25-3.5a.75.75 0 01.94.06L12 8.356l3.53-2.618a.75.75 0 01.94-.06l4.25 3.5z" />`;
            rotation = ufo.heading - 90; // This icon is horizontal, so adjust
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-7 h-7" transform="rotate(${rotation} 12 12)">${path}</svg>`;
};


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


export const DroneMap: React.FC<DroneMapProps> = ({ 
    drones, selectedDroneId, flightPaths, anomalies, selectedAnomalyId, 
    threats, selectedThreatId, aiTargetDesignations, selectedTargetDesignationId,
    geofences, isDrawingGeofence, newGeofencePoints, ufos, geofenceEvents, selectedGeofenceEventId,
    eliminationEvents, counterUAS,
    onDroneSelect, onAnomalySelect, onThreatSelect, onDeselect, onAddGeofencePoint, onCancelDrawing, onFinishDrawing,
    isReplayMode, replayDroneId, replayProgressIndex, droneNicknames, showGeofences, getDroneDisplayName
}) => {
    const { t } = useTranslation();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    
    // ... [Existing Refs remain unchanged] ...
    const droneMarkersRef = useRef<Record<string, any>>({});
    const headingsRef = useRef<Record<string, number>>({});
    const pathLayersRef = useRef<Record<string, any>>({});
    const missionTargetMarkersRef = useRef<Record<string, any>>({});
    const anomalyMarkersRef = useRef<Record<string, any>>({});
    const handledRepairedAnomaliesRef = useRef<Set<string>>(new Set());
    const threatMarkersRef = useRef<Record<string, any>>({});
    const fadingOutThreatsRef = useRef<Set<string>>(new Set());
    const aiTargetMarkersRef = useRef<Record<string, any>>({});
    const geofenceLayersRef = useRef<Record<string, any>>({});
    const ufoMarkersRef = useRef<Record<string, any>>({});
    const fadingOutUFOsRef = useRef<Set<string>>(new Set());
    const eventMarkerRef = useRef<any>(null);
    const newGeofenceLayerRef = useRef<any>(null);
    const replayDroneMarkerRef = useRef<any>(null);
    const processedEventsRef = useRef<Set<number>>(new Set());
    const uasLayersRef = useRef<any>(null);

    const [isUserPanned, setIsUserPanned] = useState(false);

    // ... [Existing Map Initialization and Logic remain unchanged] ...
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [5.649133, -0.0722325],
                zoom: 12,
            });
             L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);
            map.on('dragstart', () => setIsUserPanned(true));
            map.on('zoomstart', () => setIsUserPanned(true));
            mapRef.current = map;
            const baseZoom = 12;
            const baseFontSize = 12; 
            const updateLabelStyles = () => {
                const mapNode = map.getContainer();
                if (!document.body.contains(mapNode)) return;
                const currentZoom = map.getZoom();
                const scale = Math.pow(1.4, currentZoom - baseZoom);
                const newFontSize = Math.max(8, Math.min(32, baseFontSize * scale));
                const newPaddingY = Math.max(2, Math.min(8, 4 * scale));
                const newPaddingX = Math.max(4, Math.min(16, 8 * scale));
                const newBorderRadius = Math.max(2, Math.min(8, 4 * scale));
                mapNode.style.setProperty('--geofence-font-size', `${newFontSize.toFixed(2)}px`);
                mapNode.style.setProperty('--geofence-padding-y', `${newPaddingY.toFixed(2)}px`);
                mapNode.style.setProperty('--geofence-padding-x', `${newPaddingX.toFixed(2)}px`);
                mapNode.style.setProperty('--geofence-border-radius', `${newBorderRadius.toFixed(2)}px`);
            };
            map.on('zoomend', updateLabelStyles);
            updateLabelStyles(); 
        }
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);
    
    // ... [Rest of the hooks remain unchanged] ...
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const handleClick = (e: any) => {
            if (isDrawingGeofence) {
                onAddGeofencePoint({ lat: e.latlng.lat, lon: e.latlng.lng });
            } else {
                onDeselect();
            }
        };
        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
        };
    }, [isDrawingGeofence, onAddGeofencePoint, onDeselect]);

    // ... [All other markers and layers effects remain unchanged] ...
    // Drone Markers
    useEffect(() => {
        if (!mapRef.current || isReplayMode) return;
        const map = mapRef.current;
        Object.keys(drones).forEach(id => {
            const drone = drones[id];
            const isSelected = id === selectedDroneId;
            let heading = headingsRef.current[id] || 0;
            const path = flightPaths[id];
            if (path && path.length >= 2) {
                const p1 = path[path.length - 2];
                const p2 = path[path.length - 1];
                if (p1.lat !== p2.lat || p1.lon !== p2.lon) {
                    heading = calculateBearing(p1, p2);
                    headingsRef.current[id] = heading;
                }
            }
            const iconHtml = getDroneIconSVG(drone, isSelected, heading);
            const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
            if (droneMarkersRef.current[id]) {
                droneMarkersRef.current[id].setLatLng([drone.location.lat, drone.location.lon]).setIcon(icon);
            } else {
                const marker = L.marker([drone.location.lat, drone.location.lon], { icon }).addTo(map);
                marker.on('click', (e: any) => { L.DomEvent.stopPropagation(e); onDroneSelect(id); });
                droneMarkersRef.current[id] = marker;
            }
            droneMarkersRef.current[id].bindTooltip(getDroneDisplayName(id));
        });
        Object.keys(droneMarkersRef.current).forEach(id => {
            if (!drones[id]) {
                droneMarkersRef.current[id].remove();
                delete droneMarkersRef.current[id];
                delete headingsRef.current[id];
            }
        });
    }, [drones, selectedDroneId, onDroneSelect, droneNicknames, isReplayMode, getDroneDisplayName, flightPaths]);
    
    // ... [Anomaly Markers effect] ...
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const activeAnomalyIdsOnMap = new Set();
        anomalies.forEach(anomaly => {
            if (anomaly.repairStatus === 'repaired' && !handledRepairedAnomaliesRef.current.has(anomaly.id)) {
                const marker = anomalyMarkersRef.current[anomaly.id];
                if (marker) {
                    handledRepairedAnomaliesRef.current.add(anomaly.id);
                    const { icon: iconHtml } = getAnomalyIcon(anomaly);
                    const repairedIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
                    marker.setIcon(repairedIcon);
                    const iconElement = marker.getElement();
                    if (iconElement) { iconElement.classList.add('marker-fade-out'); }
                    setTimeout(() => {
                        if (anomalyMarkersRef.current[anomaly.id]) {
                            anomalyMarkersRef.current[anomaly.id].remove();
                            delete anomalyMarkersRef.current[anomaly.id];
                        }
                    }, 1000); 
                }
                return; 
            }
            if (handledRepairedAnomaliesRef.current.has(anomaly.id)) { return; }
            activeAnomalyIdsOnMap.add(anomaly.id);
            const isSelected = anomaly.id === selectedAnomalyId;
            const { icon: iconHtml } = getAnomalyIcon(anomaly);
            const icon = L.divIcon({
                html: iconHtml,
                className: `transition-transform duration-300 ${isSelected ? 'transform scale-150' : ''}`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });
            if (anomalyMarkersRef.current[anomaly.id]) {
                anomalyMarkersRef.current[anomaly.id].setLatLng([anomaly.location.lat, anomaly.location.lon]).setIcon(icon);
            } else {
                const marker = L.marker([anomaly.location.lat, anomaly.location.lon], { icon, zIndexOffset: 500 }).addTo(map);
                marker.on('click', (e: any) => { L.DomEvent.stopPropagation(e); onAnomalySelect(anomaly.id); });
                anomalyMarkersRef.current[anomaly.id] = marker;
            }
            const popupContent = `<b>${t('map.popup.anomaly_title', { type: anomaly.type })}</b><br/>${t('map.popup.anomaly_severity', { severity: anomaly.severity })}<br/>${t('map.popup.anomaly_drone', { droneName: getDroneDisplayName(anomaly.droneId) })}`;
            anomalyMarkersRef.current[anomaly.id].bindPopup(popupContent);
        });
        Object.keys(anomalyMarkersRef.current).forEach(id => {
            if (!activeAnomalyIdsOnMap.has(id) && !handledRepairedAnomaliesRef.current.has(id)) {
                anomalyMarkersRef.current[id].remove();
                delete anomalyMarkersRef.current[id];
            }
        });
    }, [anomalies, selectedAnomalyId, onAnomalySelect, getDroneDisplayName, t]);

    // ... [Threat Markers effect] ...
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const currentThreatIds = new Set(threats.map(t => t.id));
        threats.forEach(threat => {
            const isSelected = threat.id === selectedThreatId;
            const iconHtml = getThreatIcon(threat);
            const icon = L.divIcon({
                html: iconHtml,
                className: `transition-transform duration-300 ${isSelected ? 'transform scale-150' : ''}`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });
            if (threatMarkersRef.current[threat.id]) {
                threatMarkersRef.current[threat.id].setLatLng([threat.location.lat, threat.location.lon]).setIcon(icon);
            } else {
                const marker = L.marker([threat.location.lat, threat.location.lon], { icon, zIndexOffset: 1000 }).addTo(map);
                marker.on('click', (e: any) => { L.DomEvent.stopPropagation(e); onThreatSelect(threat.id); });
                threatMarkersRef.current[threat.id] = marker;
            }
        });
        Object.keys(threatMarkersRef.current).forEach(id => {
            if (!currentThreatIds.has(id) && !fadingOutThreatsRef.current.has(id)) {
                const marker = threatMarkersRef.current[id];
                if (marker) {
                    fadingOutThreatsRef.current.add(id);
                    const iconElement = marker.getElement();
                    if (iconElement) { iconElement.classList.add('marker-fade-out'); }
                    setTimeout(() => {
                        if (threatMarkersRef.current[id]) {
                            threatMarkersRef.current[id].remove();
                            delete threatMarkersRef.current[id];
                            fadingOutThreatsRef.current.delete(id);
                        }
                    }, 1000); 
                }
            }
        });
    }, [threats, selectedThreatId, onThreatSelect]);

    // ... [AI Target Markers effect] ...
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const existingIds = new Set();
        const iconHtml = (isSelected: boolean) => `
            <div class="relative flex items-center justify-center w-8 h-8">
                <div class="absolute w-8 h-8 bg-cyan-500 rounded-full opacity-75 target-marker-pulse"></div>
                <svg xmlns="http://www.w3.org/2000/svg" class="relative h-7 w-7 text-cyan-400 ${isSelected ? 'scale-125' : ''} transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 12h18M12 3v18" />
                </svg>
            </div>
        `;
        aiTargetDesignations.forEach(designation => {
            existingIds.add(designation.id);
            const isSelected = designation.id === selectedTargetDesignationId;
            const icon = L.divIcon({ html: iconHtml(isSelected), className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
            if (aiTargetMarkersRef.current[designation.id]) {
                aiTargetMarkersRef.current[designation.id].setLatLng([designation.targetLocation.lat, designation.targetLocation.lon]).setIcon(icon);
            } else {
                const marker = L.marker([designation.targetLocation.lat, designation.targetLocation.lon], { icon, zIndexOffset: 2500 }).addTo(map);
                aiTargetMarkersRef.current[designation.id] = marker;
            }
            aiTargetMarkersRef.current[designation.id].bindTooltip(`AI Target: ${designation.reason}`);
        });
        Object.keys(aiTargetMarkersRef.current).forEach(id => {
            if (!existingIds.has(id)) {
                aiTargetMarkersRef.current[id].remove();
                delete aiTargetMarkersRef.current[id];
            }
        });
    }, [aiTargetDesignations, selectedTargetDesignationId]);

     // ... [UFO Markers effect] ...
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const currentUFOIds = new Set(ufos.map(u => u.id));
        ufos.forEach(ufo => {
            const iconHtml = getUFOIcon(ufo);
            const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
            if (ufoMarkersRef.current[ufo.id]) {
                ufoMarkersRef.current[ufo.id].setLatLng([ufo.location.lat, ufo.location.lon]).setIcon(icon);
            } else {
                ufoMarkersRef.current[ufo.id] = L.marker([ufo.location.lat, ufo.location.lon], { icon, zIndexOffset: 200 }).addTo(map);
            }
        });
        Object.keys(ufoMarkersRef.current).forEach(id => {
            if (!currentUFOIds.has(id) && !fadingOutUFOsRef.current.has(id)) {
                const marker = ufoMarkersRef.current[id];
                if (marker) {
                    fadingOutUFOsRef.current.add(id);
                    const iconElement = marker.getElement();
                    if (iconElement) { iconElement.classList.add('marker-fade-out'); }
                    setTimeout(() => {
                        if (ufoMarkersRef.current[id]) {
                            ufoMarkersRef.current[id].remove();
                            delete ufoMarkersRef.current[id];
                            fadingOutUFOsRef.current.delete(id);
                        }
                    }, 1000); 
                }
            }
        });
    }, [ufos]);

    // ... [Flight Path Layers effect] ...
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        Object.keys(flightPaths).forEach(id => {
            const path = flightPaths[id];
            const drone = drones[id];
            if (!drone) return;
            const isSelected = id === selectedDroneId;
            const color = isSelected ? '#2dd4bf' : '#4f46e5'; 
            const weight = isSelected ? 4 : 2;
            if (path.length > 1) {
                const latlngs = path.map(p => [p.lat, p.lon]);
                if (pathLayersRef.current[id]) {
                    pathLayersRef.current[id].setLatLngs(latlngs).setStyle({ color, weight });
                } else {
                    pathLayersRef.current[id] = L.polyline(latlngs, { color, weight, opacity: 0.8 }).addTo(map);
                }
            }
        });
        Object.keys(pathLayersRef.current).forEach(id => {
            if (!drones[id] || !flightPaths[id] || flightPaths[id].length < 2) {
                pathLayersRef.current[id].remove();
                delete pathLayersRef.current[id];
            }
        });
    }, [flightPaths, selectedDroneId, drones]);

    // ... [Mission Targets effect] ...
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const activeMissionTargets = new Set();
        Object.keys(drones).forEach(id => {
            const drone = drones[id];
            if (drone.mission_target && [DroneStatus.MISSION, DroneStatus.AI_OVERRIDE].includes(drone.status)) {
                activeMissionTargets.add(id);
                const iconHtml = `
                    <div class="relative flex items-center justify-center w-8 h-8">
                        <div class="absolute w-8 h-8 bg-red-500 rounded-full opacity-75 target-marker-pulse"></div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="relative h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M18 12H6" />
                        </svg>
                    </div>`;
                const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
                if (missionTargetMarkersRef.current[id]) {
                    missionTargetMarkersRef.current[id].setLatLng([drone.mission_target.lat, drone.mission_target.lon]).setIcon(icon);
                } else {
                    missionTargetMarkersRef.current[id] = L.marker([drone.mission_target.lat, drone.mission_target.lon], { icon }).addTo(map);
                }
            }
        });
        Object.keys(missionTargetMarkersRef.current).forEach(id => {
            if (!activeMissionTargets.has(id)) {
                missionTargetMarkersRef.current[id].remove();
                delete missionTargetMarkersRef.current[id];
            }
        });
    }, [drones]);

    // ... [Geofence Layers effect] ...
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const currentFenceIds = new Set(geofences.map(f => f.id));
        if (showGeofences) {
            geofences.forEach(fence => {
                const latlngs = fence.points.map(p => [p.lat, p.lon]);
                if (geofenceLayersRef.current[fence.id]) {
                    geofenceLayersRef.current[fence.id].setLatLngs(latlngs).setStyle({ color: fence.color });
                    geofenceLayersRef.current[fence.id].getTooltip().setContent(fence.name);
                } else {
                    const polygon = L.polygon(latlngs, { color: fence.color, weight: 2, fillOpacity: 0.1 }).addTo(map);
                    polygon.bindTooltip(fence.name, { permanent: true, direction: 'center', className: 'geofence-label' });
                    geofenceLayersRef.current[fence.id] = polygon;
                }
            });
        }
        Object.keys(geofenceLayersRef.current).forEach(id => {
            if (!showGeofences || !currentFenceIds.has(id)) {
                geofenceLayersRef.current[id].remove();
                delete geofenceLayersRef.current[id];
            }
        });
    }, [geofences, showGeofences]);

    // ... [Drawing Geofence effect] ...
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (newGeofenceLayerRef.current) {
            newGeofenceLayerRef.current.remove();
            newGeofenceLayerRef.current = null;
        }
        if (isDrawingGeofence && newGeofencePoints.length > 0) {
            const latlngs = newGeofencePoints.map(p => [p.lat, p.lon]);
            const layerGroup = L.layerGroup().addTo(map);
            L.polyline(latlngs, { color: '#2dd4bf', weight: 3, dashArray: '5, 10' }).addTo(layerGroup);
            newGeofencePoints.forEach(point => {
                L.circleMarker([point.lat, point.lon], {
                    radius: 6, color: '#fff', weight: 2, fillColor: '#2dd4bf', fillOpacity: 1
                }).addTo(layerGroup);
            });
            newGeofenceLayerRef.current = layerGroup;
        }
    }, [isDrawingGeofence, newGeofencePoints]);

    // ... [Event Marker effect] ...
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (eventMarkerRef.current) {
            eventMarkerRef.current.remove();
            eventMarkerRef.current = null;
        }
        if (selectedGeofenceEventId) {
            const event = geofenceEvents.find(e => e.id === selectedGeofenceEventId);
            if (event) {
                const iconHtml = `
                    <div class="relative flex items-center justify-center w-8 h-8">
                        <div class="absolute w-8 h-8 bg-yellow-400 rounded-full opacity-75 target-marker-pulse"></div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="relative h-6 w-6 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                           <path fill-rule="evenodd" d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.95a.75.75 0 011.06 0l1.062 1.062a.75.75 0 01-1.06 1.06L5.05 5.012a.75.75 0 010-1.062zM3 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 013 10zm11.95 6.05a.75.75 0 01-1.06 0l-1.062-1.062a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 010 1.062zM17 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zm-5.05 3.95a.75.75 0 010-1.06l1.06-1.062a.75.75 0 011.06 1.06L13.012 14.95a.75.75 0 01-1.06 0zM10 17a.75.75 0 01-.75.75v1.5a.75.75 0 011.5 0v-1.5a.75.75 0 01-.75-.75zM5.05 16.05a.75.75 0 010-1.06l1.06-1.062a.75.75 0 011.06 1.06L6.112 14.95a.75.75 0 01-1.06 0z" clip-rule="evenodd" />
                        </svg>
                    </div>`;
                const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
                const altitudeText = event.altitude != null ? `${(event.altitude * METERS_TO_FEET).toFixed(0)} ft` : 'N/A';
                const speedText = event.speed != null ? `${event.speed.toFixed(0)} km/h` : 'N/A';
                const headingText = event.heading != null ? `${event.heading.toFixed(0)}°` : 'N/A';
                const eventTypeText = t(`geofence_event_log.event.${event.eventType}`);
                const eventTypeColor = event.eventType === 'entry' ? '#FBBF24' : '#60A5FA';
                const popupContent = `
                    <div class="text-base">
                        <strong>${event.objectDisplayName}</strong><br>
                        <span class="text-xs text-gray-400">${t(`geofence_event_log.object_type.${event.objectType}`)}</span>
                        <hr class="my-1 border-gray-600">
                        <p><strong>Event:</strong> <span style="color: ${eventTypeColor}; font-weight: bold;">${eventTypeText.toUpperCase()}</span></p>
                        <p><strong>Zone:</strong> ${event.geofenceName}</p>
                        <p><strong>Time:</strong> ${new Date(event.timestamp).toLocaleTimeString()}</p>
                        <hr class="my-1 border-gray-600">
                        <strong>Telemetry at event:</strong>
                        <ul class="list-none pl-2 text-sm">
                            <li>Altitude: ${altitudeText}</li>
                            <li>Speed: ${speedText}</li>
                            <li>Heading: ${headingText}</li>
                        </ul>
                    </div>
                `;
                eventMarkerRef.current = L.marker([event.location.lat, event.location.lon], { icon, zIndexOffset: 2000 })
                    .addTo(map)
                    .bindPopup(popupContent)
                    .openPopup();
                eventMarkerRef.current.on('popupclose', () => {
                    onDeselect();
                });
            }
        }
    }, [selectedGeofenceEventId, geofenceEvents, t, onDeselect]);

    // ... [Elimination Events effect] ...
    useEffect(() => {
        if (!mapRef.current || eliminationEvents.length === 0) return;
        const map = mapRef.current;
        eliminationEvents.forEach(event => {
            if (!processedEventsRef.current.has(event.timestamp)) {
                processedEventsRef.current.add(event.timestamp);
                const iconHtml = `<div class="explosion-marker" style="width: 20px; height: 20px;"></div>`;
                const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
                const explosionMarker = L.marker([event.location.lat, event.location.lon], { icon, zIndexOffset: 9999 }).addTo(map);
                setTimeout(() => { explosionMarker.remove(); }, 800); 
            }
        });
    }, [eliminationEvents]);

    // ... [C-UAS Visualization effect] ...
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !counterUAS) return;
        if (uasLayersRef.current) { uasLayersRef.current.clearLayers(); } else { uasLayersRef.current = L.layerGroup().addTo(map); }
        (Object.values(counterUAS) as CounterUASSystem[]).forEach((system: CounterUASSystem) => {
            const { location, detectionRadius, engagementRadius, status, currentTargetId } = system;
            const uasLatLng = [location.lat, location.lon];
            const turretIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-10 h-10 text-cyan-400"><path d="M12 2c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/><path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4z"/></svg>`;
            const turretIcon = L.divIcon({ html: turretIconHtml, className: '', iconSize: [40, 40], iconAnchor: [20, 20] });
            L.marker(uasLatLng, { icon: turretIcon, zIndexOffset: 3000 }).addTo(uasLayersRef.current).bindTooltip(`C-UAS Turret ${system.id.split('-')[0].toUpperCase()}`);
            L.circle(uasLatLng, { radius: detectionRadius, color: '#0891b2', weight: 1, dashArray: '5, 5', fillOpacity: 0.05 }).addTo(uasLayersRef.current);
            L.circle(uasLatLng, { radius: engagementRadius, color: '#f59e0b', weight: 1, fillOpacity: 0.1 }).addTo(uasLayersRef.current);
            if ((status === 'targeting' || status === 'engaging') && currentTargetId) {
                const target = ufos.find(u => u.id === currentTargetId);
                if (target) {
                    const targetLatLng = [target.location.lat, target.location.lon];
                    const color = status === 'engaging' ? '#ef4444' : '#f59e0b'; 
                    L.polyline([uasLatLng, targetLatLng], { color: color, weight: status === 'engaging' ? 4 : 3, dashArray: status === 'targeting' ? '5, 10' : undefined, className: status === 'engaging' ? 'c-uas-engaging-line' : '' }).addTo(uasLayersRef.current);
                }
            }
        });
    }, [counterUAS, ufos]);

    // ... [Replay Mode effect] ...
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        Object.values(droneMarkersRef.current).forEach((marker: any) => marker.setOpacity(isReplayMode ? 0 : 1));
        Object.values(pathLayersRef.current).forEach((layer: any) => layer.setStyle({ opacity: isReplayMode ? 0 : 0.8 }));
        if (isReplayMode && replayDroneId && flightPaths[replayDroneId]) {
            const path = flightPaths[replayDroneId];
            const drone = drones[replayDroneId]; 
            if (!drone || path.length === 0) return;
            const latlngs = path.map(p => [p.lat, p.lon]);
            if (pathLayersRef.current['replay_path']) {
                pathLayersRef.current['replay_path'].setLatLngs(latlngs);
            } else {
                pathLayersRef.current['replay_path'] = L.polyline(latlngs, { color: '#6b7280', weight: 3, dashArray: '5, 5' }).addTo(map);
            }
            const point = path[replayProgressIndex];
            const nextPoint = path[replayProgressIndex + 1] || point;
            const heading = calculateBearing(point, nextPoint);
            const iconHtml = getDroneIconSVG(drone, true, heading);
            const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
            if (replayDroneMarkerRef.current) {
                replayDroneMarkerRef.current.setLatLng([point.lat, point.lon]).setIcon(icon);
            } else {
                replayDroneMarkerRef.current = L.marker([point.lat, point.lon], { icon }).addTo(map);
            }
            if (!isUserPanned) {
                map.panTo([point.lat, point.lon]);
            }
        } else {
            if (replayDroneMarkerRef.current) {
                replayDroneMarkerRef.current.remove();
                replayDroneMarkerRef.current = null;
            }
            if (pathLayersRef.current['replay_path']) {
                pathLayersRef.current['replay_path'].remove();
                delete pathLayersRef.current['replay_path'];
            }
        }
    }, [isReplayMode, replayDroneId, replayProgressIndex, flightPaths, drones, isUserPanned]);

    // ... [Map Panning Logic remains unchanged] ...
    useEffect(() => {
        if (!mapRef.current || isUserPanned || isReplayMode) return;
        let target: Location | Omit<Location, 'alt'> | undefined;
        if (selectedDroneId && drones[selectedDroneId]) {
            target = drones[selectedDroneId].location;
        } else if (selectedAnomalyId) {
            target = anomalies.find(a => a.id === selectedAnomalyId)?.location;
        } else if (selectedThreatId) {
            target = threats.find(t => t.id === selectedThreatId)?.location;
        } else if (selectedTargetDesignationId) {
            target = aiTargetDesignations.find(d => d.id === selectedTargetDesignationId)?.targetLocation;
        } else if (selectedGeofenceEventId) {
            target = geofenceEvents.find(e => e.id === selectedGeofenceEventId)?.location;
        }
        if (target) {
            mapRef.current.panTo([target.lat, target.lon]);
        }
    }, [selectedDroneId, selectedAnomalyId, selectedThreatId, selectedTargetDesignationId, selectedGeofenceEventId, drones, anomalies, threats, aiTargetDesignations, geofenceEvents, isUserPanned, isReplayMode]);
    
    useEffect(() => {
        if (!selectedDroneId && !selectedAnomalyId && !selectedThreatId && !selectedTargetDesignationId && !selectedGeofenceEventId) {
            setIsUserPanned(false);
        }
    }, [selectedDroneId, selectedAnomalyId, selectedThreatId, selectedTargetDesignationId, selectedGeofenceEventId]);

    return (
         <div className="relative h-full min-h-[450px] bg-gray-900">
            <div ref={mapContainerRef} className="h-full w-full z-10" />
            {isUserPanned && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                    <button 
                        onClick={() => setIsUserPanned(false)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg animate-pulse"
                        title={t('map.recenter_title')}
                    >
                        {t('map.recenter_button')}
                    </button>
                </div>
            )}
            {isDrawingGeofence && (
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-gray-900/80 p-3 rounded-lg flex items-center gap-4">
                    <p className="text-cyan-300 font-semibold">{t('geofence.drawing.prompt')}</p>
                    <button onClick={onCancelDrawing} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">{t('geofence.drawing.cancel')}</button>
                    {newGeofencePoints.length >= 3 && (
                        <button onClick={onFinishDrawing} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">{t('geofence.drawing.finish')}</button>
                    )}
                </div>
            )}
        </div>
    );
};