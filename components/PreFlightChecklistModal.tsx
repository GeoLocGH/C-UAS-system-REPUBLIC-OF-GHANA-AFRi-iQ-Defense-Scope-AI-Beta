

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/I18nContext';

interface PreFlightChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmLaunch: (droneId: string) => void;
    droneId: string | null;
    getDroneDisplayName: (droneId: string) => string;
}

const CHECKLIST_ITEM_KEYS = [
    "preflight.item1",
    "preflight.item2",
    "preflight.item3",
    "preflight.item4",
    "preflight.item5",
    "preflight.item6"
];

export const PreFlightChecklistModal: React.FC<PreFlightChecklistModalProps> = ({ isOpen, onClose, onConfirmLaunch, droneId, getDroneDisplayName }) => {
    const { t } = useTranslation();
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Reset checklist when modal is opened for a new target
        if (isOpen) {
            const initialChecks: Record<string, boolean> = {};
            CHECKLIST_ITEM_KEYS.forEach(itemKey => {
                initialChecks[itemKey] = false;
            });
            setCheckedItems(initialChecks);
        }
    }, [isOpen, droneId]);

    if (!isOpen || !droneId) {
        return null;
    }

    const handleCheckboxChange = (item: string) => {
        setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
    };

    const allItemsChecked = Object.values(checkedItems).every(isChecked => isChecked);

    const handleConfirm = () => {
        if (allItemsChecked) {
            onConfirmLaunch(droneId);
        }
    };

    let targetName: string;
    if (droneId === 'fleet') {
        targetName = t('preflight.target.fleet');
    } else if (droneId === 'group') {
        targetName = t('preflight.target.group');
    } else {
        targetName = getDroneDisplayName(droneId);
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" role="dialog" aria-modal="true">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-2">{t('preflight.title')}</h2>
                <p className="text-gray-400 mb-6">{t('preflight.subtitle', { targetName })}</p>
                
                <div className="space-y-4">
                    {CHECKLIST_ITEM_KEYS.map((itemKey, index) => (
                        <label key={index} className="flex items-center text-lg p-3 bg-gray-900 rounded-md cursor-pointer hover:bg-gray-700 transition">
                            <input
                                type="checkbox"
                                checked={checkedItems[itemKey] || false}
                                onChange={() => handleCheckboxChange(itemKey)}
                                className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-600"
                            />
                            <span className="ml-4 text-white">{t(itemKey)}</span>
                        </label>
                    ))}
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition">{t('preflight.cancel')}</button>
                    <button
                        onClick={handleConfirm}
                        disabled={!allItemsChecked}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold text-white transition disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                        {t('preflight.confirm_launch')}
                    </button>
                </div>
            </div>
        </div>
    );
};