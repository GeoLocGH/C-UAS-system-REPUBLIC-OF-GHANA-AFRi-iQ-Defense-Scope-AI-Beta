
import { DroneStatus } from './types';

export const STATUS_COLORS: Record<DroneStatus, string> = {
  [DroneStatus.GROUNDED]: 'bg-gray-500',
  [DroneStatus.LAUNCHING]: 'bg-blue-500',
  [DroneStatus.MISSION]: 'bg-green-500',
  [DroneStatus.AI_OVERRIDE]: 'bg-rose-600',
  [DroneStatus.INTERCEPTING]: 'bg-fuchsia-500',
  [DroneStatus.EVADING]: 'bg-orange-400',
  [DroneStatus.RETURNING_TO_BASE]: 'bg-yellow-500',
  [DroneStatus.LANDING]: 'bg-orange-500',
  [DroneStatus.HOVERING_ON_TARGET]: 'bg-red-500',
  [DroneStatus.HOVERING_AT_BASE]: 'bg-teal-500',
};

export const STATUS_ORDER: DroneStatus[] = [
  DroneStatus.INTERCEPTING,
  DroneStatus.AI_OVERRIDE,
  DroneStatus.MISSION,
  DroneStatus.EVADING,
  DroneStatus.HOVERING_ON_TARGET,
  DroneStatus.HOVERING_AT_BASE,
  DroneStatus.RETURNING_TO_BASE,
  DroneStatus.LANDING,
  DroneStatus.LAUNCHING,
  DroneStatus.GROUNDED,
];

// Unit Conversion Constants
export const METERS_TO_FEET = 3.28084;
export const FEET_TO_METERS = 1 / METERS_TO_FEET;
export const MULTIPLIER_TO_MPH = 12.5;
export const MPH_TO_MULTIPLIER = 1 / MULTIPLIER_TO_MPH;