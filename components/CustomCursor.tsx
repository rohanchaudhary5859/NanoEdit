import React, { useState, useEffect, useContext } from 'react';
import { motion, useSpring } from 'framer-motion';
import { ThemeContext } from '../App';

const CustomCursor: React.FC = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [cursorVariant, setCursorVariant] = useState('default');
    const themeContext = useContext(ThemeContext);

    useEffect(() => {
        const mouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        
        const handleMouseOver = (e: MouseEvent) => {
            if (e.target instanceof Element && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('button, a'))) {
                setCursorVariant('hover');
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            if (e.target instanceof Element && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('button, a'))) {
                setCursorVariant('default');
            }
        };

        window.addEventListener('mousemove', mouseMove);
        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);

        return () => {
            window.removeEventListener('mousemove', mouseMove);
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
        };
    }, []);

    const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
    const smoothMouse = {
        x: useSpring(mousePosition.x, springConfig),
        y: useSpring(mousePosition.y, springConfig),
    };
    
    const variants = {
        default: {
            scale: 1,
            backgroundColor: themeContext?.theme === 'dark' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(236, 72, 153, 0.8)',
        },
        hover: {
            scale: 2.5,
            backgroundColor: themeContext?.theme === 'dark' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(236, 72, 153, 0.4)',
        }
    }
    
    const trailColor = themeContext?.theme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(236, 72, 153, 0.2)';

    return (
        <div className="hidden md:block pointer-events-none fixed inset-0 z-[9999]">
            {/* Trail */}
            <motion.div
                style={{
                    left: smoothMouse.x,
                    top: smoothMouse.y,
                    translateX: '-50%',
                    translateY: '-50%',
                    backgroundColor: trailColor,
                }}
                animate={cursorVariant}
                variants={variants}
                transition={{ type: 'spring', ...springConfig, damping: 30, stiffness: 200 }}
                className="w-8 h-8 rounded-full fixed"
            />
            {/* Dot */}
            <motion.div
                style={{
                    left: mousePosition.x,
                    top: mousePosition.y,
                    translateX: '-50%',
                    translateY: '-50%',
                }}
                animate={cursorVariant}
                variants={variants}
                transition={{ type: 'spring', ...springConfig }}
                className="w-2 h-2 rounded-full fixed bg-primary"
            />
        </div>
    );
};

export default CustomCursor;