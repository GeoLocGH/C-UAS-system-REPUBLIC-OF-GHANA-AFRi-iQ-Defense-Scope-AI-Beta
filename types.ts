

export interface Location {
  lat: number;
  lon: number;
  alt: number;
}

export enum DroneStatus {
  GROUNDED = 'grounded',
  LAUNCHING = 'launching',
  MISSION = 'mission',
  RETURNING_TO_BASE = 'returning_to_base',
  LANDING = 'landing',
  HOVERING_ON_TARGET = 'hovering_on_target',
  HOVERING_AT_BASE = 'hovering_at_base',
  EVADING = 'evading',
  AI_OVERRIDE = 'ai_override',
  INTERCEPTING = 'intercepting',
}

export interface Drone {
  status: DroneStatus;
  location: Location;
  battery: number;
  target_locked: boolean;
  signal_strength: number; // 0-100
  cruisingSpeed: number; // Speed multiplier
  cruisingAltitude: number; // Altitude in meters
  mission_target: Location | null;
  droneType: 'Assault' | 'Recon' | 'Interceptor';
  eta?: number; // Estimated Time of Arrival in seconds
  interceptTargetId?: string | null; // For UFOs
  interceptThreatId?: string | null; // For Threats
  missionTargetId?: string | null; // For mission-based targets from designations
  isEliminationApproved?: boolean;
  eliminationRequestSent?: boolean;
  homeBaseIndex?: number;
}

export type Drones = Record<string, Drone>;

export type DroneNicknames = Record<string, string>;

export interface TelemetryDataPoint {
  timestamp: number;
  altitude: number;
  battery: number;
}

export type TelemetryHistory = Record<string, TelemetryDataPoint[]>;

export type FlightPathPoint = { lat: number; lon: number; timestamp: number };
export type FlightPath = FlightPathPoint[];
export type FlightPaths = Record<string, FlightPath>;

export type LogStatus = 'Success' | 'Failed';

export interface LogEntry {
  timestamp: string;
  target: string;
  command: string;
  details: string;
  status: LogStatus;
}

export type AnomalySeverity = 'High' | 'Medium' | 'Low';
export type AnomalyRepairStatus = 'pending' | 'repairing' | 'repaired' | 'failed';

export interface Anomaly {
    id: string;
    droneId: string;
    timestamp: string;
    location: Omit<Location, 'alt'>;
    type: string;
    severity: AnomalySeverity;
    imageUrl: string;
    repairStatus: AnomalyRepairStatus;
    repairAttempts?: number;
}

export type Anomalies = Anomaly[];


export type SoundChoice = '1' | '2' | '3';

export interface AlertSoundPreferences {
    success: SoundChoice;
    notification: SoundChoice;
    warning: SoundChoice;
    error: SoundChoice;
}

export interface AlertPreferences {
  master: boolean;
  connectionLost: boolean;
  lowBattery: boolean;
  missionStart: boolean;
  returnToBase: boolean;
  highSeverityAnomaly: boolean;
  repairComplete: boolean;
  repairFailed: boolean;
  droneHealthStatus: boolean;
  aiRequestReceived: boolean;
  newThreatDetected: boolean;
  newAITargetDesignation: boolean;
  aiMissionComplete: boolean;
  presetMissionSuccess: boolean;
  interceptionSuccess: boolean;
  geofenceEntry: boolean;
  geofenceExit: boolean;
  cuasNeutralization: boolean;
  readAloud: boolean;
  selectedVoice: string | null;
  sounds: AlertSoundPreferences;
}

export interface MissionPreset {
  name: string;
  location: Location;
}

// --- AI Action Request Types ---
export enum AIAction {
    DROP_PAYLOAD = 'drop_payload',
    ENGAGE_COUNTERMEASURES = 'engage_countermeasures',
    ABORT_MISSION = 'abort_mission',
    FLY_INTO_TARGET = 'fly_into_target',
    FLY_INTO_ENEMY_VEHICLE = 'fly_into_enemy_vehicle',
    CALIBRATE_ON_IMAGE = 'calibrate_on_image',
    ALTER_COURSE = 'alter_course',
    HOVER_OVER_TARGET = 'hover_over_target',
    DEPLOY_SENSOR = 'deploy_sensor',
    SCAN_AREA = 'scan_area',
    RETURN_TO_BASE = 'return_to_base',
    FLY_INTO_THREAT = 'fly_into_threat',
    ENGAGE_GROUND_DEFENSE = 'engage_ground_defense',
    COUNTER_COMMAND = 'counter_command'
}

export enum AIPriority {
    Critical = 'Critical',
    High = 'High',
    Medium = 'Medium',
    Low = 'Low',
}

export interface AIActionRequest {
    id: string;
    droneId: string;
    action: AIAction;
    reason: string;
    timestamp: string;
    priority: AIPriority;
    threatId?: string;
}

// --- AI Target Designation Types ---
export interface AITargetDesignationRequest {
    id: string;
    timestamp: string;
    sourceType: 'threat' | 'anomaly';
    sourceId: string;
    targetLocation: Location;
    reason: string;
    suggestedDroneId: string;
    suggestedAction: DroneStatus.MISSION | DroneStatus.INTERCEPTING;
}

// --- Diagnostics Types ---
export type DiagnosticStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface DiagnosticCheck {
  checkNameKey: string;
  status: DiagnosticStatus;
  detailsKey: string;
  detailsOptions?: Record<string, string | number>;
}

export interface DiagnosticsReport {
  droneId: string;
  timestamp: string;
  overallStatus: DiagnosticStatus;
  checks: DiagnosticCheck[];
}

export type UserRole = 'Operator' | 'Admin';

export type GroupCommandTarget = string[];

// --- Flight Path Analysis Types ---
export enum FlightSuggestionType {
    SIGNAL_LOSS_ZONE = 'signal_loss_zone',
    HIGH_TURBULENCE = 'high_turbulence',
}

export interface FlightAnalysisSuggestion {
    id: string;
    droneId: string;
    suggestionType: FlightSuggestionType;
    reason: string;
    suggestedPath: Location; // The new, safer target location
    timestamp: string;
}

// --- Threat Intelligence Types ---
export enum ThreatType {
    UNIDENTIFIED_DRONE = 'unidentified_drone',
    HOSTILE_AIRCRAFT = 'hostile_aircraft',
    BIRD_SWARM = 'bird_swarm',
    JAMMING_SIGNAL = 'jamming_signal',
}

export type ThreatSeverity = 'Critical' | 'High' | 'Medium';

export interface Threat {
    id: string;
    location: Location;
    type: ThreatType;
    severity: ThreatSeverity;
    timestamp: string;
    details: string;
    responseStatus?: 'pending' | 'acknowledged' | 'ai_targeting';
    speed?: number; // km/h
    heading?: number; // degrees from North
}

// --- Geofence Types ---
export interface Geofence {
  id: string;
  name: string;
  points: { lat: number; lon: number }[];
  alertOnEntry: boolean;
  alertOnExit: boolean;
  color: string;
  interceptorDefense: boolean;
}

// --- Unidentified Flying Object Types ---
export type UFOType = 'commercial_jet' | 'private_plane' | 'helicopter' | 'unknown_uav' | 'fpv_drone';

export interface UnidentifiedFlyingObject {
  id: string;
  location: Location;
  type: UFOType;
  speed: number; // km/h
  heading: number; // degrees from North
}

// --- Geofence Event Types ---
export enum GeofenceObjectType {
    FLEET_DRONE = 'fleet_drone',
    UNIDENTIFIED_OBJECT = 'unidentified_object',
}

export interface GeofenceEvent {
    id: string;
    timestamp: string;
    objectId: string;
    objectDisplayName: string;
    objectType: GeofenceObjectType;
    eventType: 'entry' | 'exit';
    geofenceId: string;
    geofenceName: string;
    location: { lat: number; lon: number };
    altitude?: number; // meters
    speed?: number; // km/h
    heading?: number; // degrees
}


// --- Weather Types ---
export interface WeatherData {
  temperature: number; // Celsius
  windSpeed: number; // km/h
  windDirection: number; // degrees
  condition: 'Clear' | 'Clouds' | 'Rain' | 'Thunderstorm' | 'Snow';
  humidity: number; // percentage
  visibility: number; // kilometers
  qnh: number; // hPa
}

// --- AI Communications Assistant Types ---
export interface AIDraftReply {
  title: string;
  body: string;
}

export interface AICommResponse {
  summary: string;
  drafts: AIDraftReply[];
}

// --- Elimination Event ---
export interface EliminationEvent {
    targetId: string;
    location: Location;
    timestamp: number;
}

// --- Counter-UAS System Types ---
export enum CounterUASStatus {
    STANDBY = 'standby',
    SCANNING = 'scanning',
    TARGETING = 'targeting',
    ENGAGING = 'engaging',
    RELOADING = 'reloading',
    DISABLED = 'disabled'
}

export interface CounterUASTargetInfo {
    id: string;
    distance: number; // meters
    speed: number; // km/h
    threatScore: number;
}

export interface CounterUASSystem {
    id: string;
    location: Location;
    status: CounterUASStatus;
    ammo: number;
    maxAmmo: number;
    detectionRadius: number; // in meters
    engagementRadius: number; // in meters
    currentTargetId: string | null;
    currentTargetInfo: CounterUASTargetInfo | null;
    mode: 'autonomous' | 'manual' | 'human_in_loop';
}