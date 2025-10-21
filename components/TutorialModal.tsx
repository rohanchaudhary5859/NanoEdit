import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const backdrop = {
        visible: { opacity: 1 },
        hidden: { opacity: 0 },
    };

    const modal: Variants = {
        hidden: { y: "-50vh", opacity: 0 },
        visible: {
            y: "0",
            opacity: 1,
            transition: { delay: 0.2, type: "spring", stiffness: 120 }
        },
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[100]"
                    onClick={onClose}
                    variants={backdrop}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                >
                    <motion.div
                        className="bg-light-bg dark:bg-dark-bg-secondary rounded-lg shadow-xl p-8 max-w-lg w-full m-4 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-white/10"
                        onClick={(e) => e.stopPropagation()}
                        variants={modal}
                    >
                        <h2 className="text-2xl font-bold mb-4 font-display text-primary">How to Use NanoEdit</h2>
                        <div className="space-y-4">
                            <p><strong className="font-semibold">1. Upload an Image:</strong> Click the "Upload Image" button or drag and drop a file into the editor.</p>
                            <p><strong className="font-semibold">2. Write a Command:</strong> In the text box, describe the change you want to make. Be descriptive!</p>
                            <p className="pl-4 text-sm text-gray-600 dark:text-gray-400">
                                - "Add a golden retriever puppy next to the person."<br />
                                - "Change the background to a futuristic cityscape at night."<br />
                                - "Make the sky look like a van Gogh painting."
                            </p>
                            <p><strong className="font-semibold">3. Generate:</strong> Hit the "Apply Edit" button and watch the AI work its magic.</p>
                            <p><strong className="font-semibold">4. Iterate:</strong> Not quite right? You can undo, or apply another prompt to the new image to refine it further.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="mt-6 w-full px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-secondary transition-colors"
                        >
                            Got It!
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TutorialModal;
