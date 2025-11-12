import React, { useState, useEffect } from 'react';
import { fetchWeatherData } from '../services/api';
import { WeatherData } from '../types';
import { useTranslation } from '../contexts/I18nContext';

const SunIconSVG = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const CloudIconSVG = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;
const RainIconSVG = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15zm4-2v1m0 3v1m4-6v1m0 3v1m4-4v1m0 3v1" /></svg>;
const ThunderstormIconSVG = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const SnowIconSVG = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M5.636 5.636l12.728 12.728M5.636 18.364L18.364 5.636" /> </svg>;

const getWindDirectionArrow = (degrees: number) => {
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform" style={{ rotate: `${degrees}deg` }} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" /></svg>;
};

const BASE_LOCATION = { lat: 5.569787, lon: -0.128979 };

export const WeatherWidget: React.FC = () => {
    const { t } = useTranslation();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Not starting a new request if one is already loading
                if (!isLoading) setIsLoading(true);
                const data = await fetchWeatherData(BASE_LOCATION.lat, BASE_LOCATION.lon);
                setWeather(data);
            } catch (error) {
                console.error("Failed to fetch weather data:", error);
                setWeather(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWeather();
        const intervalId = setInterval(fetchWeather, 30000); // Update every 30 seconds

        return () => clearInterval(intervalId);
    }, []);

    const weatherIcons: Record<WeatherData['condition'], React.ReactNode> = {
        Clear: <SunIconSVG />,
        Clouds: <CloudIconSVG />,
        Rain: <RainIconSVG />,
        Thunderstorm: <ThunderstormIconSVG />,
        Snow: <SnowIconSVG />,
    };
    
    if (isLoading && !weather) {
        return <div className="absolute top-4 left-4 text-xs text-gray-400 p-2">{t('weather.loading')}</div>;
    }

    if (!weather) {
        return <div className="absolute top-4 left-4 text-xs text-red-400 p-2">{t('weather.unavailable')}</div>;
    }
    
    // Convert Celsius to Fahrenheit for display
    const tempF = (weather.temperature * 9/5) + 32;

    return (
        <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-50 backdrop-blur-sm p-2 rounded-lg border border-gray-700 shadow-lg">
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                    {weatherIcons[weather.condition]}
                </div>
                <div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-white">{t('weather.temp_f', { temp: tempF.toFixed(0) })}</span>
                        <span className="text-xs text-gray-300">/ {t('weather.temp_c', { temp: weather.temperature.toFixed(0) })}</span>
                    </div>
                    <p className="text-xs text-gray-400">{t(`weather.condition.${weather.condition.toLowerCase()}`)}</p>
                </div>
                <div className="border-l border-gray-600 pl-3 flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-300">
                        {getWindDirectionArrow(weather.windDirection)}
                        <span className="font-semibold">{t('weather.wind', { speed: (weather.windSpeed * 0.621371).toFixed(0) })}</span>
                    </div>
                    <p className="text-gray-400">{t('weather.humidity', { humidity: weather.humidity.toFixed(0) })}</p>
                    <p className="text-gray-400">{t('weather.visibility', { vis: weather.visibility.toFixed(1) })}</p>
                    <p className="text-gray-400">{t('weather.qnh', { qnh: weather.qnh.toFixed(0) })}</p>
                </div>
            </div>
        </div>
    );
};