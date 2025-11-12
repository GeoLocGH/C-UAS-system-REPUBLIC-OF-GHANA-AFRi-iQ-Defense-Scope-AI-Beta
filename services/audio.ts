
// This service uses the Web Audio API to generate sounds without needing audio files.

const playSound = (type: 'sine' | 'square' | 'sawtooth' | 'triangle', frequency: number, duration: number) => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        // Fade out to prevent clicking sound
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.error("Web Audio API is not supported in this browser or failed to play sound.", e);
    }
};

// --- Alert Sound Definitions ---

// Success Sounds (1: Default, 2: Synth, 3: Classic)
const playSuccessSound1 = () => { playSound('sine', 600, 0.1); setTimeout(() => playSound('sine', 900, 0.15), 100); };
const playSuccessSound2 = () => { playSound('triangle', 800, 0.08); setTimeout(() => playSound('triangle', 1200, 0.1), 80); };
const playSuccessSound3 = () => { playSound('sine', 1046.50, 0.2); };

// Notification Sounds (1: Default, 2: Synth, 3: Classic)
const playNotificationSound1 = () => { playSound('sine', 880, 0.2); };
const playNotificationSound2 = () => { playSound('sine', 880, 0.1); setTimeout(() => playSound('sine', 880, 0.1), 150); };
const playNotificationSound3 = () => { playSound('triangle', 600, 0.2); };

// Warning Sounds (1: Default, 2: Synth, 3: Classic)
const playWarningSound1 = () => { playSound('sawtooth', 440, 0.15); setTimeout(() => playSound('sawtooth', 330, 0.2), 150); };
const playWarningSound2 = () => { playSound('sawtooth', 400, 0.1); setTimeout(() => playSound('sawtooth', 400, 0.1), 120); };
const playWarningSound3 = () => { playSound('square', 500, 0.3); };

// Error Sounds (1: Default, 2: Synth, 3: Classic)
const playErrorSound1 = () => { playSound('square', 220, 0.3); };
const playErrorSound2 = () => { playSound('square', 150, 0.4); };
const playErrorSound3 = () => { playSound('sawtooth', 100, 0.5); };


// --- Sound Player Dispatcher ---
export type SoundType = 'success' | 'notification' | 'warning' | 'error';
export type SoundChoice = '1' | '2' | '3';

const soundMap: Record<SoundType, Record<SoundChoice, () => void>> = {
  success: { '1': playSuccessSound1, '2': playSuccessSound2, '3': playSuccessSound3 },
  notification: { '1': playNotificationSound1, '2': playNotificationSound2, '3': playNotificationSound3 },
  warning: { '1': playWarningSound1, '2': playWarningSound2, '3': playWarningSound3 },
  error: { '1': playErrorSound1, '2': playErrorSound2, '3': playErrorSound3 },
};

export const playConfiguredSound = (type: SoundType, choice: SoundChoice) => {
  const soundFunction = soundMap[type]?.[choice];
  if (soundFunction) {
    soundFunction();
  } else {
    // Fallback to default if config is somehow invalid
    console.warn(`Invalid sound choice: ${type}, ${choice}. Falling back to default.`);
    soundMap[type]['1']();
  }
};
