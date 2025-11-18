import React from 'react';
import { FlightAnalysisSuggestion, FlightSuggestionType } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface FlightPathAnalysisProps {
    suggestions: FlightAnalysisSuggestion[];
    onRespond: (suggestionId: string, approved: boolean) => void;
    getDroneDisplayName: (droneId: string) => string;
}

export const FlightPathAnalysis: React.FC<FlightPathAnalysisProps> = ({ suggestions, onRespond, getDroneDisplayName }) => {
    const { t } = useTranslation();

    const formatSuggestionType = (type: FlightSuggestionType): string => {
        switch(type) {
            case FlightSuggestionType.HIGH_TURBULENCE:
                return t('suggestion.high_turbulence');
            case FlightSuggestionType.SIGNAL_LOSS_ZONE:
                return t('suggestion.signal_loss_zone');
            default:
                return t('suggestion.unknown');
        }
    };
    
    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div className="p-6">
            <div className="space-y-4">
                {suggestions.map(suggestion => (
                    <div key={suggestion.id} className="bg-gray-900 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
                        <div className="flex-grow w-full">
                           <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
                                <span className="font-semibold text-gray-400 text-right">{t('path_intelligence.drone')}</span>
                                <span className="text-cyan-400 font-bold">{getDroneDisplayName(suggestion.droneId)}</span>

                                <span className="font-semibold text-gray-400 text-right">{t('path_intelligence.hazard')}</span>
                                <span className="text-blue-400 font-bold">{formatSuggestionType(suggestion.suggestionType)}</span>

                                <span className="font-semibold text-gray-400 text-right">{t('path_intelligence.reason')}</span>
                                <span className="text-gray-300">{suggestion.reason}</span>
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-2 w-full md:w-auto">
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => onRespond(suggestion.id, true)}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
                                >
                                    {t('path_intelligence.accept')}
                                </button>
                                <button
                                    onClick={() => onRespond(suggestion.id, false)}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition"
                                >
                                    {t('path_intelligence.decline')}
                                </button>
                            </div>
                             <p className="text-xs text-gray-500">{new Date(suggestion.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};