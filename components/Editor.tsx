import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useImageHistory } from '../hooks/useImageHistory';
import { editImageWithNanoBanana, getPromptSuggestions } from '../services/geminiService';
import { optimizeImage } from '../utils/imageOptimizer';
import { ImageState } from '../types';
import Loader from './Loader';
import TutorialModal from './TutorialModal';
import { CloseIcon, DownloadIcon, ImageIcon, MicrophoneIcon, RedoIcon, ResetIcon, ShareIcon, SliderIcon, UndoIcon, UploadIcon, SettingsIcon } from './icons';

// FIX: Add type definitions for the Web Speech API to resolve TypeScript errors.
// These are not included by default as the API is experimental.
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: any) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

const SESSION_IMAGE_KEY = 'nanoedit-session-image';
const SESSION_PROMPT_KEY = 'nanoedit-session-prompt';


const Editor: React.FC = () => {
    const { current, original, push, undo, redo, canUndo, canRedo, reset } = useImageHistory(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isControlsOpen, setIsControlsOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);


    // For Before/After slider
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const [isDraggingSlider, setIsDraggingSlider] = useState(false);
    const x = useMotionValue(50);
    const springConfig = { stiffness: 400, damping: 40 };
    const springX = useSpring(x, springConfig);
    const clipPosition = useTransform(springX, value => `inset(0 ${100 - value}% 0 0)`);
    const sliderPositionPercent = useTransform(springX, value => `${value}%`);


    useEffect(() => {
        if (!localStorage.getItem('nanoedit-tutorial-seen')) {
            setIsTutorialOpen(true);
            localStorage.setItem('nanoedit-tutorial-seen', 'true');
        }
    }, []);

    // Load session from localStorage on initial mount
    useEffect(() => {
        try {
            const savedImageJSON = localStorage.getItem(SESSION_IMAGE_KEY);
            if (savedImageJSON) {
                const savedImage: ImageState = JSON.parse(savedImageJSON);
                if (savedImage && typeof savedImage.dataUrl === 'string' && typeof savedImage.mimeType === 'string') {
                    reset(savedImage);
                }
            }

            const savedPrompt = localStorage.getItem(SESSION_PROMPT_KEY);
            if (savedPrompt) {
                setPrompt(savedPrompt);
            }
        } catch (err) {
            console.error("Failed to load session from localStorage:", err);
            localStorage.removeItem(SESSION_IMAGE_KEY);
            localStorage.removeItem(SESSION_PROMPT_KEY);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Save session to localStorage whenever the image or prompt changes
    useEffect(() => {
        if (current) {
            localStorage.setItem(SESSION_IMAGE_KEY, JSON.stringify(current));
            localStorage.setItem(SESSION_PROMPT_KEY, prompt);
        }
    }, [current, prompt]);

    const handlePromptSubmit = async (promptText: string) => {
        if (!current || !promptText || isLoading) return;

        setIsLoading(true);
        setLoadingMessage('Applying AI edit...');
        setError(null);
        x.set(50);
        setIsControlsOpen(false); // Close sidebar on submit

        try {
            const base64Image = current.dataUrl.split(',')[1];
            const newImageDataUrl = await editImageWithNanoBanana(base64Image, current.mimeType, promptText);
            
            const newMimeType = newImageDataUrl.match(/data:(.*);base64,/)?.[1] || 'image/png';

            push({ dataUrl: newImageDataUrl, mimeType: newMimeType });
            setPrompt('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    // Setup Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition: SpeechRecognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                let errorMessage = 'An error occurred during speech recognition.';
                if (event.error === 'not-allowed') {
                    errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
                } else if (event.error === 'no-speech') {
                    errorMessage = 'No speech was detected. Please try again.';
                }
                setError(errorMessage);
                setIsListening(false);
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = Array.from(event.results)
                    .map((result) => result[0])
                    .map((result) => result.transcript)
                    .join('');

                setPrompt(transcript);

                if (event.results[event.results.length - 1].isFinal) {
                    handlePromptSubmit(transcript.trim());
                }
            };
            
            recognitionRef.current = recognition;
        } else {
            console.warn("SpeechRecognition API not supported in this browser.");
        }
    }, [handlePromptSubmit]); // eslint-disable-line react-hooks/exhaustive-deps


    const handleFileChange = useCallback(async (file: File) => {
        if (file && file.type.startsWith('image/')) {
            setIsLoading(true);
            setLoadingMessage('Optimizing image...');
            setError(null);
            setSuggestions([]); // Clear old suggestions
            setPrompt(''); // Clear prompt for new image session

            // Clear storage explicitly for a clean slate with the new image
            localStorage.removeItem(SESSION_IMAGE_KEY);
            localStorage.removeItem(SESSION_PROMPT_KEY);

            try {
                const optimizedFile = await optimizeImage(file);
                
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    reset({ dataUrl, mimeType: optimizedFile.type });
                    setIsLoading(false);
                    setLoadingMessage('');
                };
                reader.readAsDataURL(optimizedFile);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to process image.');
                setIsLoading(false);
                setLoadingMessage('');
            }
        } else {
            setError('Please upload a valid image file (PNG, JPG, etc.).');
        }
    }, [reset]);

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileChange(file);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileChange(file);
        }
    }, [handleFileChange]);

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        handlePromptSubmit(prompt);
    };



    const handleToggleListening = () => {
        if (!recognitionRef.current) {
            setError("Voice recognition is not supported by your browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setPrompt('');
            setError(null);
            recognitionRef.current.start();
        }
    };
    
    const handleDownload = () => {
        if (!current) return;
        const link = document.createElement('a');
        link.href = current.dataUrl;
        link.download = `edited-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    const handleShare = async () => {
        if (!current) return;
        setError(null);
        try {
            const response = await fetch(current.dataUrl);
            const blob = await response.blob();
            const file = new File([blob], `nanoedit-${Date.now()}.png`, { type: current.mimeType });
            const shareData = {
                files: [file],
                title: 'Image edited with NanoEdit',
                text: 'Check out this image I edited with AI!',
            };

            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else if (navigator.clipboard && navigator.clipboard.write) {
                const clipboardItem = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([clipboardItem]);
                setShareStatus('copied');
                setTimeout(() => setShareStatus('idle'), 2000);
            } else {
                 throw new Error('Sharing and clipboard access are not supported in this browser.');
            }
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Could not share the image.');
        }
    };

    const handleGetSuggestions = async () => {
        if (!current) return;
        setIsGeneratingSuggestions(true);
        setSuggestionError(null);
        setSuggestions([]);
        try {
            const base64Image = current.dataUrl.split(',')[1];
            const newSuggestions = await getPromptSuggestions(base64Image, current.mimeType);
            setSuggestions(newSuggestions);
        } catch (err) {
            setSuggestionError(err instanceof Error ? err.message : 'Could not get suggestions.');
        } finally {
            setIsGeneratingSuggestions(false);
        }
    }

    const ControlsPanel = () => (
        <>
            {!current && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragEvents}
                    onDragEnter={handleDragEvents}
                    onDragLeave={handleDragEvents}
                    className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors min-h-[160px] ${isDragging ? 'border-primary bg-primary/10' : 'border-gray-400 dark:border-gray-600'}`}
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center">
                            <Loader />
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{loadingMessage}</p>
                        </div>
                    ) : (
                        <>
                            <p className="mb-2 text-gray-600 dark:text-gray-300">Drag & drop an image here</p>
                            <p className="mb-4 text-gray-500 dark:text-gray-400">or</p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-secondary transition-colors"
                            >
                                Upload Image
                            </button>
                            <input type="file" ref={fileInputRef} onChange={onFileSelect} accept="image/*" className="hidden" />
                        </>
                    )}
                </div>
            )}

            {current && (
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Describe your edit (or use your voice):
                        </label>
                        <div className="relative">
                            <textarea
                                id="prompt"
                                rows={4}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={isListening ? 'Listening...' : 'e.g., "Add a cat wearing a party hat"'}
                                className="w-full p-2 pr-12 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-primary focus:border-primary transition-colors text-gray-800 dark:text-gray-200"
                                required
                            />
                            <button
                                type="button"
                                onClick={handleToggleListening}
                                disabled={isLoading}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 ${isListening ? 'bg-red-500/80 text-white animate-pulse' : 'bg-gray-500/20 text-gray-800 dark:text-white hover:bg-gray-500/30'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={isListening ? 'Stop Listening' : 'Use Voice Command'}
                                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                            >
                                <MicrophoneIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !prompt}
                        className="w-full flex justify-center items-center px-4 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-lg shadow-md hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? <Loader /> : 'Apply Edit'}
                    </button>
                </form>
            )}
            
            {error && <p className="text-red-500 mt-4 text-sm bg-red-500/10 p-2 rounded-md">{error}</p>}
            
            {current && (
                <>
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <h4 className="text-lg font-bold mb-3 text-gray-800 dark:text-white">AI Suggestions</h4>
                        <div className="min-h-[80px]">
                            {isGeneratingSuggestions && <div className="flex justify-center"><Loader/></div>}
                            {suggestionError && <p className="text-red-500 text-sm">{suggestionError}</p>}
                            {suggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map((s, i) => (
                                        <motion.button 
                                            key={i}
                                            type="button"
                                            onClick={() => setPrompt(s)}
                                            className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                        >
                                            {s}
                                        </motion.button>
                                    ))}
                                </div>
                            )}
                            {!isGeneratingSuggestions && suggestions.length === 0 && !suggestionError && (
                                <button type="button" onClick={handleGetSuggestions} className="text-primary hover:underline">
                                    ✨ Get suggestions based on your image
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                            <div className="flex justify-between items-center mb-4">
                            <div className="flex space-x-2">
                                <button type="button" onClick={undo} disabled={!canUndo} className="p-2 bg-gray-500/20 rounded-md disabled:opacity-50 transition" title="Undo"><UndoIcon className="w-5 h-5" /></button>
                                <button type="button" onClick={redo} disabled={!canRedo} className="p-2 bg-gray-500/20 rounded-md disabled:opacity-50 transition" title="Redo"><RedoIcon className="w-5 h-5" /></button>
                            </div>
                            <button type="button" onClick={() => { original && reset(original) }} disabled={!canUndo} className="flex items-center space-x-1 text-sm text-gray-500 hover:text-primary disabled:opacity-50 transition" title="Reset Changes">
                                <ResetIcon className="w-4 h-4" />
                                <span>Reset</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500/30 text-white font-bold rounded-lg hover:bg-gray-500/50 transition-colors"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                <span>Download</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleShare}
                                disabled={shareStatus === 'copied'}
                                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500/30 text-white font-bold rounded-lg hover:bg-gray-500/50 transition-colors disabled:bg-primary/50"
                            >
                                <ShareIcon className="w-5 h-5" />
                                <span>{shareStatus === 'copied' ? 'Copied!' : 'Share'}</span>
                            </button>
                        </div>
                            <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 w-full flex items-center justify-center space-x-2 px-4 py-2 text-primary border border-primary/50 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                            <UploadIcon className="w-5 h-5" />
                            <span>Upload New</span>
                        </button>
                    </div>
                </>
            )}
        </>
    );

    return (
        <section id="editor" className="py-20 md:py-32 min-h-screen">
            <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="text-center mb-12">
                        <h2 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-4">The AI Creative Studio</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300">Bring your vision to life. Upload a photo, describe your edit, and let our Gemini-powered AI handle the rest.</p>
                        <button onClick={() => setIsTutorialOpen(true)} className="text-primary hover:underline mt-2">How does this work?</button>
                    </div>

                    <div className="relative lg:grid lg:grid-cols-2 lg:gap-8 items-start">
                        {/* Desktop Controls */}
                        <div className="hidden lg:block bg-white/10 dark:bg-black/20 backdrop-blur-sm p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
                            <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Controls</h3>
                            <ControlsPanel />
                        </div>
                        
                        {/* Mobile Controls (Sidebar) */}
                        <AnimatePresence>
                            {isControlsOpen && (
                                <>
                                    <motion.div
                                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setIsControlsOpen(false)}
                                    />
                                    <motion.div
                                        className="fixed top-0 left-0 bottom-0 w-full max-w-md bg-light-bg dark:bg-dark-bg-secondary z-40 lg:hidden shadow-2xl p-6 overflow-y-auto"
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '0%' }}
                                        exit={{ x: '-100%' }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    >
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Controls</h3>
                                            <button
                                                onClick={() => setIsControlsOpen(false)}
                                                className="p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-500/20"
                                                aria-label="Close controls"
                                            >
                                                <CloseIcon className="w-6 h-6" />
                                            </button>
                                        </div>
                                        <ControlsPanel />
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>

                        {/* Right side: Image Display */}
                         <div className="aspect-square bg-white/5 dark:bg-black/10 rounded-2xl flex items-center justify-center p-4 border border-white/20 dark:border-white/10 shadow-lg relative overflow-hidden">
                            <AnimatePresence>
                                {isLoading && (
                                    <motion.div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                                        <Loader />
                                        <p className="mt-4 text-white font-display">{loadingMessage}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {!current ? (
                                <motion.div
                                    className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-primary/20 dark:border-primary/20 rounded-2xl bg-primary/5 animate-pulse-glow p-4"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <ImageIcon className="w-16 h-16 mb-4 text-primary/50" />
                                    <h3 className="font-display text-xl font-semibold text-gray-700 dark:text-gray-300">Image Canvas</h3>
                                    <p className="text-sm max-w-xs mt-1">
                                        Upload an image using the controls to begin your creative journey.
                                    </p>
                                    {/* Mobile-only upload button for better affordance */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="mt-4 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-secondary transition-colors lg:hidden"
                                    >
                                        Upload Image
                                    </button>
                                </motion.div>
                            ) : canUndo && original ? (
                                <motion.div
                                    ref={imageContainerRef}
                                    className="relative w-full h-full cursor-ew-resize select-none touch-none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onPan={(event, info) => {
                                        if (!imageContainerRef.current) return;
                                        const rect = imageContainerRef.current.getBoundingClientRect();
                                        const position = info.point.x - rect.left;
                                        let percentage = (position / rect.width) * 100;
                                        percentage = Math.max(0, Math.min(100, percentage));
                                        x.set(percentage);
                                    }}
                                    onPanStart={() => setIsDraggingSlider(true)}
                                    onPanEnd={() => setIsDraggingSlider(false)}
                                >
                                    <motion.div className="absolute inset-0">
                                        <img src={original.dataUrl} alt="Original" draggable="false" className="w-full h-full object-contain" />
                                        <div className="absolute top-2 left-2 text-xs font-bold bg-black/50 text-white px-2 py-1 rounded">Original</div>
                                    </motion.div>
                                    <motion.div
                                        className="absolute inset-0"
                                        style={{ clipPath: clipPosition }}
                                    >
                                        <img src={current.dataUrl} alt="Edited" draggable="false" className="w-full h-full object-contain" />
                                        <div className="absolute top-2 right-2 text-xs font-bold bg-black/50 text-white px-2 py-1 rounded">Edited</div>
                                    </motion.div>
                                    <motion.div
                                        className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize pointer-events-none"
                                        style={{ left: sliderPositionPercent, x: "-50%" }}
                                    >
                                        <motion.div
                                            className="absolute top-1/2 -translate-y-1/2 -left-4 w-9 h-9 rounded-full bg-primary border-2 border-white/50 shadow-lg flex items-center justify-center text-white"
                                            animate={{ scale: isDraggingSlider ? 1.2 : 1 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                        >
                                            <SliderIcon className="w-6 h-6" />
                                        </motion.div>
                                    </motion.div>
                                </motion.div>
                            ) : (
                                <motion.img
                                    key={current.dataUrl}
                                    src={current.dataUrl}
                                    alt="Current"
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Mobile Floating Action Button */}
                    {current && (
                        <div className="lg:hidden fixed bottom-5 right-5 z-20">
                            <motion.button
                                onClick={() => setIsControlsOpen(true)}
                                className="p-4 bg-gradient-to-r from-primary to-secondary text-white rounded-full shadow-lg flex items-center justify-center"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                aria-label="Open Controls"
                            >
                                <SettingsIcon className="w-6 h-6" />
                            </motion.button>
                        </div>
                    )}
                </motion.div>
            </div>
        </section>
    );
};

export default Editor;