

import React from 'react';
import { DroneStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import { useTranslation } from '../contexts/I18nContext';

interface StatusIndicatorProps {
    status: DroneStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
    const { t } = useTranslation();
    const color = STATUS_COLORS[status] || 'bg-gray-400';
    const text = t(`status.${status}`);

    return (
        <div className="flex items-center">
            <span className={`status-dot ${color} mr-2`}></span>{text}
        </div>
    );
};
