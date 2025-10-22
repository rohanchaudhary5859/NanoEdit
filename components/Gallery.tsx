
import React from 'react';
// FIX: Import Variants to fix TypeScript error with transition types.
import { motion, Variants } from 'framer-motion';

// Example images - in a real app, these might come from a CMS or API
const galleryItems = [
    {
        id: 1,
        after: 'https://storage.googleapis.com/aistudio-hosting/templates/nanoedit/gallery-1.webp',
        prompt: 'A photorealistic image of a cat wearing a party hat.',
    },
    {
        id: 2,
        after: 'https://storage.googleapis.com/aistudio-hosting/templates/nanoedit/gallery-2.webp',
        prompt: 'Change the background to a futuristic cityscape at night.',
    },
    {
        id: 3,
        after: 'https://storage.googleapis.com/aistudio-hosting/templates/nanoedit/gallery-3.webp',
        prompt: 'Make the sky look like a van Gogh painting.',
    },
    {
        id: 4,
        after: 'https://storage.googleapis.com/aistudio-hosting/templates/nanoedit/gallery-4.webp',
        prompt: 'Add a neon, cyberpunk aesthetic to this portrait.',
    },
];

const Gallery: React.FC = () => {
    // FIX: Add Variants type to help TypeScript infer the correct types for framer-motion transitions.
    const cardVariants: Variants = {
        offscreen: {
            y: 50,
            opacity: 0,
        },
        onscreen: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                bounce: 0.4,
                duration: 0.8,
            },
        },
    };

    return (
        <section id="gallery" className="py-20 md:py-32">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8 }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <h2 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                        Inspiration Gallery
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        See what's possible with NanoEdit. From subtle enhancements to fantastical transformations, the only limit is your imagination.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {galleryItems.map((item, index) => (
                        <motion.div
                            key={item.id}
                            className="group relative overflow-hidden rounded-2xl shadow-lg border border-white/20 dark:border-white/10"
                            variants={cardVariants}
                            initial="offscreen"
                            whileInView="onscreen"
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <img src={item.after} alt={`After: ${item.prompt}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-6">
                                <p className="text-white font-semibold text-lg drop-shadow-md">
                                    <span className="font-normal text-gray-300">Prompt: </span>"{item.prompt}"
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Gallery;