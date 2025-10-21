import React, { useContext, useState, useEffect } from 'react';
// FIX: Add Variants to framer-motion import to fix typing issues.
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ThemeContext } from '../App';
import { SunIcon, MoonIcon, LogoIcon } from './icons';

interface HeaderProps {
    onNavigate: (id: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
    const themeContext = useContext(ThemeContext);
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!themeContext) {
        return null;
    }

    const { theme, toggleTheme } = themeContext;

    const navLinks = [
        { id: 'hero', label: 'Home' },
        { id: 'editor', label: 'Editor' },
        { id: 'about', label: 'How It Works' },
    ];

    // FIX: Add Variants type to help TypeScript infer the correct types for framer-motion transitions.
    const menuVariants: Variants = {
        open: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        },
        closed: { 
            opacity: 0, 
            y: "-20%", 
            transition: { duration: 0.2 }
        }
    };
    
    // FIX: Add Variants type to help TypeScript infer the correct types for framer-motion transitions.
    const navItemVariants: Variants = {
        open: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        },
        closed: { opacity: 0, y: 20, transition: { duration: 0.2 } }
    };

    const handleNavClick = (id: string) => {
        onNavigate(id);
        setIsMobileMenuOpen(false);
    }

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || isMobileMenuOpen ? 'bg-white/10 dark:bg-black/20 backdrop-blur-sm border-b border-gray-200/20 dark:border-white/10' : 'bg-transparent border-b border-transparent'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <motion.div 
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => handleNavClick('hero')}
                        whileHover={{ scale: 1.05 }}
                    >
                        <LogoIcon className="w-8 h-8 text-primary" />
                        <span className="font-display text-2xl font-bold text-gray-900 dark:text-white">NanoEdit</span>
                    </motion.div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                             <motion.button 
                                key={link.id}
                                onClick={() => handleNavClick(link.id)}
                                className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors font-medium"
                                whileHover={{ y: -2 }}
                            >
                                {link.label}
                            </motion.button>
                        ))}
                    </nav>

                    {/* Controls */}
                    <div className="flex items-center space-x-4">
                        <motion.button
                            onClick={toggleTheme}
                            className="p-2 rounded-full bg-gray-500/20 dark:bg-white/10 text-gray-800 dark:text-white"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
                        </motion.button>
                         <motion.button 
                            onClick={() => handleNavClick('editor')}
                            className="hidden lg:block px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full shadow-md hover:shadow-primary/50 transition-shadow"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                         >
                            Try Now
                         </motion.button>
                         {/* Mobile Menu Button */}
                         <div className="md:hidden">
                             <motion.button
                                 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                 className="relative w-8 h-8 text-gray-900 dark:text-white"
                                 animate={isMobileMenuOpen ? "open" : "closed"}
                             >
                                 <motion.span
                                     className="absolute h-0.5 w-6 bg-current transform -translate-x-1/2 -translate-y-1/2"
                                     style={{ left: '50%', top: '35%' }}
                                     variants={{ open: { rotate: 45, y: 4.5 }, closed: { rotate: 0, y: 0 } }}
                                 />
                                 <motion.span
                                     className="absolute h-0.5 w-6 bg-current transform -translate-x-1/2 -translate-y-1/2"
                                     style={{ left: '50%', top: '50%' }}
                                     variants={{ open: { opacity: 0 }, closed: { opacity: 1 } }}
                                 />
                                 <motion.span
                                     className="absolute h-0.5 w-6 bg-current transform -translate-x-1/2 -translate-y-1/2"
                                     style={{ left: '50%', top: '65%' }}
                                     variants={{ open: { rotate: -45, y: -4.5 }, closed: { rotate: 0, y: 0 } }}
                                 />
                             </motion.button>
                         </div>
                    </div>
                </div>
                 {/* Mobile Menu */}
                 <AnimatePresence>
                     {isMobileMenuOpen && (
                         <motion.nav
                             className="md:hidden pb-4"
                             initial="closed"
                             animate="open"
                             exit="closed"
                             variants={{ open: { transition: { staggerChildren: 0.1 } } }}
                         >
                             <ul className="flex flex-col items-center space-y-4">
                                 {navLinks.map((link) => (
                                     <motion.li key={link.id} variants={navItemVariants}>
                                         <button
                                             onClick={() => handleNavClick(link.id)}
                                             className="text-lg text-gray-800 dark:text-gray-200 font-semibold"
                                         >
                                             {link.label}
                                         </button>
                                     </motion.li>
                                 ))}
                             </ul>
                         </motion.nav>
                     )}
                 </AnimatePresence>
            </div>
        </header>
    );
};

export default Header;