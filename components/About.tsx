import React from 'react';
import { motion, Variants } from 'framer-motion';
import { BrainCircuitIcon, ImageIcon, TextIcon } from './icons';

const About: React.FC = () => {
    const features = [
        {
            icon: <ImageIcon className="w-8 h-8 text-primary" />,
            title: 'Upload Any Image',
            description: 'Start with any photo from your device. High-resolution images work best for detailed edits.'
        },
        {
            icon: <TextIcon className="w-8 h-8 text-primary" />,
            title: 'Use Natural Language',
            description: 'Simply type or speak what you want to change. For example, "make the background blurry" or "add a vintage filter".'
        },
        {
            icon: <BrainCircuitIcon className="w-8 h-8 text-primary" />,
            title: 'Powered by Gemini',
            description: 'Our advanced AI model understands your commands and intelligently applies the edits to your image in seconds.'
        }
    ];

    const cardVariants: Variants = {
        offscreen: {
            y: 50,
            opacity: 0
        },
        onscreen: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                bounce: 0.4,
                duration: 0.8
            }
        }
    };

    return (
        <section id="about" className="py-20 md:py-32 bg-white/5 dark:bg-black/20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-3xl mx-auto"
                >
                    <h2 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        NanoEdit harnesses the power of Google's Gemini model to bring your creative visions to life. It's as simple as talking to your image.
                    </p>
                </motion.div>

                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            className="p-8 rounded-2xl bg-white/20 dark:bg-gray-500/10 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg"
                            initial="offscreen"
                            whileInView="onscreen"
                            viewport={{ once: true, amount: 0.5 }}
                            variants={cardVariants}
                            transition={{ delay: index * 0.2 }}
                        >
                            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-6">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default About;
