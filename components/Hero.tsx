import React from 'react';
import { motion } from 'framer-motion';

interface HeroProps {
    onNavigate: (id: string) => void;
}

const AnimatedShapes = () => {
    const shapes = [
        { id: 1, size: 'w-64 h-64', pos: 'top-1/4 left-1/4', bg: 'bg-primary/20' },
        { id: 2, size: 'w-48 h-48', pos: 'top-1/2 right-1/4', bg: 'bg-secondary/20' },
        { id: 3, size: 'w-32 h-32', pos: 'bottom-1/4 left-1/3', bg: 'bg-primary/10' },
        { id: 4, size: 'w-72 h-72', pos: 'bottom-1/2 right-1/3', bg: 'bg-secondary/10' },
        { id: 5, size: 'w-56 h-56', pos: 'top-1/3 right-1/2', bg: 'bg-primary/20' },
        { id: 6, size: 'w-24 h-24', pos: 'bottom-1/3 left-1/2', bg: 'bg-secondary/10' },
        { id: 7, size: 'w-40 h-40', pos: 'top-1/4 right-1/3', bg: 'bg-primary/15' },
    ];

    return (
        <div className="absolute inset-0 z-0" style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}>
            {shapes.map(shape => (
                 <motion.div
                    key={shape.id}
                    className={`absolute rounded-full filter blur-3xl opacity-50 ${shape.size} ${shape.pos} ${shape.bg}`}
                    animate={{
                        x: [0, Math.random() * 100 - 50, 0],
                        y: [0, Math.random() * 100 - 50, 0],
                        z: [0, Math.random() * 200 - 100, 0], // Adds depth
                        scale: [1, 1.05, 1], // Adds subtle pulse
                        rotateX: [0, Math.random() * 60 - 30, 0],
                        rotateY: [0, Math.random() * 60 - 30, 0],
                    }}
                    transition={{
                        duration: 25 + Math.random() * 15,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
};


const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
    return (
        <section id="hero" className="relative h-screen flex items-center justify-center text-center overflow-hidden pt-20">
            <AnimatedShapes />
            <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="font-display text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-4 tracking-wider">
                        Transform Your Images with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Text</span>.
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
                        NanoBanana AI lets you edit and enhance images instantly with simple natural language commands.
                    </p>
                    <div className="flex justify-center space-x-4">
                         <motion.button 
                            onClick={() => onNavigate('editor')}
                            className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full shadow-lg hover:shadow-primary/50 transition-shadow"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                         >
                            Try Editor
                         </motion.button>
                         <motion.button 
                            onClick={() => onNavigate('editor')}
                            className="px-8 py-3 bg-gray-500/20 dark:bg-white/10 text-gray-800 dark:text-white font-bold rounded-full border border-gray-500/30 dark:border-white/20 hover:border-primary/50 dark:hover:border-primary transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                         >
                            Upload Image
                         </motion.button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;