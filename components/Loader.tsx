import React from 'react';

const Loader: React.FC = () => {
    return (
        <div className="w-6 h-6 relative flex items-center justify-center">
            {/* Pulsating background glow */}
            <div className="w-full h-full rounded-full bg-primary/50 animate-ping"></div>
            {/* Morphing shape */}
            <div className="absolute w-4 h-4 bg-gradient-to-br from-primary to-secondary animate-morph"
                 style={{ animationDuration: '4s' }}>
            </div>
        </div>
    );
};

export default Loader;