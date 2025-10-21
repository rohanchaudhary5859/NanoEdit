
import React from 'react';
import { GithubIcon, TwitterIcon, DribbbleIcon } from './icons';

const Footer: React.FC = () => {
    return (
        <footer className="bg-white/10 dark:bg-black/20 backdrop-blur-sm border-t border-gray-200/20 dark:border-white/10">
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400">
                <div className="flex justify-center space-x-6 mb-4">
                    <a href="#" className="text-gray-400 hover:text-primary transition-colors duration-300"><TwitterIcon className="w-6 h-6" /></a>
                    <a href="#" className="text-gray-400 hover:text-primary transition-colors duration-300"><GithubIcon className="w-6 h-6" /></a>
                    <a href="#" className="text-gray-400 hover:text-primary transition-colors duration-300"><DribbbleIcon className="w-6 h-6" /></a>
                </div>
                <p>&copy; {new Date().getFullYear()} NanoEdit | Developed by 
                    <a href="https://www.zyntrixmedia.xyz/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                        Zyntrix Media
                    </a>
                </p>
            </div>
        </footer>
    );
};

export default Footer;
