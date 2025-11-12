import React from 'react';

interface SignalStrengthIndicatorProps {
    strength: number; // 0-100
}

export const SignalStrengthIndicator: React.FC<SignalStrengthIndicatorProps> = ({ strength }) => {
    const getBarColor = (level: number) => {
        if (strength >= level) {
            if (strength < 30) return 'bg-red-500';
            if (strength < 60) return 'bg-yellow-500';
            return 'bg-green-500';
        }
        return 'bg-gray-600';
    };

    return (
        <div className="flex items-end space-x-1 h-4" title={`Signal: ${strength}%`}>
            <div className={`w-1.5 h-1/4 rounded-sm ${getBarColor(0)}`}></div>
            <div className={`w-1.5 h-2/4 rounded-sm ${getBarColor(30)}`}></div>
            <div className={`w-1.5 h-3/4 rounded-sm ${getBarColor(60)}`}></div>
            <div className={`w-1.5 h-full rounded-sm ${getBarColor(85)}`}></div>
        </div>
    );
};
