import React, { useState, useMemo, useEffect } from 'react';
import { GeofenceEvent, GeofenceObjectType, UnidentifiedFlyingObject, UFOType } from '../types';
import { useTranslation } from '../contexts/I18nContext';
import { METERS_TO_FEET } from '../constants';

interface GeofenceEventLogProps {
    events: GeofenceEvent[];
    ufos: UnidentifiedFlyingObject[];
    onSelectEvent: (eventId: string) => void;
}

const isHostileUFO = (ufoType: UFOType) => {
    return ufoType === 'fpv_drone' || ufoType === 'unknown_uav';
};


export const GeofenceEventLog: React.FC<GeofenceEventLogProps> = ({ events, ufos, onSelectEvent }) => {
    const { t } = useTranslation();
    // This state is just to force re-renders every 5 seconds for the "live" effect.
    const [, setTick] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setTick(prev => prev + 1);
        }, 5000);
        return () => clearInterval(intervalId);
    }, []);

    const ufoMap = useMemo(() => new Map(ufos.map(ufo => [ufo.id, ufo])), [ufos]);


    const getEventTypeStyles = (type: 'entry' | 'exit') => {
        if (type === 'entry') {
            return 'bg-yellow-900 text-yellow-300';
        }
        return 'bg-blue-900 text-blue-300';
    };
    
    return (
        <div className="p-6">
            <div className="overflow-y-auto max-h-64 pr-2">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3">{t('geofence_event_log.header.timestamp')}</th>
                            <th scope="col" className="px-4 py-3">{t('geofence_event_log.header.object')}</th>
                            <th scope="col" className="px-4 py-3">{t('geofence_event_log.header.event')}</th>
                            <th scope="col" className="px-4 py-3">{t('geofence_event_log.header.zone')}</th>
                            <th scope="col" className="px-4 py-3 text-right">{t('geofence_event_log.header.altitude')}</th>
                            <th scope="col" className="px-4 py-3 text-right">{t('geofence_event_log.header.speed')}</th>
                            <th scope="col" className="px-4 py-3 text-right">{t('geofence_event_log.header.heading')}</th>
                            <th scope="col" className="px-4 py-3 text-center">{t('geofence_event_log.header.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((event) => {
                            const liveUfo = event.objectType === GeofenceObjectType.UNIDENTIFIED_OBJECT ? ufoMap.get(event.objectId) : undefined;
                            const isLiveHostile = liveUfo && isHostileUFO(liveUfo.type);
                            
                            const altitude = isLiveHostile ? liveUfo.location.alt : event.altitude;
                            const speed = isLiveHostile ? liveUfo.speed : event.speed;
                            const heading = isLiveHostile ? liveUfo.heading : event.heading;
                            
                            return (
                            <tr key={event.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-2 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</td>
                                <td className="px-4 py-2 font-semibold">
                                    <div className="flex flex-col">
                                        <span>{event.objectDisplayName}</span>
                                        <span className="text-xs text-gray-500">{t(`geofence_event_log.object_type.${event.objectType}`)}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getEventTypeStyles(event.eventType)}`}>
                                        {t(`geofence_event_log.event.${event.eventType}`)}
                                    </span>
                                </td>
                                <td className="px-4 py-2">{event.geofenceName}</td>
                                <td className={`px-4 py-2 font-mono text-right ${isLiveHostile ? 'live-telemetry-pulse font-bold' : ''}`}>
                                    {altitude != null ? `${(altitude * METERS_TO_FEET).toFixed(0)} ft` : '-'}
                                </td>
                                <td className={`px-4 py-2 font-mono text-right ${isLiveHostile ? 'live-telemetry-pulse font-bold' : ''}`}>
                                    {speed != null ? `${speed.toFixed(0)} km/h` : '-'}
                                </td>
                                <td className={`px-4 py-2 font-mono text-right ${isLiveHostile ? 'live-telemetry-pulse font-bold' : ''}`}>
                                    {heading != null ? `${heading.toFixed(0)}°` : '-'}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button onClick={() => onSelectEvent(event.id)} className="bg-gray-600 hover:bg-cyan-600 text-white font-bold py-1 px-3 rounded-lg text-xs transition">
                                        {t('geofence_event_log.locate')}
                                    </button>
                                </td>
                            </tr>
                        )})}
                            {events.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-4 text-gray-500">{t('geofence_event_log.no_events')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};