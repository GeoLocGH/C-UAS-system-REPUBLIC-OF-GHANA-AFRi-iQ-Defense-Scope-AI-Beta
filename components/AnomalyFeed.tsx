import React, { useState, useMemo } from 'react';
import type { Anomaly, AnomalySeverity, AnomalyRepairStatus, DroneNicknames } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface AnomalyFeedProps {
    anomalies: Anomaly[];
    onSelectAnomaly: (id: string) => void;
    onInitiateRepair: (id: string) => void;
    selectedAnomalyId: string | null;
    droneNicknames: DroneNicknames;
}

const RepairStatusBadge: React.FC<{ status: AnomalyRepairStatus }> = ({ status }) => {
    const { t } = useTranslation();
    switch (status) {
        case 'repairing':
            return (
                 <div className="mt-4 flex items-center justify-center gap-2 text-cyan-400">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('anomaly_feed.repair_status.repairing')}</span>
                </div>
            );
        case 'repaired':
            return (
                 <div className="mt-4 flex items-center justify-center gap-2 text-green-400 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{t('anomaly_feed.repair_status.repaired')}</span>
                </div>
            );
        case 'failed':
            return (
                 <div className="mt-4 flex items-center justify-center gap-2 text-red-400 font-bold">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{t('anomaly_feed.repair_status.failed')}</span>
                </div>
            );
        default:
            return null;
    }
}


const AnomalyCard: React.FC<{ anomaly: Anomaly; onSelect: () => void; onRepair: () => void; isSelected: boolean; droneDisplayName: string; }> = React.memo(({ anomaly, onSelect, onRepair, isSelected, droneDisplayName }) => {
    const { t } = useTranslation();
    const severityColors: Record<AnomalySeverity, { bg: string; text: string; border: string }> = {
        High: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500' },
        Medium: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-500' },
        Low: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500' },
    };
    const colors = severityColors[anomaly.severity];
    const isFailed = anomaly.repairStatus === 'failed';
    
    const cardClasses = [
        "bg-gray-800",
        "rounded-lg",
        "shadow-lg",
        "border-l-4",
        colors.border,
        "transition-all",
        "duration-300",
        "scroll-mt-4", // For better positioning when scrolled to
        isSelected ? "ring-2 ring-yellow-400 ring-offset-4 ring-offset-gray-900" : "",
        isFailed ? 'failed-anomaly-pulse' : ''
    ].join(" ");

    return (
        <div id={anomaly.id} className={cardClasses}>
            <img src={anomaly.imageUrl} alt={anomaly.type} className="w-full h-40 object-cover rounded-t-lg" />
            <div className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-lg font-bold text-white">{anomaly.type}</p>
                        <p className="text-sm text-gray-400">{t('anomaly_feed.detected_by', { droneName: droneDisplayName })}</p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${colors.bg} ${colors.text}`}>
                        {anomaly.severity}
                    </span>
                </div>
                <div className="text-xs text-gray-500 mt-3">
                    <p>{new Date(anomaly.timestamp).toLocaleString()}</p>
                    <p>{t('anomaly_feed.location', { lat: anomaly.location.lat.toFixed(4), lon: anomaly.location.lon.toFixed(4) })}</p>
                </div>
                
                <div className="mt-4">
                    {anomaly.repairStatus === 'pending' ? (
                        <div className="grid grid-cols-2 gap-2">
                             <button 
                                onClick={onSelect}
                                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition"
                            >
                                {t('anomaly_feed.view')}
                            </button>
                             <button 
                                onClick={onRepair}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition"
                            >
                                {t('anomaly_feed.auto_repair')}
                            </button>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={onSelect}
                                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition"
                            >
                                {t('anomaly_feed.view_on_map')}
                            </button>
                            <RepairStatusBadge status={anomaly.repairStatus} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

export const AnomalyFeed: React.FC<AnomalyFeedProps> = ({ anomalies, onSelectAnomaly, onInitiateRepair, selectedAnomalyId, droneNicknames }) => {
    const { t } = useTranslation();
    const [activeFilter, setActiveFilter] = useState<AnomalySeverity | 'All'>('All');

    const getDroneDisplayName = (droneId: string) => {
        if (droneNicknames[droneId]) {
            return droneNicknames[droneId];
        }
        const parts = droneId.split('-');
        if (parts.length === 2) {
            return `${parts[0]}-DRONE ${parts[1]}`;
        }
        return droneId.replace('_', ' ').toUpperCase();
    };

    const filteredAnomalies = useMemo(() => {
        if (activeFilter === 'All') {
            return anomalies;
        }
        return anomalies.filter(a => a.severity === activeFilter);
    }, [anomalies, activeFilter]);
    
    const severities: (AnomalySeverity | 'All')[] = ['All', 'High', 'Medium', 'Low'];
    const severityColors: Record<AnomalySeverity, string> = {
        High: 'bg-red-600 hover:bg-red-700',
        Medium: 'bg-yellow-600 hover:bg-yellow-700',
        Low: 'bg-blue-600 hover:bg-blue-700',
    }

    return (
        <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-gray-400">{t('anomaly_feed.filter_severity')}</span>
                {severities.map(sev => (
                    <button
                        key={sev}
                        onClick={() => setActiveFilter(sev)}
                        className={`px-3 py-1 text-sm font-bold rounded-full transition ${
                            activeFilter === sev 
                                ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' 
                                : 'opacity-70 hover:opacity-100'
                        } ${sev === 'All' ? 'bg-gray-600 hover:bg-gray-700' : severityColors[sev]}`}
                    >
                        {sev === 'All' ? t('anomaly_feed.filter.all') : sev}
                    </button>
                ))}
            </div>
            <div className="overflow-y-auto max-h-96 pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAnomalies.length > 0 ? (
                    filteredAnomalies.map(anomaly => (
                        <AnomalyCard 
                            key={anomaly.id} 
                            anomaly={anomaly} 
                            onSelect={() => onSelectAnomaly(anomaly.id)} 
                            onRepair={() => onInitiateRepair(anomaly.id)}
                            isSelected={anomaly.id === selectedAnomalyId}
                            droneDisplayName={getDroneDisplayName(anomaly.droneId)}
                        />
                    ))
                ) : (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        <p>{t('anomaly_feed.no_anomalies')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};