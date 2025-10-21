import React, { useState, useEffect, createContext, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Editor from './components/Editor';
import About from './components/About';
import Footer from './components/Footer';
import CustomCursor from './components/CustomCursor';
import { Theme } from './types';

export const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void; } | null>(null);

const App: React.FC = () => {
    const [theme, setTheme] = useState<Theme>('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        setTheme(initialTheme);
    }, []);
    
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    }, []);
    
    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <div className="min-h-screen bg-light-bg dark:bg-dark-bg font-sans transition-colors duration-500">
                <CustomCursor />
                <div className="relative z-10">
                    <Header onNavigate={scrollTo} />
                    <main>
                        <Hero onNavigate={scrollTo} />
                        <Editor />
                        <About />
                    </main>
                    <Footer />
                </div>
            </div>
        </ThemeContext.Provider>
    );
};

export default App;