import React, { useState, useMemo } from 'react';
import { ThreatType, type Threat, type ThreatSeverity } from '../types';
import { useTranslation } from '../contexts/I18nContext';
import { METERS_TO_FEET } from '../constants';

interface ThreatFeedProps {
    threats: Threat[];
    onSelectThreat: (id: string) => void;
    selectedThreatId: string | null;
    onRespondToThreat: (id: string) => void;
}

const ThreatCard: React.FC<{ threat: Threat; onSelect: () => void; isSelected: boolean; onRespond: () => void; }> = React.memo(({ threat, onSelect, isSelected, onRespond }) => {
    const { t } = useTranslation();

    const severityStyles: Record<ThreatSeverity, { bg: string; text: string; border: string }> = {
        Critical: { bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-500' },
        High: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500' },
        Medium: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-500' },
    };
    
    const threatTypeIcon: Record<ThreatType, string> = {
        [ThreatType.UNIDENTIFIED_DRONE]: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h2a1 1 0 011 1v2a1 1 0 001 1v3a1 1 0 00-1 1v2a1 1 0 01-1 1h-2a1 1 0 00-1 1v.5a1.5 1.5 0 01-3 0v-.5a1 1 0 00-1-1H7a1 1 0 01-1-1v-2a1 1 0 00-1-1V9a1 1 0 001-1V7a1 1 0 011-1h2a1 1 0 001-1v-.5z" /></svg>`,
        [ThreatType.HOSTILE_AIRCRAFT]: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>`,
        [ThreatType.BIRD_SWARM]: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 16a3.5 3.5 0 01-3.5-3.5V8.25a.75.75 0 011.5 0V12.5a2 2 0 002 2h.5a.75.75 0 010 1.5H5.5z" /><path d="M8 8.25a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3A.75.75 0 018 8.25z" /><path d="M9.25 12a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75z" /><path d="M14.5 16a3.5 3.5 0 003.5-3.5V8.25a.75.75 0 00-1.5 0V12.5a2 2 0 01-2 2h-.5a.75.75 0 000 1.5h.5z" /></svg>`,
        [ThreatType.JAMMING_SIGNAL]: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z" clip-rule="evenodd" transform="translate(-2, 0)"/><path fill-rule="evenodd" d="M3.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L6.94 10 3.22 6.28a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>`
    };
    
    const colors = severityStyles[threat.severity];
    
    const cardClasses = [
        "bg-gray-800",
        "rounded-lg",
        "shadow-lg",
        "border-l-4",
        colors.border,
        "transition-all",
        "duration-300",
        "scroll-mt-4",
        "flex flex-col",
        isSelected ? "ring-2 ring-purple-400 ring-offset-4 ring-offset-gray-900" : ""
    ].join(" ");

    const isPending = threat.responseStatus === 'pending' || !threat.responseStatus;
    const isJamming = threat.type === ThreatType.JAMMING_SIGNAL;
    const responseButtonText = isJamming ? t('threat_feed.respond.acknowledge_ai') : t('threat_feed.respond.acknowledge');
    const altitudeFt = (threat.location.alt * METERS_TO_FEET).toFixed(0);

    return (
        <div id={threat.id} className={cardClasses}>
            <div className={`p-4 flex-grow ${colors.bg}`}>
                <div className="flex justify-between items-start">
                    <div className="flex-grow">
                        <p className={`text-lg font-bold ${colors.text}`}>{t(`threat_type.${threat.type}`)}</p>
                        <p className="text-sm text-gray-400">{t(`threat_feed.location`, { lat: threat.location.lat.toFixed(4), lon: threat.location.lon.toFixed(4), alt: altitudeFt })}</p>
                    </div>
                    <span dangerouslySetInnerHTML={{ __html: threatTypeIcon[threat.type] }} className={colors.text} />
                </div>
                <p className="text-xs text-gray-500 mt-2">{new Date(threat.timestamp).toLocaleString()}</p>
                <p className="text-sm text-gray-300 mt-2 italic">"{threat.details}"</p>
            </div>
            <div className="p-2 border-t border-gray-700">
                 {isPending ? (
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={onSelect} 
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                        >
                            {t('threat_feed.view_on_map')}
                        </button>
                        <button 
                            onClick={onRespond} 
                            className={`w-full font-bold py-2 px-4 rounded-lg transition text-sm ${isJamming ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                            {responseButtonText}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={onSelect} 
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                        >
                            {t('threat_feed.view_on_map')}
                        </button>
                        <div className="text-center text-sm font-bold text-green-400 py-2 bg-gray-900 rounded-lg flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>{t('threat_feed.respond.acknowledged')}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});


export const ThreatFeed: React.FC<ThreatFeedProps> = ({ threats, onSelectThreat, selectedThreatId, onRespondToThreat }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);

    const sortedThreats = useMemo(() => {
        const severityOrder: Record<ThreatSeverity, number> = { Critical: 1, High: 2, Medium: 3 };
        return [...threats].sort((a, b) => {
            if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                return severityOrder[a.severity] - severityOrder[b.severity];
            }
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    }, [threats]);

    if (threats.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
            <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.95a.75.75 0 011.06 0l1.062 1.062a.75.75 0 01-1.06 1.06L5.05 5.012a.75.75 0 010-1.062zM3 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 013 10zm11.95 6.05a.75.75 0 01-1.06 0l-1.062-1.062a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 010 1.062zM17 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zm-5.05 3.95a.75.75 0 010-1.06l1.06-1.062a.75.75 0 011.06 1.06L13.012 14.95a.75.75 0 01-1.06 0zM10 17a.75.75 0 01-.75.75v1.5a.75.75 0 011.5 0v-1.5a.75.75 0 01-.75-.75zM5.05 16.05a.75.75 0 010-1.06l1.06-1.062a.75.75 0 011.06 1.06L6.112 14.95a.75.75 0 01-1.06 0z" clipRule="evenodd" />
                      <path d="M10 4.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM10 14a4 4 0 110-8 4 4 0 010 8z" />
                    </svg>
                    <h2 className="text-2xl font-semibold">{t('threat_feed.title', { count: threats.length })}</h2>
                </div>
                <button aria-expanded={isOpen}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
            {isOpen && (
                <div className="border-t border-gray-700 pt-4">
                    <div className="overflow-y-auto max-h-96 pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedThreats.map(threat => (
                            <ThreatCard
                                key={threat.id}
                                threat={threat}
                                onSelect={() => onSelectThreat(threat.id)}
                                isSelected={threat.id === selectedThreatId}
                                onRespond={() => onRespondToThreat(threat.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};