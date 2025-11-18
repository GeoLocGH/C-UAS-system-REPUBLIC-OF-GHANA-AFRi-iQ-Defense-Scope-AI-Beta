import React, { useState } from 'react';
import { AIAction, type AIActionRequest, AIPriority } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface AIActionRequestsProps {
    requests: AIActionRequest[];
    onRespond: (requestId: string, approved: boolean) => void;
    onOverride: (requestId: string, action: AIAction) => void;
    getDroneDisplayName: (droneId: string) => string;
}

const formatTimeAgo = (timestamp: string): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
};

const priorityOrder: Record<AIPriority, number> = {
    [AIPriority.Critical]: 1,
    [AIPriority.High]: 2,
    [AIPriority.Medium]: 3,
    [AIPriority.Low]: 4,
};

const priorityStyles: Record<AIPriority, { border: string; bg: string; badgeBg: string; badgeText: string; }> = {
    [AIPriority.Critical]: { border: 'border-l-4 border-red-500 critical-request-pulse', bg: 'bg-red-900/20', badgeBg: 'bg-red-500', badgeText: 'text-white' },
    [AIPriority.High]: { border: 'border-l-4 border-amber-500 high-request-pulse', bg: 'bg-amber-900/20', badgeBg: 'bg-amber-500', badgeText: 'text-black' },
    [AIPriority.Medium]: { border: 'border-l-4 border-blue-500', bg: '', badgeBg: 'bg-blue-500', badgeText: 'text-white' },
    [AIPriority.Low]: { border: 'border-l-4 border-gray-600', bg: '', badgeBg: 'bg-gray-600', badgeText: 'text-white' },
};

const RequestCard: React.FC<{
    request: AIActionRequest;
    onRespond: (requestId: string, approved: boolean) => void;
    onOverride: (requestId: string, action: AIAction) => void;
    getDroneDisplayName: (droneId: string) => string;
}> = ({ request, onRespond, onOverride, getDroneDisplayName }) => {
    const { t } = useTranslation();
    const [overrideAction, setOverrideAction] = useState<AIAction | ''>('');

    const formatAction = (action: AIAction) => t(`action.${action}`);
    const allActions = Object.values(AIAction).filter(a => a !== AIAction.COUNTER_COMMAND && a !== AIAction.ENGAGE_GROUND_DEFENSE);
    const styles = priorityStyles[request.priority] || priorityStyles[AIPriority.Low];

    const handleOverride = () => {
        if (overrideAction) {
            onOverride(request.id, overrideAction);
        }
    };
    
    const isGroundDefenseRequest = request.action === AIAction.ENGAGE_GROUND_DEFENSE;
    let displayName: string;
    if (isGroundDefenseRequest) {
        const systemName = request.droneId.split('-')[0].toUpperCase();
        displayName = t('counter_uas.title_id', { id: systemName });
    } else {
        displayName = getDroneDisplayName(request.droneId);
    }

    return (
        <div key={request.id} className={`bg-gray-900 ${styles.bg} p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 shadow-md ${styles.border}`}>
            <div className="flex-grow w-full">
                <div className="flex justify-between items-start mb-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles.badgeBg} ${styles.badgeText}`}>
                        {t(`priority.${request.priority.toLowerCase()}`)}
                    </span>
                    <p className="text-xs text-gray-500">{formatTimeAgo(request.timestamp)}</p>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
                    <span className="font-semibold text-gray-400 text-right">{isGroundDefenseRequest ? t('ai_requests.system') : t('ai_requests.drone')}</span>
                    <span className="text-cyan-400 font-bold">{displayName}</span>

                    <span className="font-semibold text-gray-400 text-right">{t('ai_requests.action')}</span>
                    <span className="text-amber-400 font-bold">{formatAction(request.action)}</span>

                    <span className="font-semibold text-gray-400 text-right">{t('ai_requests.reason')}</span>
                    <span className="text-gray-300">{request.reason}</span>
                </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-stretch gap-3 w-full md:w-[320px]">
                <div className="flex items-center gap-3 w-full">
                    <button
                        onClick={() => onRespond(request.id, true)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
                        aria-label={`Approve ${formatAction(request.action)} for ${displayName}`}
                    >
                        {t('ai_requests.approve')}
                    </button>
                    <button
                        onClick={() => onRespond(request.id, false)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition"
                        aria-label={`Deny ${formatAction(request.action)} for ${displayName}`}
                    >
                        {t('ai_requests.deny')}
                    </button>
                </div>
                {!isGroundDefenseRequest && (
                    <div className="flex items-stretch gap-2 w-full">
                        <select
                            value={overrideAction}
                            onChange={(e) => setOverrideAction(e.target.value as AIAction)}
                            className="flex-grow bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                            aria-label={t('ai_requests.select_override')}
                        >
                            <option value="">{t('ai_requests.select_override')}</option>
                            {allActions
                                .filter(action => action !== request.action)
                                .map(action => (
                                    <option key={action} value={action}>{formatAction(action)}</option>
                                ))
                            }
                        </select>
                        <button
                            onClick={handleOverride}
                            disabled={!overrideAction}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-gray-600 disabled:cursor-not-allowed"
                            aria-label={t('ai_requests.override')}
                        >
                            {t('ai_requests.override')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


export const AIActionRequests: React.FC<AIActionRequestsProps> = ({ requests, onRespond, onOverride, getDroneDisplayName }) => {
    const { t } = useTranslation();
    const [now, setNow] = React.useState(Date.now());
    const [activeFilter, setActiveFilter] = React.useState<AIAction | 'All'>('All');

    React.useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(interval);
    }, []);

    const sortedRequests = React.useMemo(() => {
        return [...requests].sort((a, b) => {
            const priorityA = priorityOrder[a.priority] || 99;
            const priorityB = priorityOrder[b.priority] || 99;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
    }, [requests]);
    
    const formatAction = (action: AIAction) => t(`action.${action}`);

    const allFilters = React.useMemo(() => {
        const dynamicFilters = Object.values(AIAction).filter(a => a !== AIAction.COUNTER_COMMAND)
            .map(action => ({
                id: action,
                label: formatAction(action),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return [{ id: 'All', label: t('ai_requests.filter.all') }, ...dynamicFilters];
    }, [t, formatAction]);

    const filteredRequests = React.useMemo(() => {
        if (activeFilter === 'All') return sortedRequests;
        return sortedRequests.filter(req => req.action === activeFilter);
    }, [sortedRequests, activeFilter]);


    if (requests.length === 0) {
        return null;
    }

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {allFilters.map(({ id, label }) => (
                         <button
                            key={id}
                            onClick={() => setActiveFilter(id as AIAction | 'All')}
                            className={`px-3 py-1 text-sm font-bold rounded-full transition ${activeFilter === id ? 'bg-cyan-500 text-white ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-500' : 'bg-gray-600 hover:bg-gray-700'}`}
                        >
                           {label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="space-y-4">
                {filteredRequests.map(request => (
                    <RequestCard 
                        key={request.id}
                        request={request}
                        onRespond={onRespond}
                        onOverride={onOverride}
                        getDroneDisplayName={getDroneDisplayName}
                    />
                ))}
                 {filteredRequests.length === 0 && requests.length > 0 && (
                    <div className="text-center py-4 text-gray-500">
                        <p>{t('ai_requests.filter.no_requests')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};