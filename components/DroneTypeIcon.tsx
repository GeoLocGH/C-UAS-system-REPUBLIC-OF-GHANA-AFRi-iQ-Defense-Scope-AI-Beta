import React from 'react';

interface DroneTypeIconProps {
    type: 'Assault' | 'Recon' | 'Interceptor';
    className?: string;
}

const AssaultIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Assault Drone Icon" role="img">
        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
    </svg>
);

const ReconIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Recon Drone Icon" role="img">
        <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-7 2H2v3h3v-3zm14 0h-3v3h3v-3z" />
    </svg>
);

const InterceptorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-label="Interceptor Drone Icon" role="img">
        <path d="M12 2 L2 22 L12 17 L22 22 Z" />
    </svg>
);


export const DroneTypeIcon: React.FC<DroneTypeIconProps> = ({ type, className }) => {
    if (type === 'Assault') {
        return <AssaultIcon className={className} />;
    }
    if (type === 'Interceptor') {
        return <InterceptorIcon className={className} />;
    }
    return <ReconIcon className={className} />;
};