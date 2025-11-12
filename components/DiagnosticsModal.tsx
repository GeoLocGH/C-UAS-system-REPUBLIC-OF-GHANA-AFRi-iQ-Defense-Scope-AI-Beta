

import React from 'react';
import type { DiagnosticsReport, DiagnosticStatus, DiagnosticCheck } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface DiagnosticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    droneId: string | null;
    isLoading: boolean;
    result: DiagnosticsReport | null;
    getDroneDisplayName: (droneId: string) => string;
}

const StatusPill: React.FC<{ status: DiagnosticStatus }> = ({ status }) => {
    const styles: Record<DiagnosticStatus, string> = {
        PASS: 'bg-green-500 text-white',
        WARNING: 'bg-yellow-500 text-black',
        FAIL: 'bg-red-500 text-white',
    };
    return (
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles[status]}`}>
            {status}
        </span>
    );
};

const OverallStatusBanner: React.FC<{ status: DiagnosticStatus }> = ({ status }) => {
    const { t } = useTranslation();
    const styles: Record<DiagnosticStatus, { bg: string; text: string; messageKey: string }> = {
        PASS: { bg: 'bg-green-800', text: 'text-green-300', messageKey: 'diagnostics.status.pass' },
        WARNING: { bg: 'bg-yellow-800', text: 'text-yellow-300', messageKey: 'diagnostics.status.warning' },
        FAIL: { bg: 'bg-red-800', text: 'text-red-300', messageKey: 'diagnostics.status.fail' },
    };
    const style = styles[status];

    return (
        <div className={`p-4 rounded-lg text-center ${style.bg} ${style.text} mb-6`}>
            <h3 className="text-xl font-bold">{t(style.messageKey)}</h3>
        </div>
    );
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose, droneId, isLoading, result, getDroneDisplayName }) => {
    const { t } = useTranslation();
    
    if (!isOpen) {
        return null;
    }
    
    const targetName = droneId ? getDroneDisplayName(droneId) : '';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" aria-modal="true" role="dialog">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6 flex-shrink-0">
                    {t('diagnostics.title', { targetName })}
                </h2>
                
                <div className="flex-grow overflow-y-auto pr-4">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full">
                             <svg className="animate-spin h-10 w-10 text-cyan-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-lg text-gray-400">{t('diagnostics.running')}</p>
                        </div>
                    )}

                    {!isLoading && result && (
                        <div>
                            <OverallStatusBanner status={result.overallStatus} />
                            <ul className="space-y-3">
                                {result.checks.map((check, index) => (
                                    <li key={index} className="bg-gray-900 p-4 rounded-lg flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold text-white">{t(check.checkNameKey)}</p>
                                            <p className="text-sm text-gray-400">{t(check.detailsKey, check.detailsOptions)}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <StatusPill status={check.status} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end space-x-4 flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold text-white transition"
                        aria-label="Close diagnostics report"
                    >
                        {t('diagnostics.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};
