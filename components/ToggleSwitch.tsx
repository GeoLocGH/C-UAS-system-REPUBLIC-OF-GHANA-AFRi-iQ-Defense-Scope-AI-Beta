import React from 'react';

interface ToggleSwitchProps {
    id?: string;
    isEnabled: boolean;
    onToggle: () => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, isEnabled, onToggle }) => {
    return (
        <button
            id={id}
            onClick={onToggle}
            role="switch"
            aria-checked={isEnabled}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 ${
                isEnabled ? 'bg-cyan-600' : 'bg-gray-600'
            }`}
        >
            <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
};
