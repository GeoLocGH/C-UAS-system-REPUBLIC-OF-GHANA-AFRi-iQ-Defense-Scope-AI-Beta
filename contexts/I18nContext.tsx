import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Define the shape of the context
interface I18nContextType {
    language: string;
    setLanguage: (language: string) => void;
    t: (key: string, options?: Record<string, string | number>) => string;
}

// Create the context with a default value
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Define the props for the provider
interface I18nProviderProps {
    children: React.ReactNode;
}

// The provider component
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
    const [language, setLanguageState] = useState<string>(localStorage.getItem('language') || 'en');
    const [translations, setTranslations] = useState<Record<string, string>>({});

    // Load translations when language changes
    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                const response = await fetch(`/i18n/locales/${language}.json`);
                if (!response.ok) {
                    throw new Error(`Could not load ${language}.json`);
                }
                const data = await response.json();
                setTranslations(data);
            } catch (error) {
                console.error("Failed to load translations:", error);
                // Fallback to English if the selected language fails to load
                if (language !== 'en') {
                    setLanguageState('en');
                }
            }
        };
        fetchTranslations();
    }, [language]);

    // Function to set the language and save to localStorage
    const setLanguage = (lang: string) => {
        localStorage.setItem('language', lang);
        setLanguageState(lang);
    };
    
    // The translation function
    const t = useCallback((key: string, options?: Record<string, string | number>): string => {
        let translation = translations[key] || key;
        if (options) {
            Object.keys(options).forEach(optionKey => {
                translation = translation.replace(`{{${optionKey}}}`, String(options[optionKey]));
            });
        }
        return translation;
    }, [translations]);


    const value = { language, setLanguage, t };

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
};

// Custom hook to use the translation context
export const useTranslation = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }
    return context;
};
