import { GoogleGenAI, Type } from "@google/genai";
import {
    type Drones,
    type Drone,
    DroneStatus,
    type Location,
    type Anomaly,
    AnomalyRepairStatus,
    type DiagnosticsReport,
    DiagnosticStatus,
    type AIActionRequest,
    AIAction,
    AIPriority,
    type AITargetDesignationRequest,
    type FlightAnalysisSuggestion,
    FlightSuggestionType,
    type DiagnosticCheck,
    type Threat,
    ThreatType,
    type WeatherData,
    type UnidentifiedFlyingObject,
    type UFOType,
    type Geofence,
    type AICommResponse,
    type EliminationEvent,
    // FIX: Import CounterUAS types to support the new functionality.
    type CounterUASSystem,
    CounterUASStatus,
} from '../types';
import { MPH_TO_MULTIPLIER, MULTIPLIER_TO_MPH } from '../constants';

// --- MOCK API SIMULATION ---

let drones: Drones = {};
let anomalies: Anomaly[] = [];
let aiActionRequests: AIActionRequest[] = [];
let aiTargetDesignations: AITargetDesignationRequest[] = [];
let flightSuggestions: FlightAnalysisSuggestion[] = [];
let threats: Threat[] = [];
let ufos: UnidentifiedFlyingObject[] = [];
let eliminationEvents: EliminationEvent[] = [];
// State for the Counter-UAS System
let counterUASSystems: Record<string, CounterUASSystem> = {};

const evasionTimers: Record<string, number> = {};
let geofenceConfig: Geofence[] = [];
let commandLogCallback: (log: any) => void = () => {};

// Log to track which asset eliminated which target for deconfliction messaging
interface EliminationRecord {
    targetId: string;
    source: string;
    timestamp: number;
}
let eliminationLog: EliminationRecord[] = [];


const SIMULATION_SPEED = 1; // Increase for faster simulation
const ANOMALY_CHANCE = 0.005;
const AI_REQUEST_CHANCE = 0.01;
const FLIGHT_SUGGESTION_CHANCE = 0.008;
const THREAT_CHANCE = 0.003;
const FPV_DRONE_CHANCE = 0.02;


// Base location coordinates. Altitude is in meters.
const BASE_LOCATIONS = [
    { lat: 6.232241, lon: 1.477163, alt: 0 },
    { lat: 6.137378, lon: 1.198244, alt: 0 }
];

const SIMULATION_CENTER = {
    lat: (BASE_LOCATIONS[0].lat + BASE_LOCATIONS[1].lat) / 2,
    lon: (BASE_LOCATIONS[0].lon + BASE_LOCATIONS[1].lon) / 2
};

const HAZARD_ZONES = [
    { center: { lat: 37.78, lon: -122.45 }, radius: 0.01, type: FlightSuggestionType.HIGH_TURBULENCE },
    { center: { lat: 37.75, lon: -122.40 }, radius: 0.015, type: FlightSuggestionType.SIGNAL_LOSS_ZONE },
];

// FIX: Added missing AIAction.ENGAGE_GROUND_DEFENSE to satisfy the Record<AIAction, AIPriority> type.
const actionToPriority: Record<AIAction, AIPriority> = {
    [AIAction.FLY_INTO_THREAT]: AIPriority.Critical,
    [AIAction.FLY_INTO_TARGET]: AIPriority.Critical,
    [AIAction.FLY_INTO_ENEMY_VEHICLE]: AIPriority.Critical,
    [AIAction.ABORT_MISSION]: AIPriority.Critical,
    [AIAction.ENGAGE_GROUND_DEFENSE]: AIPriority.Critical,
    [AIAction.DROP_PAYLOAD]: AIPriority.High,
    [AIAction.ENGAGE_COUNTERMEASURES]: AIPriority.High,
    [AIAction.DEPLOY_SENSOR]: AIPriority.High,
    [AIAction.RETURN_TO_BASE]: AIPriority.Medium,
    [AIAction.ALTER_COURSE]: AIPriority.Medium,
    [AIAction.HOVER_OVER_TARGET]: AIPriority.Medium,
    [AIAction.SCAN_AREA]: AIPriority.Medium,
    [AIAction.COUNTER_COMMAND]: AIPriority.Medium,
    [AIAction.CALIBRATE_ON_IMAGE]: AIPriority.Low,
};

function initializeDrones() {
    const dronesPerBaseConfig = {
        'Assault': 19,
        'Recon': 7,
        'Interceptor': 24,
    };

    // Counters for each drone type to ensure unique IDs across all bases
    let assaultCounter = 1;
    let reconCounter = 1;
    let interceptorCounter = 1;

    const prefixMap: Record<Drone['droneType'], string> = {
        'Assault': 'ASLT',
        'Recon': 'SRVL', // SRVL for Surveillance
        'Interceptor': 'INTER',
    };

    // Clear any existing drones before initializing to ensure a fresh start
    drones = {};

    for (let baseIndex = 0; baseIndex < BASE_LOCATIONS.length; baseIndex++) {
        const baseLocation = BASE_LOCATIONS[baseIndex];

        for (const type in dronesPerBaseConfig) {
            const droneType = type as Drone['droneType'];
            const count = dronesPerBaseConfig[droneType];
            const prefix = prefixMap[droneType];

            for (let i = 0; i < count; i++) {
                let id: string;

                switch (droneType) {
                    case 'Assault':
                        id = `${prefix}-${assaultCounter++}`;
                        break;
                    case 'Recon':
                        id = `${prefix}-${reconCounter++}`;
                        break;
                    case 'Interceptor':
                        id = `${prefix}-${interceptorCounter++}`;
                        break;
                }

                const drone: Drone = {
                    status: DroneStatus.GROUNDED,
                    location: { ...baseLocation },
                    battery: 95 + Math.random() * 5,
                    target_locked: false,
                    signal_strength: 90 + Math.random() * 10,
                    cruisingSpeed: droneType === 'Assault' ? 10.6 : (droneType === 'Interceptor' ? 40.0 : 5.0),
                    cruisingAltitude: 100, // Altitude in meters.
                    mission_target: null,
                    droneType: droneType,
                    interceptTargetId: null,
                    interceptThreatId: null,
                    isEliminationApproved: false,
                    eliminationRequestSent: false,
                    homeBaseIndex: baseIndex,
                };
                (drone as any).hoveringSince = null;
                drones[id] = drone;
            }
        }
    }
}

function initializeCounterUAS() {
    counterUASSystems = {
        'b1-turret-01': {
            id: 'b1-turret-01',
            location: { ...BASE_LOCATIONS[0], alt: 10 },
            status: CounterUASStatus.SCANNING,
            ammo: 150,
            maxAmmo: 150,
            detectionRadius: 2500,
            engagementRadius: 1200,
            currentTargetId: null,
            mode: 'human_in_loop'
        },
        'b2-turret-01': {
            id: 'b2-turret-01',
            location: { ...BASE_LOCATIONS[1], alt: 10 },
            status: CounterUASStatus.SCANNING,
            ammo: 150,
            maxAmmo: 150,
            detectionRadius: 2500,
            engagementRadius: 1200,
            currentTargetId: null,
            mode: 'human_in_loop'
        }
    };
}


const getDistance = (loc1: Omit<Location, 'alt'>, loc2: Omit<Location, 'alt'>) => {
    const dy = (loc1.lat - loc2.lat) * 111139;
    const dx = (loc1.lon - loc2.lon) * 111139 * Math.cos(loc1.lat * Math.PI / 180);
    return Math.sqrt(dx * dx + dy * dy);
};

const getDistance3D = (loc1: Location, loc2: Location) => {
    const d_2d = getDistance(loc1, loc2);
    const dz = loc1.alt - loc2.alt;
    return Math.sqrt(d_2d*d_2d + dz*dz);
}

const calculateNewCoords = (lat: number, lon: number, bearing: number, distance: number) => {
    const R = 6371; // Earth's radius in km
    const d = distance / R; // Angular distance
    const brng = bearing * Math.PI / 180; // Bearing in radians

    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
    let lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    
    // Normalize lon2 to -180 to +180
    lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;

    return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
};

function initializeUFOs() {
    const ufoTypes: UFOType[] = ['commercial_jet', 'private_plane', 'helicopter', 'unknown_uav'];
    for (let i = 0; i < 5; i++) {
        const type = ufoTypes[i % ufoTypes.length];
        ufos.push({
            id: `ufo_${i + 1}`,
            type: type,
            location: {
                lat: SIMULATION_CENTER.lat + (Math.random() - 0.5) * 0.5,
                lon: SIMULATION_CENTER.lon + (Math.random() - 0.5) * 0.5,
                alt: 5000 + Math.random() * 5000, // 5-10km altitude
            },
            speed: 400 + Math.random() * 400, // 400-800 km/h
            heading: Math.random() * 360,
        });
    }
}

function updateUFOSimulation() {
    ufos.forEach(ufo => {
        const distanceMoved = (ufo.speed / 3600) * SIMULATION_SPEED; // distance in km for this tick
        const { lat, lon } = calculateNewCoords(ufo.location.lat, ufo.location.lon, ufo.heading, distanceMoved);
        ufo.location.lat = lat;
        ufo.location.lon = lon;

        // Simple boundary check to wrap around or reverse direction
        if (lat > SIMULATION_CENTER.lat + 2 || lat < SIMULATION_CENTER.lat - 2 || lon > SIMULATION_CENTER.lon + 2 || lon < SIMULATION_CENTER.lon - 2) {
             ufo.heading = (ufo.heading + 180) % 360;
        }
    });

    // Chance to spawn a fast FPV drone threat
    if (Math.random() < FPV_DRONE_CHANCE * SIMULATION_SPEED && ufos.filter(u => u.type === 'fpv_drone').length < 2) {
        ufos.push({
            id: `ufo_fpv_${Date.now()}`,
            type: 'fpv_drone',
            location: {
                lat: SIMULATION_CENTER.lat + (Math.random() - 0.5) * 0.2,
                lon: SIMULATION_CENTER.lon + (Math.random() - 0.5) * 0.2,
                alt: 50 + Math.random() * 250, // 50-300m low altitude
            },
            speed: 100 + Math.random() * 50, // 100-150 km/h
            heading: Math.random() * 360,
        });
    }
}

// --- Simulation Sub-functions ---

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

function updateCounterUASSimulation() {
    Object.values(counterUASSystems).forEach(system => {
        if (system.status === 'disabled') return;

        const uasLocation = system.location;

        // Handle reloading state
        if (system.status === CounterUASStatus.RELOADING) {
            // This state is entered below, and has its own timeout to exit.
            return;
        }
        
        // Check if current target is still valid (not destroyed or out of range)
        if (system.currentTargetId) {
            const currentTarget = ufos.find(u => u.id === system.currentTargetId);
            if (!currentTarget || getDistance3D(uasLocation, currentTarget.location) > system.detectionRadius) {
                system.currentTargetId = null;
                // If it was engaging, stop and log it
                if (system.status === CounterUASStatus.ENGAGING) {
                     commandLogCallback({
                        target: system.id, command: 'Target Lost', status: 'Failed',
                        details: 'Target left engagement radius or was destroyed by other means.'
                    });
                }
                system.status = CounterUASStatus.SCANNING;
            }
        }

        switch (system.status) {
            case CounterUASStatus.SCANNING: {
                // In human-in-the-loop, AI will find targets and ask for permission.
                if (system.mode === 'human_in_loop') {
                    const hostileUFOs = ufos.filter(u =>
                        (u.type === 'fpv_drone' || u.type === 'unknown_uav') &&
                        getDistance3D(uasLocation, u.location) <= system.detectionRadius &&
                        // Make sure we haven't already created a request for this ufo from this system
                        !aiActionRequests.some(r => r.droneId === system.id && r.reason.includes(u.id.slice(-4)))
                    );

                    if (hostileUFOs.length > 0) {
                        // Target the closest one to propose engagement
                        hostileUFOs.sort((a, b) => getDistance3D(uasLocation, a.location) - getDistance3D(uasLocation, b.location));
                        const newTarget = hostileUFOs[0];

                        if (getDistance3D(uasLocation, newTarget.location) <= system.engagementRadius) {
                            system.currentTargetId = newTarget.id;
                            system.status = CounterUASStatus.TARGETING;
                            
                            // Create a request for the operator
                            aiActionRequests.push({
                                id: `req_cuas_${system.id}_${Date.now()}`,
                                droneId: system.id, // Use system ID
                                action: AIAction.ENGAGE_GROUND_DEFENSE,
                                reason: `Hostile UAV ${newTarget.id.slice(-4)} detected within engagement range. Requesting permission to engage.`,
                                priority: AIPriority.Critical,
                                timestamp: new Date().toISOString(),
                            });
                        }
                    }
                }
                break;
            }

            case CounterUASStatus.TARGETING: {
                // Waiting for operator approval. The approval will change the state to ENGAGING.
                // If the target leaves the radius while waiting, the check at the top will handle it.
                break;
            }

            case CounterUASStatus.ENGAGING: {
                if (system.ammo <= 0) {
                    system.status = CounterUASStatus.RELOADING;
                    commandLogCallback({
                        target: system.id, command: 'Reloading', status: 'Success',
                        details: 'Ammunition depleted. Initiating 15-second reload cycle.'
                    });
                    setTimeout(() => {
                        const currentSystem = counterUASSystems[system.id];
                        if(currentSystem) {
                            currentSystem.ammo = currentSystem.maxAmmo;
                            currentSystem.status = CounterUASStatus.SCANNING;
                            commandLogCallback({
                                target: system.id, command: 'Reload Complete', status: 'Success',
                                details: 'System is re-armed and resuming scan.'
                            });
                        }
                    }, 15000); // 15s reload time
                    break;
                }

                const target = ufos.find(u => u.id === system.currentTargetId);
                if (target) {
                    system.ammo -= 5; // Fire a burst
                    const distance = getDistance3D(uasLocation, target.location);
                    // 90% hit chance at close range, decreasing with distance
                    const hitChance = 0.9 * (1 - (distance / system.engagementRadius));

                    if (Math.random() < hitChance) {
                        eliminationEvents.push({ targetId: target.id, location: target.location, timestamp: Date.now() });
                        eliminationLog.push({ targetId: target.id, source: system.id, timestamp: Date.now() });
                        ufos = ufos.filter(u => u.id !== target.id);
                        system.currentTargetId = null;
                        system.status = CounterUASStatus.SCANNING;
                    }
                } else {
                    // Target lost (e.g. destroyed by drone)
                    system.status = CounterUASStatus.SCANNING;
                }
                break;
            }
        }
    });
}


function runInterceptorAI() {
    const protectedGeofences = geofenceConfig.filter(g => g.interceptorDefense);
    if (protectedGeofences.length === 0) return;

    const threatsToIntercept = ufos.filter(ufo => {
        // A UFO is a threat if it's already being intercepted OR it meets the criteria
        const isAlreadyTargetedByDrone = Object.values(drones).some(d => d.interceptTargetId === ufo.id);
        if (isAlreadyTargetedByDrone) return false;

        const isThreatType = ufo.type === 'fpv_drone' || ufo.type === 'unknown_uav';
        const isHighSpeed = ufo.speed > 100;
        const isLowAltitude = ufo.location.alt < 500;
        const isInProtectedZone = protectedGeofences.some(fence => isPointInPolygon(ufo.location, fence.points));
        
        // DECONFLICTION: Let C-UAS handle threats within its close-in engagement range.
        const isCUASTarget = Object.values(counterUASSystems).some(system => {
            // Only consider active systems
            if (system.status === CounterUASStatus.DISABLED || system.status === CounterUASStatus.RELOADING) {
                return false;
            }
            return getDistance3D(ufo.location, system.location) <= system.engagementRadius;
        });
        
        if (isCUASTarget) {
            return false; // Let the C-UAS handle it.
        }

        return isThreatType && isHighSpeed && isLowAltitude && isInProtectedZone;
    });

    for (const threat of threatsToIntercept) {
        // Find the closest available interceptor drone
        let closestInterceptor: { id: string; drone: Drone; distance: number } | null = null;

        Object.entries(drones).forEach(([id, drone]) => {
            if (drone.droneType === 'Interceptor' && (drone.status === DroneStatus.GROUNDED || drone.status === DroneStatus.HOVERING_AT_BASE)) {
                const distance = getDistance3D(drone.location, threat.location);
                if (!closestInterceptor || distance < closestInterceptor.distance) {
                    closestInterceptor = { id, drone, distance };
                }
            }
        });

        if (closestInterceptor) {
            const interceptor = closestInterceptor.drone;
            interceptor.status = DroneStatus.INTERCEPTING;
            interceptor.interceptTargetId = threat.id;
            // Log this action
            commandLogCallback({
                target: `AI Defense System`,
                command: 'Dispatch Interceptor',
                status: 'Success',
                details: `Interceptor ${closestInterceptor.id} dispatched to neutralize hostile FPV drone ${threat.id}.`
            });
        }
    }
}

function runThreatInterceptorAI() {
    const protectedGeofences = geofenceConfig.filter(g => g.interceptorDefense);
    if (protectedGeofences.length === 0) return;

    const threatsToIntercept = threats.filter(threat => {
        const isEligibleThreat = (threat.type === ThreatType.UNIDENTIFIED_DRONE || threat.type === ThreatType.HOSTILE_AIRCRAFT) &&
            (threat.severity === 'Critical' || threat.severity === 'High') &&
            threat.responseStatus === 'pending' &&
            // Ensure no interceptor is already assigned to this threat
            !Object.values(drones).some(d => d.interceptThreatId === threat.id);
        
        if (!isEligibleThreat) return false;

        // Check if the threat is inside any of the protected zones.
        const isInProtectedZone = protectedGeofences.some(fence => isPointInPolygon(threat.location, fence.points));

        return isInProtectedZone;
    });

    for (const threat of threatsToIntercept) {
        let closestInterceptor: { id: string; drone: Drone; distance: number } | null = null;
        Object.entries(drones).forEach(([id, drone]) => {
            if (drone.droneType === 'Interceptor' && (drone.status === DroneStatus.GROUNDED || drone.status === DroneStatus.HOVERING_AT_BASE)) {
                const distance = getDistance3D(drone.location, threat.location);
                if (!closestInterceptor || distance < closestInterceptor.distance) {
                    closestInterceptor = { id, drone, distance };
                }
            }
        });

        if (closestInterceptor) {
            const interceptorId = closestInterceptor.id;
            const interceptor = closestInterceptor.drone;
            
            // Immediately dispatch the drone to intercept, starting the observation phase
            interceptor.interceptThreatId = threat.id;
            interceptor.isEliminationApproved = false;
            interceptor.eliminationRequestSent = false;
            
            // Launch if grounded, otherwise start intercepting immediately
            if (interceptor.status === DroneStatus.GROUNDED) {
                interceptor.status = DroneStatus.LAUNCHING;
            } else {
                interceptor.status = DroneStatus.INTERCEPTING;
            }
            
            // Mark threat as being handled
            threat.responseStatus = 'acknowledged';

            commandLogCallback({
                target: `AI Defense System`,
                command: 'Dispatch Interceptor',
                status: 'Success',
                details: `Interceptor ${interceptorId} dispatched to observe threat ${threat.id}.`
            });
        }
    }
}

function runReconAI() {
    // Find threats that match the user's specific criteria.
    const reconThreats = threats.filter(threat =>
        threat.type === ThreatType.UNIDENTIFIED_DRONE &&
        threat.responseStatus === 'pending' &&
        threat.details === "Unidentified drone detected near restricted airspace."
    );

    if (reconThreats.length === 0) return;

    // Get all our active drones to check for proximity.
    const activeDrones = Object.values(drones).filter(d => d.status !== DroneStatus.GROUNDED);
    if (activeDrones.length === 0) return;

    for (const threat of reconThreats) {
        // Check if any active drone is too close to this threat
        const isProximate = activeDrones.some(activeDrone => {
            const distance = getDistance3D(activeDrone.location, threat.location);
            return distance < 15; // 15 meters proximity threshold
        });

        if (isProximate) {
            // Find the closest available Recon drone.
            let closestRecon: { id: string; drone: Drone; distance: number } | null = null;

            Object.entries(drones).forEach(([id, drone]) => {
                if (drone.droneType === 'Recon' && (drone.status === DroneStatus.GROUNDED || drone.status === DroneStatus.HOVERING_AT_BASE)) {
                    const distanceToThreat = getDistance3D(drone.location, threat.location);
                    if (!closestRecon || distanceToThreat < closestRecon.distance) {
                        closestRecon = { id, drone, distance: distanceToThreat };
                    }
                }
            });

            if (closestRecon) {
                const reconDrone = closestRecon.drone;
                const reconDroneId = closestRecon.id;
                const reconAltitude = threat.location.alt + 30; // Recon altitude 30m above threat

                // Dispatch the drone.
                reconDrone.mission_target = { ...threat.location, alt: reconAltitude };
                reconDrone.cruisingAltitude = reconAltitude;

                if (reconDrone.status === DroneStatus.GROUNDED) {
                    reconDrone.status = DroneStatus.LAUNCHING;
                } else {
                    reconDrone.status = DroneStatus.MISSION;
                }

                // Mark threat as handled to prevent re-dispatching.
                threat.responseStatus = 'acknowledged';

                commandLogCallback({
                    target: `AI Defense System`,
                    command: 'Dispatch Recon Drone',
                    status: 'Success',
                    details: `Recon drone ${reconDroneId} autonomously dispatched to investigate threat ${threat.id} due to proximity alert.`
                });
            }
        }
    }
}

function runTargetDesignationAI() {
    const targetableThreats = threats.filter(threat => 
        (threat.severity === 'Critical' || threat.severity === 'High') &&
        threat.responseStatus === 'pending' &&
        (threat.type === ThreatType.HOSTILE_AIRCRAFT || threat.type === ThreatType.UNIDENTIFIED_DRONE)
    );

    if (targetableThreats.length === 0) return;

    const availableDrones = Object.entries(drones).filter(([, drone]) =>
        (drone.droneType === 'Assault' || drone.droneType === 'Interceptor') &&
        (drone.status === DroneStatus.GROUNDED || drone.status === DroneStatus.HOVERING_AT_BASE)
    );

    if (availableDrones.length === 0) return;

    for (const threat of targetableThreats) {
        let closestInterceptor: { id: string; distance: number } | null = null;
        let closestAssault: { id: string; distance: number } | null = null;
        
        for (const [id, drone] of availableDrones) {
            const distance = getDistance3D(drone.location, threat.location);
            if (drone.droneType === 'Interceptor') {
                if (!closestInterceptor || distance < closestInterceptor.distance) {
                    closestInterceptor = { id, distance };
                }
            } else if (drone.droneType === 'Assault') {
                 if (!closestAssault || distance < closestAssault.distance) {
                    closestAssault = { id, distance };
                }
            }
        }
        
        // Prioritize suggesting an Interceptor if one is available, otherwise fall back to an Assault drone.
        const closestDroneInfo = closestInterceptor || closestAssault;

        if (closestDroneInfo) {
            const suggestedDroneId = closestDroneInfo.id;
            const newDesignation: AITargetDesignationRequest = {
                id: `td_${Date.now()}`,
                timestamp: new Date().toISOString(),
                sourceType: 'threat',
                sourceId: threat.id,
                targetLocation: threat.location,
                reason: `AI recommends engagement of ${threat.severity.toLowerCase()} ${threat.type.replace(/_/g, ' ')}.`,
                suggestedDroneId,
                suggestedAction: DroneStatus.MISSION
            };
            aiTargetDesignations.push(newDesignation);
            
            // Mark threat as being targeted by AI to avoid duplicate suggestions
            threat.responseStatus = 'ai_targeting';

            commandLogCallback({
                target: 'AI Targeting System',
                command: 'New Target Designation',
                status: 'Success',
                details: `AI suggests tasking drone ${suggestedDroneId} to engage threat ${threat.id}. Awaiting operator confirmation.`,
                alert: { preferenceKey: 'newAITargetDesignation', type: 'notification', messageKey: 'alerts.new_ai_target_designation' }
            });

            // Remove the suggested drone from the pool for this cycle to prevent it from being suggested for multiple targets at once.
            const droneIndex = availableDrones.findIndex(([id]) => id === suggestedDroneId);
            if (droneIndex > -1) {
                availableDrones.splice(droneIndex, 1);
            }
        }
    }
}


function generateHoveringAIRequest(id: string, drone: Drone) {
    // Check if there is already a request for this drone to avoid duplicates
    if (aiActionRequests.some(r => r.droneId === id)) return;

    let action: AIAction | null = null;
    let reason = "";

    if (drone.droneType === 'Assault') {
        const vehicleChance = Math.random();
        if (vehicleChance < 0.33) {
            action = AIAction.DROP_PAYLOAD;
            reason = "Optimal payload drop coordinates achieved.";
        } else if (vehicleChance < 0.66) {
            action = AIAction.FLY_INTO_TARGET;
            reason = "Target confirmed as high-value static structure.";
        } else {
            action = AIAction.FLY_INTO_ENEMY_VEHICLE;
            reason = "Target identified as mobile enemy vehicle.";
        }
    } else if (drone.droneType === 'Interceptor') {
        action = AIAction.FLY_INTO_THREAT;
        reason = `Interceptor has reached target coordinates. Requesting permission to eliminate potential threat.`;
    } else { // Recon drone
        const reconChoice = Math.random();
        if (reconChoice < 0.33) {
            action = AIAction.HOVER_OVER_TARGET;
            reason = "Initiating reconnaissance orbit for detailed surveillance.";
        } else if (reconChoice < 0.66) {
            action = AIAction.SCAN_AREA;
            reason = "Beginning grid scan for comprehensive area coverage.";
        } else {
            action = AIAction.DEPLOY_SENSOR;
            reason = "Deploying persistent sensor at target location.";
        }
    }
    
    if (action) {
         aiActionRequests.push({
            id: `req_${Date.now()}_${id}`,
            droneId: id, action, reason,
            priority: actionToPriority[action],
            timestamp: new Date().toISOString(),
        });
    }
}

function updateDronePhysicsAndState(id: string, drone: Drone) {
    // This factor is increased to make drone movement visually faster and more realistic,
    // ensuring the visual speed matches the logical speed used for collision detection.
    const DRONE_SPEED_FACTOR = 0.00025 * drone.cruisingSpeed * SIMULATION_SPEED;
    const ALTITUDE_CHANGE_RATE = 2 * SIMULATION_SPEED;
    
    // Reset ETA each tick, it will be recalculated if the drone is on a mission.
    drone.eta = undefined;

    // Battery drain
    if (drone.status !== DroneStatus.GROUNDED) {
        drone.battery -= 0.01 * SIMULATION_SPEED;
        if (drone.battery < 0) drone.battery = 0;
    }

    // State transitions
    switch (drone.status) {
        case DroneStatus.INTERCEPTING: {
            const altitudeChangeRateInterceptor = ALTITUDE_CHANGE_RATE * 5; // Interceptors change altitude faster
            let targetObject: (Threat | UnidentifiedFlyingObject) & { speed?: number, heading?: number } | null = null;

            if (drone.interceptTargetId) {
                targetObject = ufos.find(u => u.id === drone.interceptTargetId) || null;
            } else if (drone.interceptThreatId) {
                targetObject = threats.find(t => t.id === drone.interceptThreatId) || null;
            }

            if (!targetObject) {
                const originalTargetId = drone.interceptTargetId || drone.interceptThreatId;
                if (originalTargetId) {
                    const now = Date.now();
                    // Look for a very recent elimination event for this target
                    const recentElimination = eliminationLog.find(e => e.targetId === originalTargetId && (now - e.timestamp < 5000)); // 5 second window
            
                    if (recentElimination) {
                        commandLogCallback({
                            target: id,
                            command: 'Disengaging',
                            status: 'Success',
                            details: `Target neutralized by ${recentElimination.source}. Aborting intercept.`
                        });
                    } else {
                        commandLogCallback({
                            target: id,
                            command: 'Target Lost',
                            status: 'Failed',
                            details: `Lost contact with target. May have evaded or left operational area.`
                        });
                    }
                }
            
                drone.status = DroneStatus.RETURNING_TO_BASE;
                drone.interceptTargetId = null;
                drone.interceptThreatId = null;
                drone.mission_target = null;
                (drone as any).hoveringSince = null;
                break;
            }

            if (drone.isEliminationApproved) {
                // --- ELIMINATION PHASE ---
                const distanceToTarget = getDistance3D(drone.location, targetObject.location);

                // --- FIX: Add overshoot protection by checking if the next move will reach or pass the target ---
                const speedMps = drone.cruisingSpeed * MULTIPLIER_TO_MPH * 0.44704;
                const ELIMINATION_SPEED_MULTIPLIER = 5;
                const kamikazeSpeedMps = speedMps * ELIMINATION_SPEED_MULTIPLIER;
                const stepDistance = kamikazeSpeedMps * SIMULATION_SPEED;

                if (distanceToTarget < 20 || distanceToTarget <= stepDistance) { // Neutralization radius or will reach on next step
                    eliminationEvents.push({ targetId: targetObject.id, location: targetObject.location, timestamp: Date.now() });
                    eliminationLog.push({ targetId: targetObject.id, source: id, timestamp: Date.now() });
                    // Remove target
                    if (drone.interceptTargetId) {
                        commandLogCallback({
                            target: `AI Defense System`,
                            command: 'Target Eliminated',
                            status: 'Success',
                            details: `Drone ${id} neutralized hostile FPV drone ${drone.interceptTargetId}.`,
                            alert: { preferenceKey: 'interceptionSuccess', type: 'success', messageKey: 'alerts.interception_success_alert', options: { droneId: id } }
                        });
                        ufos = ufos.filter(u => u.id !== drone.interceptTargetId);
                    } else if (drone.interceptThreatId) {
                        commandLogCallback({
                            target: `AI Defense System`,
                            command: 'Threat Eliminated',
                            status: 'Success',
                            details: `Drone ${id} neutralized threat ${drone.interceptThreatId}.`,
                            alert: { preferenceKey: 'interceptionSuccess', type: 'success', messageKey: 'alerts.interception_success_alert', options: { droneId: id } }
                        });
                        threats = threats.filter(t => t.id !== drone.interceptThreatId);
                    }

                    // Drone is expended
                    delete drones[id];
                    return; // Stop processing this drone
                }

                // Kamikaze: Move directly towards the target's CURRENT location with high speed
                const target = targetObject.location;
                const angle = Math.atan2(target.lat - drone.location.lat, target.lon - drone.location.lon);
                drone.location.lat += Math.sin(angle) * DRONE_SPEED_FACTOR * ELIMINATION_SPEED_MULTIPLIER;
                drone.location.lon += Math.cos(angle) * DRONE_SPEED_FACTOR * ELIMINATION_SPEED_MULTIPLIER;

                if (Math.abs(drone.location.alt - target.alt) > altitudeChangeRateInterceptor) {
                    drone.location.alt += Math.sign(target.alt - drone.location.alt) * altitudeChangeRateInterceptor;
                } else {
                    drone.location.alt = target.alt;
                }

            } else {
                // --- OBSERVATION & REQUEST PHASE ---
                /**
                 * OPERATOR DIRECTIVE:
                 * To all Interception Drones on Mission: When Target is acquired, track target
                 * over GPS coordinates and magnetic Directions until AI action is approved by Operator.
                 */
                // Use pure pursuit (direct chase) to avoid confusing "fly-by" maneuvers.
                // The interceptor is fast enough to make this effective.
                const targetLocationToAimFor = targetObject.location;
                const distanceToTarget = getDistance3D(drone.location, targetLocationToAimFor);

                // Move directly towards target's current location to observe
                const target = targetLocationToAimFor;
                const angle = Math.atan2(target.lat - drone.location.lat, target.lon - drone.location.lon);
                const OBSERVATION_SPEED_MULTIPLIER = 3;
                drone.location.lat += Math.sin(angle) * DRONE_SPEED_FACTOR * OBSERVATION_SPEED_MULTIPLIER;
                drone.location.lon += Math.cos(angle) * DRONE_SPEED_FACTOR * OBSERVATION_SPEED_MULTIPLIER;

                if (Math.abs(drone.location.alt - target.alt) > altitudeChangeRateInterceptor) {
                    drone.location.alt += Math.sign(target.alt - drone.location.alt) * altitudeChangeRateInterceptor;
                } else {
                    drone.location.alt = target.alt;
                }
                
                // When close enough, request approval to eliminate the target.
                if (distanceToTarget < 200 && !drone.eliminationRequestSent) {
                    aiActionRequests.push({
                        id: `req_elim_${Date.now()}_${id}`,
                        droneId: id,
                        action: AIAction.FLY_INTO_THREAT,
                        reason: `Hostile target ${targetObject.id} within optimal engagement range. Requesting permission to eliminate.`,
                        priority: AIPriority.Critical,
                        timestamp: new Date().toISOString(),
                        threatId: drone.interceptThreatId || undefined,
                    });
                    drone.eliminationRequestSent = true;
                }
            }
            break;
        }
        case DroneStatus.LAUNCHING:
            drone.location.alt += ALTITUDE_CHANGE_RATE;
            if (drone.location.alt >= drone.cruisingAltitude) {
                drone.location.alt = drone.cruisingAltitude;
                if (drone.interceptTargetId || drone.interceptThreatId) {
                    drone.status = DroneStatus.INTERCEPTING;
                } else if (drone.mission_target) {
                    drone.status = DroneStatus.MISSION;
                } else {
                    drone.status = DroneStatus.HOVERING_AT_BASE;
                }
            }
            break;
        case DroneStatus.LANDING:
            const homeBaseForLanding = drone.homeBaseIndex !== undefined ? BASE_LOCATIONS[drone.homeBaseIndex] : BASE_LOCATIONS[0];
            drone.location.alt -= ALTITUDE_CHANGE_RATE;
            if (drone.location.alt <= 0) {
                drone.location.alt = 0;
                drone.location.lat = homeBaseForLanding.lat;
                drone.location.lon = homeBaseForLanding.lon;
                drone.status = DroneStatus.GROUNDED;
            }
            break;
        case DroneStatus.MISSION:
        case DroneStatus.AI_OVERRIDE:
        case DroneStatus.RETURNING_TO_BASE: {
            const homeBase = drone.homeBaseIndex !== undefined ? BASE_LOCATIONS[drone.homeBaseIndex] : BASE_LOCATIONS[0];
            
            let targetLocation;
            let isReturningHome = false;

            if (drone.status === DroneStatus.RETURNING_TO_BASE) {
                targetLocation = homeBase;
                isReturningHome = true;
            } else if (drone.status === DroneStatus.AI_OVERRIDE) {
                let liveTarget: (Threat | UnidentifiedFlyingObject) | null = null;
                if (drone.missionTargetId) {
                    liveTarget = threats.find(t => t.id === drone.missionTargetId) || ufos.find(u => u.id === drone.missionTargetId) || null;
                }

                if (liveTarget) {
                    // Update drone's mission target to the live location for continuous tracking
                    targetLocation = liveTarget.location;
                    drone.mission_target = liveTarget.location;
                } else if (drone.mission_target) {
                    // Fallback to static target if live target is gone or was never set
                    targetLocation = drone.mission_target;
                } else {
                    // No target, return to base
                    targetLocation = homeBase;
                    isReturningHome = true;
                }
            } else { // MISSION
                targetLocation = drone.mission_target;
            }
            
            if (targetLocation) {
                const speedMps = drone.cruisingSpeed * MULTIPLIER_TO_MPH * 0.44704;

                if (drone.status === DroneStatus.AI_OVERRIDE && drone.isEliminationApproved) {
                    const distance3d = getDistance3D(drone.location, targetLocation);
                    const kamikazeSpeedMps = speedMps * 5; // ELIMINATION_SPEED_MULTIPLIER
                    const stepDistance = kamikazeSpeedMps * SIMULATION_SPEED;

                    if (distance3d < 20 || distance3d <= stepDistance) {
                        if (drone.missionTargetId) {
                            const targetId = drone.missionTargetId;
                            const threatTarget = threats.find(t => t.id === targetId);
                            const ufoTarget = ufos.find(u => u.id === targetId);
                            const target = threatTarget || ufoTarget;

                            if (target) {
                                eliminationEvents.push({ targetId: target.id, location: target.location, timestamp: Date.now() });
                                eliminationLog.push({ targetId: target.id, source: id, timestamp: Date.now() });
                                if (threatTarget) {
                                    threats = threats.filter(t => t.id !== targetId);
                                }
                                if (ufoTarget) {
                                    ufos = ufos.filter(u => u.id !== targetId);
                                }
                            }
                        }

                        commandLogCallback({
                            target: `Drone ${id}`, command: 'Target Eliminated', status: 'Success',
                            details: `Drone ${id} successfully eliminated its mission target.`,
                            alert: { preferenceKey: 'interceptionSuccess', type: 'success', messageKey: 'alerts.interception_success_alert', options: { droneId: id } }
                        });
                        delete drones[id];
                        return; // Drone destroyed, stop processing
                    }

                    const angle = Math.atan2(targetLocation.lat - drone.location.lat, targetLocation.lon - drone.location.lon);
                    const ELIMINATION_SPEED_MULTIPLIER = 5;
                    drone.location.lat += Math.sin(angle) * DRONE_SPEED_FACTOR * ELIMINATION_SPEED_MULTIPLIER;
                    drone.location.lon += Math.cos(angle) * DRONE_SPEED_FACTOR * ELIMINATION_SPEED_MULTIPLIER;
                    if (Math.abs(drone.location.alt - targetLocation.alt) > ALTITUDE_CHANGE_RATE) {
                        drone.location.alt += Math.sign(targetLocation.alt - drone.location.alt) * ALTITUDE_CHANGE_RATE;
                    } else {
                        drone.location.alt = targetLocation.alt;
                    }
                    break; 
                }
                
                const targetAlt = isReturningHome ? homeBase.alt + drone.cruisingAltitude : drone.mission_target!.alt;
                const horizontalDistance = getDistance(drone.location, targetLocation);
                const verticalDistance = Math.abs(drone.location.alt - targetAlt);

                const horizontalTime = speedMps > 0 ? horizontalDistance / speedMps : Infinity;
                const verticalTime = ALTITUDE_CHANGE_RATE > 0 ? verticalDistance / ALTITUDE_CHANGE_RATE : Infinity;
                
                const calculatedEta = Math.max(horizontalTime, verticalTime);
                drone.eta = isFinite(calculatedEta) ? calculatedEta : undefined;
                
                const stepDistance = speedMps * SIMULATION_SPEED;

                // If the drone is within 10m, or its next move will pass the target, it has arrived.
                if (horizontalDistance < 10 || (stepDistance > 0 && horizontalDistance <= stepDistance)) {
                    // Snap to target to prevent minor overshoots and ensure arrival.
                    drone.location.lat = targetLocation.lat;
                    drone.location.lon = targetLocation.lon;
                    
                    if (isReturningHome) {
                        drone.status = DroneStatus.LANDING;
                    } else {
                        drone.target_locked = true;
                        drone.status = DroneStatus.HOVERING_ON_TARGET;
                        (drone as any).hoveringSince = Date.now();
                        // Only generate a new request if one isn't already active for this drone
                        if (!aiActionRequests.some(r => r.droneId === id)) {
                            generateHoveringAIRequest(id, drone);
                        }
                    }
                } else {
                    drone.target_locked = false;
                    const angle = Math.atan2(targetLocation.lat - drone.location.lat, targetLocation.lon - drone.location.lon);
                    drone.location.lat += Math.sin(angle) * DRONE_SPEED_FACTOR;
                    drone.location.lon += Math.cos(angle) * DRONE_SPEED_FACTOR;

                    if (Math.abs(drone.location.alt - targetAlt) > ALTITUDE_CHANGE_RATE) {
                        drone.location.alt += Math.sign(targetAlt - drone.location.alt) * ALTITUDE_CHANGE_RATE;
                    } else {
                        drone.location.alt = targetAlt;
                    }
                }
            }
            break;
        }
        case DroneStatus.EVADING:
            if (!evasionTimers[id] || evasionTimers[id] <= 0) {
                drone.status = DroneStatus.RETURNING_TO_BASE;
            } else {
                drone.location.lat += (Math.random() - 0.5) * DRONE_SPEED_FACTOR * 2;
                drone.location.lon += (Math.random() - 0.5) * DRONE_SPEED_FACTOR * 2;
                evasionTimers[id] -= 1000 * SIMULATION_SPEED;
            }
            break;
        case DroneStatus.HOVERING_AT_BASE:
            // Idle state
            break;
        case DroneStatus.HOVERING_ON_TARGET:
            const HOVER_TIMEOUT_MS = 30000; // 30 seconds
            if ((drone as any).hoveringSince && (drone.droneType === 'Assault' || drone.droneType === 'Interceptor')) {
                if (Date.now() - (drone as any).hoveringSince > HOVER_TIMEOUT_MS) {
                    // Find and remove any pending requests for this drone
                    const requestIndex = aiActionRequests.findIndex(r => r.droneId === id);
                    if (requestIndex > -1) {
                        const request = aiActionRequests[requestIndex];
                        commandLogCallback({
                            target: `Drone ${id}`, command: 'AI Request Timeout', status: 'Failed',
                            details: `Operator did not respond to '${request.action}' request in time. Drone disengaging.`
                        });
                        aiActionRequests.splice(requestIndex, 1);
                    }
                    
                    drone.status = DroneStatus.RETURNING_TO_BASE;
                    drone.mission_target = null;
                    (drone as any).hoveringSince = null; // Clear timer
                }
            }
            // Idle states
            break;
        case DroneStatus.GROUNDED:
            // Idle states
            break;
    }
}


function updateDroneSimulation() {
    Object.entries(drones).forEach(([id, drone]) => {
        updateDronePhysicsAndState(id, drone);

        // Signal strength fluctuation
        drone.signal_strength = Math.max(0, Math.min(100, drone.signal_strength + (Math.random() - 0.5) * 5));

        // AI Autonomous Flight Override on critical signal loss
        if (drone.signal_strength < 15 && drone.status !== DroneStatus.AI_OVERRIDE && drone.status !== DroneStatus.GROUNDED) {
            drone.status = DroneStatus.AI_OVERRIDE;
            const details = drone.mission_target
                ? `Signal strength critical at ${drone.signal_strength.toFixed(1)}%. Autonomous flight control initiated to continue mission.`
                : `Signal strength critical at ${drone.signal_strength.toFixed(1)}%. Autonomous flight control initiated to return to base.`;

            commandLogCallback({
                target: id,
                command: 'AI Override Engaged',
                status: 'Success',
                details: details
            });
        }

        // Random anomaly generation, but only for active drones
        if (drone.status !== DroneStatus.GROUNDED && Math.random() < ANOMALY_CHANCE * SIMULATION_SPEED) {
            if (!anomalies.some(a => a.droneId === id && a.repairStatus !== 'repaired')) {
                 anomalies.push({
                    id: `anom_${Date.now()}_${id}`,
                    droneId: id,
                    timestamp: new Date().toISOString(),
                    location: { lat: drone.location.lat, lon: drone.location.lon },
                    type: 'Rotor Malfunction',
                    severity: 'High',
                    imageUrl: 'https://placehold.co/600x400/ff0000/ffffff?text=ROTOR+FAIL',
                    repairStatus: 'pending',
                    repairAttempts: 0,
                });
            }
        }
        
        // Random AI request generation
         if (drone.status === DroneStatus.MISSION && Math.random() < AI_REQUEST_CHANCE * SIMULATION_SPEED) {
             if (!aiActionRequests.some(r => r.droneId === id)) {
                aiActionRequests.push({
                    id: `req_${Date.now()}_${id}`,
                    droneId: id,
                    action: AIAction.ALTER_COURSE,
                    reason: "Obstacle detected. Proposing alternative route.",
                    priority: AIPriority.Medium,
                    timestamp: new Date().toISOString(),
                });
            }
        }

        // Random Flight Path Suggestion
        HAZARD_ZONES.forEach(zone => {
            if (drone.mission_target && getDistance(drone.mission_target, zone.center) < zone.radius * 111139) {
                if (Math.random() < FLIGHT_SUGGESTION_CHANCE * SIMULATION_SPEED) {
                    if (!flightSuggestions.some(s => s.droneId === id)) {
                         flightSuggestions.push({
                            id: `sug_${Date.now()}_${id}`,
                            droneId: id,
                            suggestionType: zone.type,
                            reason: `Mission target is within a known ${zone.type.replace(/_/g, ' ')} zone. Suggesting reroute.`,
                            suggestedPath: { ...drone.mission_target, lat: drone.mission_target.lat + 0.02, lon: drone.mission_target.lon + 0.02 },
                            timestamp: new Date().toISOString(),
                        });
                    }
                }
            }
        });
    });
}

function generateThreats() {
    if (Math.random() < THREAT_CHANCE * SIMULATION_SPEED) {
        const type = Math.random() < 0.3 ? ThreatType.JAMMING_SIGNAL : ThreatType.UNIDENTIFIED_DRONE;
        const severity = type === ThreatType.JAMMING_SIGNAL ? 'Critical' : 'High';
        const threatBase = BASE_LOCATIONS[Math.floor(Math.random() * BASE_LOCATIONS.length)];

        const newThreat: Threat = {
            id: `th_${Date.now()}`,
            location: {
                lat: threatBase.lat + (Math.random() - 0.5) * 0.1,
                lon: threatBase.lon + (Math.random() - 0.5) * 0.1,
                alt: 100 + Math.random() * 200,
            },
            type,
            severity,
            timestamp: new Date().toISOString(),
            details: type === ThreatType.JAMMING_SIGNAL ? 'High-power RF jamming detected. Autonomous flight override initiated for affected drones.' : 'Unidentified drone detected near restricted airspace.',
            responseStatus: 'pending',
        };
        threats.push(newThreat);

        if (type === ThreatType.JAMMING_SIGNAL) {
            // Affect a few drones
            Object.values(drones).forEach(d => {
                if (Math.random() < 0.5 && d.status !== DroneStatus.GROUNDED) {
                    d.status = DroneStatus.AI_OVERRIDE;
                    d.signal_strength = Math.random() * 20; // Drastically reduce signal
                }
            });
        }
    }
}

// --- EXPORTED API FUNCTIONS ---

export const fetchDroneStatus = async (port?: string): Promise<Drones> => {
    // Port is ignored in mock
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(drones))), 200));
};

export const fetchAnomalies = async (): Promise<Anomaly[]> => {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(anomalies))), 200));
};

export const fetchThreats = async (): Promise<Threat[]> => {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(threats))), 200));
};

export const fetchAIActionRequests = async (): Promise<AIActionRequest[]> => {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(aiActionRequests))), 200));
};

export const fetchAITargetDesignations = async (): Promise<AITargetDesignationRequest[]> => {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(aiTargetDesignations))), 200));
};

export const fetchFlightAnalysisSuggestions = async (): Promise<FlightAnalysisSuggestion[]> => {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(flightSuggestions))), 200));
};

export const fetchUFOs = async (): Promise<UnidentifiedFlyingObject[]> => {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(ufos))), 200));
};

export const fetchCounterUASStatus = async (): Promise<Record<string, CounterUASSystem>> => {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(counterUASSystems))), 200));
};

export const fetchEliminationEvents = async (): Promise<EliminationEvent[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const eventsToSend = [...eliminationEvents];
            eliminationEvents = []; // Clear events after fetching
            resolve(eventsToSend);
        }, 100);
    });
};

export const postCommand = async (port: string, path: string, body?: any): Promise<{ status: string }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const parts = path.split('/').filter(p => p);
            
            if (parts.length < 2) return reject(new Error('Invalid command path'));

            const targetType = parts[0];
            let action: string;
            let targetId: string | null = null;
            
            if (targetType === 'fleet') {
                action = parts[1];
            } else {
                targetId = parts[1];
                action = parts[2];
            }
            
            const handleSingleDrone = (id: string, droneAction: string) => {
                const drone = drones[id];
                if (!drone) return;

                switch (droneAction) {
                    case 'launch': if (drone.status === DroneStatus.GROUNDED) drone.status = DroneStatus.LAUNCHING; break;
                    case 'land': if (drone.status !== DroneStatus.GROUNDED) drone.status = DroneStatus.LANDING; break;
                    case 'return_to_base': 
                        if (drone.status !== DroneStatus.GROUNDED) {
                            drone.status = DroneStatus.RETURNING_TO_BASE; 
                            drone.mission_target = null; 
                            (drone as any).hoveringSince = null;
                        } 
                        break;
                    case 'plan_mission':
                    case 'acquire_target':
                        if (body?.target_lat && body?.target_lon && body?.target_alt) {
                            drone.mission_target = { lat: body.target_lat, lon: body.target_lon, alt: body.target_alt };
                        }
                        break;
                    case 'start_mission': if (drone.mission_target && drone.status === DroneStatus.HOVERING_AT_BASE) drone.status = DroneStatus.MISSION; break;
                    case 'cancel_mission': 
                        if (drone.mission_target) { 
                            drone.mission_target = null; 
                            drone.status = DroneStatus.HOVERING_AT_BASE; 
                            (drone as any).hoveringSince = null;
                        } 
                        break;
                    case 'set_mission_parameters':
                        if (body) {
                            if (body.speed !== undefined) drone.cruisingSpeed = body.speed;
                            if (body.altitude !== undefined) drone.cruisingAltitude = body.altitude;
                        }
                        break;
                }
            };

            if (targetType === 'fleet') {
                Object.keys(drones).forEach(id => handleSingleDrone(id, action));
            } else if (targetId) {
                handleSingleDrone(targetId, action);
            }

            resolve({ status: 'ok' });
        }, 300);
    });
};

export const postCounterUASCommand = async (systemId: string, command: string): Promise<{ status: string }> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const system = counterUASSystems[systemId];
            if (system) {
                if (command === 'cease_fire') {
                    if (system.status === 'targeting' || system.status === 'engaging') {
                        system.status = CounterUASStatus.SCANNING;
                        system.currentTargetId = null;
                        commandLogCallback({
                            target: system.id,
                            command: 'Cease Fire',
                            status: 'Success',
                            details: 'Operator commanded system to cease fire. Resuming scan.'
                        });
                        resolve({ status: 'ok' });
                        return;
                    }
                }
            }
            resolve({ status: 'no-op' });
        }, 300);
    });
};

const performRepairAttempt = (anomaly: Anomaly) => {
    if (!anomalies.find(a => a.id === anomaly.id)) return; // Check if anomaly still exists
    anomaly.repairStatus = 'repairing';

    // Simulate repair duration
    setTimeout(() => {
        if (!anomalies.find(a => a.id === anomaly.id)) return;

        const success = Math.random() > 0.4; // 60% success rate

        if (success) {
            anomaly.repairStatus = 'repaired';
            commandLogCallback({
                target: `Anomaly ${anomaly.id.slice(-4)}`,
                command: 'Auto-Repair',
                status: 'Success',
                details: `Repair attempt ${anomaly.repairAttempts} successful.`
            });
        } else {
            // Repair failed, check for retry
            if (anomaly.repairAttempts! < 2) {
                commandLogCallback({
                    target: `Anomaly ${anomaly.id.slice(-4)}`,
                    command: 'Auto-Repair',
                    status: 'Failed',
                    details: `Attempt ${anomaly.repairAttempts} failed. Retrying...`
                });
                anomaly.repairAttempts!++;
                // Short delay to simulate "rescan" before next attempt
                setTimeout(() => performRepairAttempt(anomaly), 2000);
            } else {
                // Max retries reached, permanently fail
                anomaly.repairStatus = 'failed';
                commandLogCallback({
                    target: `Anomaly ${anomaly.id.slice(-4)}`,
                    command: 'Auto-Repair',
                    status: 'Failed',
                    details: `All repair attempts failed.`
                });
            }
        }
    }, 4000 + Math.random() * 4000);
};


export const initiateAnomalyRepair = async (anomalyId: string): Promise<{ status: string }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const anomaly = anomalies.find(a => a.id === anomalyId);
            if (anomaly && anomaly.repairStatus === 'pending') {
                anomaly.repairAttempts = 1;
                performRepairAttempt(anomaly);
                resolve({ status: 'Repair initiated' });
            } else {
                reject(new Error('Anomaly not found or not pending repair.'));
            }
        }, 500);
    });
};

export const runDroneDiagnostics = async (droneId: string, drone: Drone): Promise<DiagnosticsReport> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const checks: DiagnosticCheck[] = [];
            let overallStatus: DiagnosticStatus = 'PASS';
            const addCheck = (nameKey: string, detailsKey: string, status: DiagnosticStatus, detailsOptions?: Record<string, string | number>) => {
                checks.push({ checkNameKey: nameKey, status, detailsKey, detailsOptions });
                if (status === 'FAIL') overallStatus = 'FAIL';
                if (status === 'WARNING' && overallStatus === 'PASS') overallStatus = 'WARNING';
            };

            if (drone.battery < 20) addCheck('diagnostics.check.battery', 'diagnostics.details.battery_fail', 'FAIL', { battery: drone.battery.toFixed(1) });
            else if (drone.battery < 50) addCheck('diagnostics.check.battery', 'diagnostics.details.battery_warn', 'WARNING', { battery: drone.battery.toFixed(1) });
            else addCheck('diagnostics.check.battery', 'diagnostics.details.battery_pass', 'PASS', { battery: drone.battery.toFixed(1) });

            if (drone.signal_strength < 40) addCheck('diagnostics.check.signal', 'diagnostics.details.signal_fail', 'FAIL', { signal: drone.signal_strength.toFixed(0) });
            else if (drone.signal_strength < 70) addCheck('diagnostics.check.signal', 'diagnostics.details.signal_warn', 'WARNING', { signal: drone.signal_strength.toFixed(0) });
            else addCheck('diagnostics.check.signal', 'diagnostics.details.signal_pass', 'PASS', { signal: drone.signal_strength.toFixed(0) });
            
            const motorStatus = Math.random();
            if (motorStatus < 0.05) addCheck('diagnostics.check.motor', 'diagnostics.details.motor_fail', 'FAIL');
            else if (motorStatus < 0.2) addCheck('diagnostics.check.motor', 'diagnostics.details.motor_warn', 'WARNING');
            else addCheck('diagnostics.check.motor', 'diagnostics.details.motor_pass', 'PASS');

            const gpsStatus = Math.random();
             if (gpsStatus < 0.02) addCheck('diagnostics.check.gps', 'diagnostics.details.gps_fail', 'FAIL');
            else addCheck('diagnostics.check.gps', 'diagnostics.details.gps_pass', 'PASS');
            
            const cameraStatus = Math.random();
             if (cameraStatus < 0.1) addCheck('diagnostics.check.camera', 'diagnostics.details.camera_fail', 'FAIL');
            else addCheck('diagnostics.check.camera', 'diagnostics.details.camera_pass', 'PASS');
            
            resolve({ droneId, timestamp: new Date().toISOString(), overallStatus, checks });
        }, 2000 + Math.random() * 2000);
    });
};

export const postAIActionResponse = async (requestId: string, approved: boolean): Promise<{ status: string }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const requestIndex = aiActionRequests.findIndex(r => r.id === requestId);
            if (requestIndex === -1) return reject(new Error('Request not found.'));

            const request = aiActionRequests[requestIndex];

            if (approved) {
                if (request.action === AIAction.ENGAGE_GROUND_DEFENSE) {
                    const system = counterUASSystems[request.droneId];
                    if (system && system.status === CounterUASStatus.TARGETING) {
                        system.status = CounterUASStatus.ENGAGING;
                        commandLogCallback({
                            target: system.id, command: 'Engage Command Confirmed', status: 'Success',
                            details: `Operator authorized engagement of hostile target ${system.currentTargetId?.slice(-4)}.`
                        });
                    }
                } else {
                    const drone = drones[request.droneId];
                    if (drone) {
                        (drone as any).hoveringSince = null; // Clear timer on any approved action
                        switch (request.action) {
                            case AIAction.ABORT_MISSION: drone.status = DroneStatus.RETURNING_TO_BASE; drone.mission_target = null; break;
                            case AIAction.FLY_INTO_THREAT:
                                if (drone.droneType === 'Interceptor' && (drone.interceptTargetId || drone.interceptThreatId)) {
                                    drone.isEliminationApproved = true;
                                } else if (drone.droneType === 'Interceptor' && drone.mission_target) {
                                    drone.status = DroneStatus.AI_OVERRIDE;
                                    drone.isEliminationApproved = true;
                                } else {
                                    const threat = threats.find(t => t.id === request.threatId);
                                    if (threat) { 
                                        drone.mission_target = threat.location; 
                                        drone.status = DroneStatus.AI_OVERRIDE;
                                        drone.isEliminationApproved = true;
                                    }
                                }
                                break;
                            case AIAction.FLY_INTO_ENEMY_VEHICLE:
                            case AIAction.FLY_INTO_TARGET:
                                drone.isEliminationApproved = true;
                                drone.status = DroneStatus.AI_OVERRIDE;
                                if (!drone.missionTargetId && drone.mission_target) {
                                    const targetLoc = drone.mission_target;
                                    const proximityThreshold = 20; // meters
                                    const allTargets = [
                                        ...threats.map(t => ({ id: t.id, location: t.location })),
                                        ...ufos.map(u => ({ id: u.id, location: u.location }))
                                    ];
                                    let closestTarget: { id: string; distance: number } | null = null;
                                    for (const target of allTargets) {
                                        const distance = getDistance3D(target.location, targetLoc);
                                        if (distance < proximityThreshold) {
                                            if (!closestTarget || distance < closestTarget.distance) {
                                                closestTarget = { id: target.id, distance };
                                            }
                                        }
                                    }
                                    if (closestTarget) {
                                        drone.missionTargetId = closestTarget.id;
                                    }
                                }
                                break;
                        }
                    }
                }
            } else { // Request denied
                if (request.action === AIAction.ENGAGE_GROUND_DEFENSE) {
                    const system = counterUASSystems[request.droneId];
                    if (system) {
                        system.status = CounterUASStatus.SCANNING;
                        system.currentTargetId = null;
                    }
                }
            }
            aiActionRequests.splice(requestIndex, 1);
            resolve({ status: 'ok' });
        }, 500);
    });
};

export const postAIActionOverride = async (requestId: string, newAction: AIAction): Promise<{ status: string }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const requestIndex = aiActionRequests.findIndex(r => r.id === requestId);
            if (requestIndex === -1) return reject(new Error('Request not found.'));

            const request = aiActionRequests[requestIndex];
            const drone = drones[request.droneId];

            if (drone) {
                (drone as any).hoveringSince = null;
                switch (newAction) {
                    case AIAction.ABORT_MISSION:
                    case AIAction.RETURN_TO_BASE:
                        if (drone.status !== DroneStatus.GROUNDED) {
                            drone.status = DroneStatus.RETURNING_TO_BASE;
                            drone.mission_target = null;
                        }
                        break;
                    case AIAction.ENGAGE_COUNTERMEASURES:
                    case AIAction.ALTER_COURSE: // Treat as an evasion maneuver
                        drone.status = DroneStatus.EVADING;
                        evasionTimers[request.droneId] = 5000; // Evade for 5 seconds, sim will handle next state
                        break;
                    case AIAction.FLY_INTO_THREAT:
                    case AIAction.FLY_INTO_ENEMY_VEHICLE:
                    case AIAction.FLY_INTO_TARGET:
                        // Override to a kamikaze action. This requires a mission target to exist.
                        if (drone.mission_target) {
                            drone.isEliminationApproved = true;
                            drone.status = DroneStatus.AI_OVERRIDE;
                        } else {
                            // If there's no target, this action is impossible. Revert to a safe action.
                            drone.status = DroneStatus.RETURNING_TO_BASE;
                            commandLogCallback({
                                target: `Drone ${request.droneId}`,
                                command: 'Override Failed',
                                status: 'Failed',
                                details: `Cannot execute '${newAction.replace(/_/g, ' ')}' without a mission target. Returning to base.`
                            });
                        }
                        break;
                    case AIAction.HOVER_OVER_TARGET:
                    case AIAction.DROP_PAYLOAD:
                    case AIAction.DEPLOY_SENSOR:
                    case AIAction.SCAN_AREA:
                    case AIAction.CALIBRATE_ON_IMAGE:
                         // These are all "at target" actions.
                        if (drone.mission_target) {
                            drone.status = DroneStatus.HOVERING_ON_TARGET;
                             commandLogCallback({
                                target: `Drone ${request.droneId}`,
                                command: `Execute Override: ${newAction.replace(/_/g, ' ').toUpperCase()}`,
                                status: 'Success',
                                details: `Operator overrode AI suggestion. Now performing action at target.`
                            });
                        } else {
                            // If there's no target, these actions are impossible. Revert to a safe action.
                            drone.status = DroneStatus.RETURNING_TO_BASE;
                             commandLogCallback({
                                target: `Drone ${request.droneId}`,
                                command: 'Override Failed',
                                status: 'Failed',
                                details: `Cannot execute '${newAction.replace(/_/g, ' ')}' without a mission target. Returning to base.`
                            });
                        }
                        break;
                }
            }

            aiActionRequests.splice(requestIndex, 1);
            resolve({ status: 'ok' });
        }, 500);
    });
};

export const postAITargetResponse = async (requestId: string, response: { approved: boolean; droneId?: string }): Promise<{ status: string }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const requestIndex = aiTargetDesignations.findIndex(r => r.id === requestId);
            if (requestIndex === -1) return reject(new Error('Target designation not found.'));

            const request = aiTargetDesignations[requestIndex];

            // Mark original threat as pending again if denied
            const threat = threats.find(t => t.id === request.sourceId);
            if (threat) {
                threat.responseStatus = 'pending';
            }

            if (response.approved && response.droneId) {
                const drone = drones[response.droneId];
                if (drone) {
                    drone.mission_target = request.targetLocation;
                    drone.missionTargetId = request.sourceId;
                    if (drone.status === DroneStatus.GROUNDED) {
                        drone.status = DroneStatus.LAUNCHING;
                    } else {
                        drone.status = DroneStatus.MISSION;
                    }
                    if (threat) {
                        threat.responseStatus = 'acknowledged';
                    }
                }
            }
            
            aiTargetDesignations.splice(requestIndex, 1);
            resolve({ status: 'ok' });
        }, 500);
    });
};


export const postFlightSuggestionResponse = async (suggestionId: string, approved: boolean): Promise<{ status: string }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const suggestionIndex = flightSuggestions.findIndex(s => s.id === suggestionId);
            if (suggestionIndex === -1) return reject(new Error('Suggestion not found.'));
            
            const suggestion = flightSuggestions[suggestionIndex];
            const drone = drones[suggestion.droneId];

            if (approved && drone && drone.mission_target) {
                drone.mission_target = suggestion.suggestedPath;
            }
            flightSuggestions.splice(suggestionIndex, 1);
            resolve({ status: 'ok' });
        }, 500);
    });
};

export const postThreatResponse = async (threatId: string): Promise<{ status: string }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const threat = threats.find(t => t.id === threatId);
            if (threat) {
                threat.responseStatus = 'acknowledged';
                resolve({ status: 'ok' });
            } else {
                reject(new Error('Threat not found.'));
            }
        }, 300);
    });
};

export const setCommandLogCallback = (callback: (log: any) => void) => {
    commandLogCallback = callback;
};

export const updateGeofenceConfigForAI = (geofences: Geofence[]) => {
    geofenceConfig = geofences;
};

export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const hour = new Date().getHours();
            const conditions: WeatherData['condition'][] = ['Clear', 'Clouds', 'Rain', 'Thunderstorm'];
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            
            let temp = 18 + Math.sin(hour / 24 * Math.PI * 2) * 10 + (Math.random() - 0.5) * 2;
            if (condition === 'Rain') temp -= 2;
            if (condition === 'Thunderstorm') temp -= 3;
            if (condition === 'Clear' && hour > 8 && hour < 18) temp += 2;

            resolve({
                temperature: temp,
                windSpeed: 5 + Math.random() * 20,
                windDirection: Math.random() * 360,
                condition: condition,
                humidity: 40 + Math.random() * 50,
                visibility: 5 + Math.random() * 15,
                qnh: 1000 + Math.random() * 25,
            });
        }, 500 + Math.random() * 500);
    });
};

// --- GEMINI API INTEGRATION ---
let ai: GoogleGenAI | null = null;
const getGenAI = (): GoogleGenAI => {
    if (!ai) {
        // This assumes process.env.API_KEY is available in the execution environment
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return ai;
};


export const generateEmailReplies = async (emailContent: string): Promise<AICommResponse> => {
    const genAI = getGenAI();
    
    const prompt = `Analyze the following email content. Provide a concise one-sentence summary and generate three distinct, professional draft replies with different intents (e.g., positive/accept, negative/decline, neutral/inquire for more information). Ensure the replies are well-written and appropriate for a professional defense context.

Email Content:
---
${emailContent}
---
`;

    try {
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: {
                            type: Type.STRING,
                            description: "A concise, one-sentence summary of the email's content.",
                        },
                        drafts: {
                            type: Type.ARRAY,
                            description: "An array of 3 distinct draft replies.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: {
                                        type: Type.STRING,
                                        description: "A short title describing the intent of the reply (e.g., 'Confirm and Proceed', 'Polite Decline', 'Request for Clarification')."
                                    },
                                    body: {
                                        type: Type.STRING,
                                        description: "The full text of the draft reply."
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const jsonText = response.text.trim();
        const parsedResponse: AICommResponse = JSON.parse(jsonText);
        return parsedResponse;

    } catch (error) {
        console.error("Error generating email replies:", error);
        // It's better to throw a more specific error for the UI to catch
        if (error instanceof Error) {
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while contacting the AI assistant.");
    }
};

// --- SIMULATION INITIALIZATION AND LOOP ---
initializeDrones();
initializeUFOs();
initializeCounterUAS();
setInterval(() => {
    updateDroneSimulation();
    updateUFOSimulation();
    updateCounterUASSimulation();
    generateThreats();
    runInterceptorAI();
    // FIX: Reordered AI dispatch logic. runTargetDesignationAI now runs before
    // runThreatInterceptorAI. This prioritizes operator-in-the-loop decisions
    // and resolves the conflict where autonomous interceptors were always tasked
    // before an operator could be prompted to task an Assault drone.
    runTargetDesignationAI();
    runThreatInterceptorAI();
    runReconAI();

    // Clean up old elimination logs to prevent memory leaks
    const now = Date.now();
    eliminationLog = eliminationLog.filter(e => now - e.timestamp < 10000); // Keep for 10 seconds
}, 1000 * SIMULATION_SPEED);