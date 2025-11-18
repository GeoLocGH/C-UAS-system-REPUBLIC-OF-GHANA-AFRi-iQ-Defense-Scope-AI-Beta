import React, { useState } from 'react';

interface WindowFrameProps {
    title: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    onClose?: () => void;
    headerRight?: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ title, children, className = "", onClose, headerRight }) => {
    const [minimized, setMinimized] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const [closed, setClosed] = useState(false);

    if (closed) return null;

    // Base classes for the card
    const baseClasses = "bg-gray-800 rounded-lg shadow-lg flex flex-col transition-all duration-300 relative border border-gray-700";
    // Fixed position for maximized state to overlay everything
    const maximizedClasses = "fixed inset-0 z-50 w-screen h-screen m-0 rounded-none bg-gray-900";
    
    return (
        <div className={`${baseClasses} ${maximized ? maximizedClasses : className}`}>
            {/* Header Bar */}
            <div 
                className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-750 rounded-t-lg select-none"
                onDoubleClick={() => setMaximized(!maximized)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* Traffic light style controls for a clean look */}
                    <div className="flex items-center gap-1.5 mr-2">
                         <button 
                            onClick={() => {
                                setClosed(true);
                                if (onClose) onClose();
                            }} 
                            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors focus:outline-none" 
                            title="Close"
                            aria-label="Close"
                        />
                        <button 
                            onClick={() => setMinimized(!minimized)} 
                            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors focus:outline-none" 
                            title={minimized ? "Expand" : "Minimize"}
                            aria-label={minimized ? "Expand" : "Minimize"}
                        />
                        <button 
                            onClick={() => setMaximized(!maximized)} 
                            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors focus:outline-none" 
                            title={maximized ? "Restore" : "Maximize"}
                            aria-label={maximized ? "Restore" : "Maximize"}
                        />
                    </div>
                    <div className="text-sm font-bold uppercase tracking-wide text-gray-200 truncate flex items-center gap-2">
                        {title}
                    </div>
                </div>
                <div className="flex items-center pl-2">
                    {headerRight}
                </div>
            </div>
            
            {/* Content Area */}
            {!minimized && (
                <div className={`flex-grow overflow-auto ${maximized ? 'p-6' : ''}`}>
                    {children}
                </div>
            )}
        </div>
    )
}