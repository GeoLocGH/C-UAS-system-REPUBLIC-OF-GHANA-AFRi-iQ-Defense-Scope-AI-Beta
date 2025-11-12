
import React from 'react';
import { useTranslation } from '../contexts/I18nContext';

export const AIVisionIndicator: React.FC<{ isTargetLocked: boolean; size?: 'small' | 'normal' }> = ({ isTargetLocked, size = 'normal' }) => {
    const { t } = useTranslation();
    const iconSize = size === 'small' ? 'h-4 w-4' : 'h-5 w-5';

    const facialRecIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className={`${iconSize} text-cyan-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10 16v-4a2 2 0 012-2h0a2 2 0 012 2v4M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z" />
        </svg>
    );

    const silhouetteIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className={`${iconSize} text-cyan-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    );

    const targetLockIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className={`${iconSize} transition-colors ${isTargetLocked ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3v18" />
        </svg>
    );

    return (
        <div className="flex items-center gap-3">
            <div title={t('ai_vision.facial_rec')}>
                {facialRecIcon}
            </div>
            <div title={t('ai_vision.silhouette')}>
                {silhouetteIcon}
            </div>
            <div title={isTargetLocked ? t('ai_vision.target_lock_active') : t('ai_vision.target_lock_inactive')}>
                {targetLockIcon}
            </div>
        </div>
    );
};
