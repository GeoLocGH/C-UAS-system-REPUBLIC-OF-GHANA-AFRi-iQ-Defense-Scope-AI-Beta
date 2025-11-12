// This service uses the Web Speech API for text-to-speech.

let voices: SpeechSynthesisVoice[] = [];

// Function to get available voices for the UI, filtered by language
export const getAvailableVoices = (lang: string): SpeechSynthesisVoice[] => {
    if (!voices.length) {
        // Attempt to load them synchronously if they haven't been loaded yet.
        voices = window.speechSynthesis.getVoices();
    }
    const languageVoices = voices.filter(v => v.lang.startsWith(lang));
    
    // Simple sort by name
    languageVoices.sort((a, b) => a.name.localeCompare(b.name));

    return languageVoices;
};

// Function to load and cache voices
const loadVoices = () => {
    voices = window.speechSynthesis.getVoices();
};

// The 'voiceschanged' event is fired when the list of voices has been loaded.
if ('speechSynthesis' in window) {
    loadVoices(); // Load voices initially
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}

export const speak = (text: string, voiceName: string | null = null, lang: string = 'en') => {
    if ('speechSynthesis' in window) {
        try {
            // Cancel any previous utterances to prevent overlap and ensure the latest alert is spoken
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            
            let voiceToUse: SpeechSynthesisVoice | null = null;
            
            // 1. Try to find the specifically requested voice by name
            if (voiceName) {
                voiceToUse = voices.find(v => v.name === voiceName) || null;
            }
            
            // 2. If no specific voice requested or found, find the best one for the language
            if (!voiceToUse) {
                // Ensure voices are loaded
                if (voices.length === 0) loadVoices();
                
                // Find voices for the current language
                const langVoices = voices.filter(v => v.lang.startsWith(lang));
                
                if (langVoices.length > 0) {
                    // Try to find a non-local voice first (often higher quality)
                    voiceToUse = langVoices.find(v => !v.localService) || langVoices[0];
                }
            }

            if (voiceToUse) {
                utterance.voice = voiceToUse;
            }

            utterance.lang = lang;
            utterance.rate = 1.0; 
            utterance.pitch = 1.0; 
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Text-to-speech failed.", e);
        }
    } else {
        console.warn("Text-to-speech is not supported in this browser.");
    }
};