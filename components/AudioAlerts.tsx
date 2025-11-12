import React, { useState } from 'react';
import type { AlertPreferences, SoundChoice } from '../types';
import { ToggleSwitch } from './ToggleSwitch';
import { playConfiguredSound, SoundType } from '../services/audio';
import { speak } from '../services/tts';
import { useTranslation } from '../contexts/I18nContext';


interface AudioAlertsProps {
    preferences: AlertPreferences;
    onPreferencesChange: (prefs: AlertPreferences) => void;
    availableVoices: SpeechSynthesisVoice[];
}

const SoundCustomizationRow: React.FC<{
    label: string;
    type: SoundType;
    currentChoice: SoundChoice;
    onChange: (type: SoundType, choice: SoundChoice) => void;
}> = ({ label, type, currentChoice, onChange }) => {
    const { t } = useTranslation();

    const soundOptions: { value: SoundChoice; label: string }[] = [
        { value: '1', label: t('audio_alerts.sound.option.default') },
        { value: '2', label: t('audio_alerts.sound.option.synth') },
        { value: '3', label: t('audio_alerts.sound.option.classic') },
    ];

    const handlePreview = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the main panel from collapsing
        playConfiguredSound(type, currentChoice);
    };

    return (
        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700 py-2">
            <label htmlFor={`sound-select-${type}`} className="text-gray-300">{label}</label>
            <div className="flex items-center gap-3">
                <select
                    id={`sound-select-${type}`}
                    value={currentChoice}
                    onChange={(e) => onChange(type, e.target.value as SoundChoice)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gray-700 text-white rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label={`Select sound for ${label}`}
                >
                    {soundOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <button onClick={handlePreview} title={t('audio_alerts.sound.preview', { label })} aria-label={t('audio_alerts.sound.preview', { label })} className="p-2 text-gray-400 hover:text-cyan-400 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export const AudioAlerts: React.FC<AudioAlertsProps> = ({ preferences, onPreferencesChange, availableVoices }) => {
    const { t, language } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = (key: keyof Omit<AlertPreferences, 'sounds' | 'selectedVoice'>) => {
        onPreferencesChange({ ...preferences, [key]: !preferences[key] });
    };
    
    const handleSoundChange = (type: SoundType, choice: SoundChoice) => {
        const newSounds = { ...preferences.sounds, [type]: choice };
        onPreferencesChange({ ...preferences, sounds: newSounds });
    };

     const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newVoice = e.target.value;
        onPreferencesChange({ ...preferences, selectedVoice: newVoice || null });
    };

    const handlePreviewVoice = (e: React.MouseEvent) => {
        e.stopPropagation();
        const voiceToPreview = preferences.selectedVoice;
        speak(t('audio_alerts.preview_voice_text'), voiceToPreview, language);
    };


    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728m2.828 9.9a5 5 0 010-7.072" />
                    </svg>
                    <h2 className="text-2xl font-semibold">{t('audio_alerts.title')}</h2>
                </div>
                <button aria-expanded={isOpen}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
            {isOpen && (
                <div className="mt-6 border-t border-gray-700 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">{t('audio_alerts.master')}</span>
                        <ToggleSwitch isEnabled={preferences.master} onToggle={() => handleToggle('master')} />
                    </div>
                     <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">{t('audio_alerts.read_aloud')}</span>
                        <ToggleSwitch isEnabled={preferences.readAloud} onToggle={() => handleToggle('readAloud')} />
                    </div>
                    {preferences.readAloud && (
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700 py-2">
                            <label htmlFor="voice-select" className="text-gray-300">{t('audio_alerts.voice')}</label>
                            <div className="flex items-center gap-3">
                                <select
                                    id="voice-select"
                                    value={preferences.selectedVoice || ''}
                                    onChange={handleVoiceChange}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-gray-700 text-white rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 max-w-[200px] text-ellipsis"
                                    aria-label={t('audio_alerts.voice')}
                                    disabled={availableVoices.length === 0}
                                >
                                    <option value="">{t('audio_alerts.voice.default')}</option>
                                    {availableVoices.map(voice => (
                                        <option key={voice.name} value={voice.name}>
                                            {`${voice.name} (${voice.lang})`}
                                        </option>
                                    ))}
                                </select>
                                <button onClick={handlePreviewVoice} title={t('audio_alerts.preview_voice')} aria-label={t('audio_alerts.preview_voice')} className="p-2 text-gray-400 hover:text-cyan-400 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                    <div className={`space-y-4 transition-opacity ${preferences.master ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="connectionLostToggle">{t('audio_alerts.connection_lost')}</label>
                            <ToggleSwitch id="connectionLostToggle" isEnabled={preferences.connectionLost} onToggle={() => handleToggle('connectionLost')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="lowBatteryToggle">{t('audio_alerts.low_battery')}</label>
                            <ToggleSwitch id="lowBatteryToggle" isEnabled={preferences.lowBattery} onToggle={() => handleToggle('lowBattery')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="droneHealthToggle">{t('audio_alerts.drone_health')}</label>
                            <ToggleSwitch id="droneHealthToggle" isEnabled={preferences.droneHealthStatus} onToggle={() => handleToggle('droneHealthStatus')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="aiRequestToggle">{t('audio_alerts.ai_request')}</label>
                            <ToggleSwitch id="aiRequestToggle" isEnabled={preferences.aiRequestReceived} onToggle={() => handleToggle('aiRequestReceived')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="aiTargetDesignationToggle">{t('audio_alerts.new_ai_target_designation')}</label>
                            <ToggleSwitch id="aiTargetDesignationToggle" isEnabled={preferences.newAITargetDesignation} onToggle={() => handleToggle('newAITargetDesignation')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="newThreatToggle">{t('audio_alerts.new_threat_detected')}</label>
                            <ToggleSwitch id="newThreatToggle" isEnabled={preferences.newThreatDetected} onToggle={() => handleToggle('newThreatDetected')} />
                        </div>
                         <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="aiMissionCompleteToggle">{t('audio_alerts.ai_mission_complete')}</label>
                            <ToggleSwitch id="aiMissionCompleteToggle" isEnabled={preferences.aiMissionComplete} onToggle={() => handleToggle('aiMissionComplete')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="presetMissionSuccessToggle">{t('audio_alerts.preset_mission_success')}</label>
                            <ToggleSwitch id="presetMissionSuccessToggle" isEnabled={preferences.presetMissionSuccess} onToggle={() => handleToggle('presetMissionSuccess')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="interceptionSuccessToggle">{t('audio_alerts.interception_success')}</label>
                            <ToggleSwitch id="interceptionSuccessToggle" isEnabled={preferences.interceptionSuccess} onToggle={() => handleToggle('interceptionSuccess')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="missionStartToggle">{t('audio_alerts.mission_start')}</label>
                            <ToggleSwitch id="missionStartToggle" isEnabled={preferences.missionStart} onToggle={() => handleToggle('missionStart')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="returnToBaseToggle">{t('audio_alerts.return_to_base')}</label>
                            <ToggleSwitch id="returnToBaseToggle" isEnabled={preferences.returnToBase} onToggle={() => handleToggle('returnToBase')} />
                        </div>
                         <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="highSeverityAnomalyToggle">{t('audio_alerts.high_severity_anomaly')}</label>
                            <ToggleSwitch id="highSeverityAnomalyToggle" isEnabled={preferences.highSeverityAnomaly} onToggle={() => handleToggle('highSeverityAnomaly')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="repairCompleteToggle">{t('audio_alerts.repair_complete')}</label>
                            <ToggleSwitch id="repairCompleteToggle" isEnabled={preferences.repairComplete} onToggle={() => handleToggle('repairComplete')} />
                        </div>
                        <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="repairFailedToggle">{t('audio_alerts.repair_failed')}</label>
                            <ToggleSwitch id="repairFailedToggle" isEnabled={preferences.repairFailed} onToggle={() => handleToggle('repairFailed')} />
                        </div>
                         <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="geofenceEntryToggle">{t('audio_alerts.geofence_entry')}</label>
                            <ToggleSwitch id="geofenceEntryToggle" isEnabled={preferences.geofenceEntry} onToggle={() => handleToggle('geofenceEntry')} />
                        </div>
                         <div className="flex items-center justify-between pl-4 border-l-2 border-gray-700">
                            <label htmlFor="geofenceExitToggle">{t('audio_alerts.geofence_exit')}</label>
                            <ToggleSwitch id="geofenceExitToggle" isEnabled={preferences.geofenceExit} onToggle={() => handleToggle('geofenceExit')} />
                        </div>
                    </div>
                    <div className={`mt-6 border-t border-gray-700 pt-6 space-y-2 transition-opacity ${preferences.master ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                         <h3 className="font-bold text-lg mb-3">{t('audio_alerts.sound_customization')}</h3>
                         <SoundCustomizationRow label={t('audio_alerts.sound.success')} type="success" currentChoice={preferences.sounds.success} onChange={handleSoundChange} />
                         <SoundCustomizationRow label={t('audio_alerts.sound.notification')} type="notification" currentChoice={preferences.sounds.notification} onChange={handleSoundChange} />
                         <SoundCustomizationRow label={t('audio_alerts.sound.warning')} type="warning" currentChoice={preferences.sounds.warning} onChange={handleSoundChange} />
                         <SoundCustomizationRow label={t('audio_alerts.sound.error')} type="error" currentChoice={preferences.sounds.error} onChange={handleSoundChange} />
                    </div>
                </div>
            )}
        </div>
    );
};
