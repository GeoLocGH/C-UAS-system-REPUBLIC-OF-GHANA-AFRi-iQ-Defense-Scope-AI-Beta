import React from 'react';
import type { LogEntry } from '../types';
import { useTranslation } from '../contexts/I18nContext';

interface CommandLogProps {
    logEntries: LogEntry[];
}

export const CommandLog: React.FC<CommandLogProps> = ({ logEntries }) => {
    const { t } = useTranslation();

    return (
        <div className="p-6">
            <div className="overflow-y-auto max-h-64 pr-2">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3">{t('command_log.header.timestamp')}</th>
                            <th scope="col" className="px-4 py-3">{t('command_log.header.target')}</th>
                            <th scope="col" className="px-4 py-3">{t('command_log.header.command')}</th>
                            <th scope="col" className="px-4 py-3">{t('command_log.header.details')}</th>
                            <th scope="col" className="px-4 py-3">{t('command_log.header.status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logEntries.map((entry, index) => (
                            <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-2 font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                                <td className="px-4 py-2">{entry.target}</td>
                                <td className="px-4 py-2">{entry.command}</td>
                                <td className="px-4 py-2 text-gray-500">{entry.details}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        entry.status === 'Success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                                    }`}>
                                        {entry.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                            {logEntries.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-4 text-gray-500">{t('command_log.no_commands')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};