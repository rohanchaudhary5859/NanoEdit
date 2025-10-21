import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useImageHistory } from '../hooks/useImageHistory';
import { editImageWithNanoBanana, getPromptSuggestions } from '../services/geminiService';
import { optimizeImage, compressImageForDownload, applyVisualAdjustments } from '../utils/imageOptimizer';
import { ImageState, OutputQuality } from '../types';
import Loader from './Loader';
import TutorialModal from './TutorialModal';
import { DownloadIcon, ImageIcon, RedoIcon, ResetIcon, ShareIcon, SliderIcon, UndoIcon, UploadIcon, MicrophoneIcon, ZoomInIcon, ZoomOutIcon, ExpandIcon, TrashIcon } from './icons';

// FIX: Add types for Web Speech API to fix TypeScript errors.
// These types are not included in default DOM typings for all environments.
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    grammars: any; 
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    abort(): void;
    start(): void;
    stop(): void;
}

interface SpeechRecognitionStatic {
    new (): SpeechRecognition;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

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
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;

const Editor: React.FC = () => {
    const { current, original, push, undo, redo, canUndo, canRedo, reset, clear } = useImageHistory(null);
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
    const [isRecording, setIsRecording] = useState(false);
    const [speechRecognitionError, setSpeechRecognitionError] = useState<string | null>(null);
    const [outputQuality, setOutputQuality] = useState<OutputQuality>('high');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // For Before/After slider
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const [sliderPosition, setSliderPosition] = useState(50);
    const isSliding = useRef(false);
    
    // For Zoom & Pan
    const canvasRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    // For visual adjustments
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);

    // Load saved state from localStorage on initial mount
    useEffect(() => {
        try {
            const savedImageJSON = localStorage.getItem('nanoedit-saved-image');
            if (savedImageJSON) {
                const savedImage: ImageState = JSON.parse(savedImageJSON);
                reset(savedImage);
            }

            const savedPrompt = localStorage.getItem('nanoedit-saved-prompt');
            if (savedPrompt) {
                setPrompt(savedPrompt);
            }
        } catch (err) {
            console.error("Failed to load saved state from localStorage", err);
            // Clear potentially corrupted storage
            localStorage.removeItem('nanoedit-saved-image');
            localStorage.removeItem('nanoedit-saved-prompt');
        }
    }, [reset]);

    // Auto-save the current image whenever it changes
    useEffect(() => {
        if (current) {
            localStorage.setItem('nanoedit-saved-image', JSON.stringify(current));
        }
    }, [current]);

    useEffect(() => {
        if (!localStorage.getItem('nanoedit-tutorial-seen')) {
            setIsTutorialOpen(true);
            localStorage.setItem('nanoedit-tutorial-seen', 'true');
        }
    }, []);
    
    useEffect(() => {
        // Cleanup speech recognition on component unmount
        return () => {
            recognitionRef.current?.stop();
        };
    }, []);

    const resetView = useCallback(() => {
        setTransform({ scale: 1, x: 0, y: 0 });
    }, []);
    
    const resetAdjustments = useCallback(() => {
        setBrightness(100);
        setContrast(100);
    }, []);

    const handleFileChange = useCallback(async (file: File) => {
        if (file && file.type.startsWith('image/')) {
            setIsLoading(true);
            setLoadingMessage('Optimizing image...');
            setError(null);
            setSuggestions([]); // Clear old suggestions
            resetView();
            resetAdjustments();

            try {
                const optimizedFile = await optimizeImage(file);
                
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    reset({ dataUrl, mimeType: optimizedFile.type });
                    // Clear prompt when new image is uploaded
                    setPrompt('');
                    localStorage.removeItem('nanoedit-saved-prompt');
                    setIsLoading(false);
                    setLoadingMessage('');
                };
                reader.readAsDataURL(optimizedFile);

            } catch (err) {
                let message = 'An unknown error occurred while processing the image.';
                if (err instanceof DOMException) {
                    message = `Failed to read the file: ${err.message}. It might be corrupt or unreadable.`;
                } else if (err instanceof Error) {
                    message = `An error occurred while processing the image: ${err.message}`;
                }
                setError(message);
                setIsLoading(false);
                setLoadingMessage('');
            }
        } else {
            setError('Please upload a valid image file (PNG, JPG, etc.).');
        }
    }, [reset, resetView, resetAdjustments]);

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
        if (!current || !prompt || isLoading) return;

        setIsLoading(true);
        setLoadingMessage('Applying AI edit...');
        setError(null);

        try {
            const base64Image = current.dataUrl.split(',')[1];
            const newImageDataUrl = await editImageWithNanoBanana(base64Image, current.mimeType, prompt);
            
            const newMimeType = newImageDataUrl.match(/data:(.*);base64,/)?.[1] || 'image/png';

            push({ dataUrl: newImageDataUrl, mimeType: newMimeType });
            setPrompt('');
            localStorage.removeItem('nanoedit-saved-prompt');
            setSliderPosition(50);
            resetAdjustments(); // Reset adjustments after AI edit
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newPrompt = e.target.value;
        setPrompt(newPrompt);
        localStorage.setItem('nanoedit-saved-prompt', newPrompt);
    };

    const handleReset = () => {
        if (original) {
            reset(original);
            resetView();
            resetAdjustments();
            setPrompt('');
            localStorage.removeItem('nanoedit-saved-prompt');
        }
    };
    
    const handleClearSession = () => {
        // Clear localStorage
        localStorage.removeItem('nanoedit-saved-image');
        localStorage.removeItem('nanoedit-saved-prompt');
        
        // Clear application state
        clear();
        setPrompt('');
        setError(null);
        setSuggestions([]);
        setSuggestionError(null);
        setSpeechRecognitionError(null);
        resetView();
        resetAdjustments();
    };

    const handleDownload = async () => {
        if (!current || isLoading) return;
        setIsLoading(true);
        setLoadingMessage('Preparing download...');
        setError(null);
        try {
            const adjustedDataUrl = await applyVisualAdjustments(current.dataUrl, brightness, contrast);
            const compressedDataUrl = await compressImageForDownload(adjustedDataUrl, current.mimeType, outputQuality);
            const link = document.createElement('a');
            link.href = compressedDataUrl;
            const extension = compressedDataUrl.match(/data:image\/(.+);base64,/)?.[1] || 'png';
            link.download = `edited-image-${outputQuality}-${Date.now()}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not prepare the image for download.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleShare = async () => {
        if (!current) return;
        setError(null);
        try {
            const adjustedDataUrl = await applyVisualAdjustments(current.dataUrl, brightness, contrast);
            const response = await fetch(adjustedDataUrl);
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

    const handleToggleRecording = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const isSpeechRecognitionSupported = !!SpeechRecognition;

        if (!isSpeechRecognitionSupported) {
            setSpeechRecognitionError("Voice input is not supported in this browser.");
            return;
        }

        if (isRecording) {
            recognitionRef.current?.stop();
            return;
        }

        const recognition: SpeechRecognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => {
            setIsRecording(true);
            setSpeechRecognitionError(null);
        };

        // FIX: Explicitly type event as SpeechRecognitionEvent
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            const newPrompt = (prompt.trim() ? prompt.trim() + ' ' : '') + transcript.trim();
            setPrompt(newPrompt);
            localStorage.setItem('nanoedit-saved-prompt', newPrompt);
        };
        
        // FIX: Explicitly type event as SpeechRecognitionErrorEvent
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            let errorMsg = `An error occurred: ${event.error}`;
            if (event.error === 'no-speech') {
                errorMsg = 'No speech was detected. Please try again.';
            } else if (event.error === 'audio-capture') {
                errorMsg = 'Microphone not available. Please check your permissions.';
            } else if (event.error === 'not-allowed') {
                errorMsg = 'Permission to use microphone was denied. Please allow microphone access in your browser settings.';
            }
            setSpeechRecognitionError(errorMsg);
        };

        recognition.onend = () => {
            setIsRecording(false);
            recognitionRef.current = null;
        };

        recognition.start();

    }, [isRecording, prompt]);

    // Slider handlers
    const handleSlideMove = useCallback((e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
        if (!isSliding.current || !imageContainerRef.current) return;
        const rect = imageContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let percentage = (x / rect.width) * 100;
        percentage = Math.max(0, Math.min(100, percentage));
        setSliderPosition(percentage);
    }, []);

    const handleSlideStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        isSliding.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        e.stopPropagation(); // Prevent panning while sliding
        handleSlideMove(e);
    }, [handleSlideMove]);

    const handleSlideEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        isSliding.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }, []);

    // Zoom and Pan handlers
    const handleWheel = (e: React.WheelEvent) => {
        if (!canvasRef.current) return;
        e.preventDefault();

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = 1.1;
        const newScale = e.deltaY < 0 ? transform.scale * zoomFactor : transform.scale / zoomFactor;
        const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

        const scaleChange = clampedScale / transform.scale;

        const newX = mouseX - (mouseX - transform.x) * scaleChange;
        const newY = mouseY - (mouseY - transform.y) * scaleChange;

        setTransform({ scale: clampedScale, x: newX, y: newY });
    };

    const handlePanStart = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return; // Only main button
        if (transform.scale <= 1) return; // No panning if not zoomed
        setIsPanning(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePanMove = (e: React.PointerEvent) => {
        if (!isPanning) return;
        setTransform(prev => ({
            ...prev,
            x: prev.x + e.movementX,
            y: prev.y + e.movementY,
        }));
    };

    const handlePanEnd = (e: React.PointerEvent) => {
        setIsPanning(false);
         (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const manualZoom = (direction: 'in' | 'out') => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const zoomFactor = 1.5; // Larger zoom for button clicks
        const newScale = direction === 'in' ? transform.scale * zoomFactor : transform.scale / zoomFactor;
        const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
        
        const scaleChange = clampedScale / transform.scale;

        const newX = centerX - (centerX - transform.x) * scaleChange;
        const newY = centerY - (centerY - transform.y) * scaleChange;
        
        setTransform({ scale: clampedScale, x: newX, y: newY });
    };

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
                        <h2 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-4">Image Editor</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300">Upload an image and tell our AI what to change.</p>
                        <button onClick={() => setIsTutorialOpen(true)} className="text-primary hover:underline mt-2">How does this work?</button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Left side: Controls and Prompt */}
                        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-sm p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
                            <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Controls</h3>
                            
                            {!current && (
                                <div
                                    className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors min-h-[160px] border-gray-400 dark:border-gray-600`}
                                >
                                    {isLoading ? (
                                        <div className="flex flex-col items-center justify-center">
                                            <Loader />
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{loadingMessage}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="mb-2 text-gray-600 dark:text-gray-300 text-center">Drag & drop image onto the canvas</p>
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
                                    <div className="mb-4 relative">
                                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Describe your edit:
                                        </label>
                                        <textarea
                                            id="prompt"
                                            rows={4}
                                            value={prompt}
                                            onChange={handlePromptChange}
                                            placeholder='e.g., "Add a cat wearing a party hat"'
                                            className="w-full p-2 pr-12 bg-gray-200/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-primary focus:border-primary transition-colors text-gray-800 dark:text-gray-200 resize-none"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleToggleRecording}
                                            className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-300 ${
                                                isRecording 
                                                    ? 'bg-red-500 text-white animate-pulse' 
                                                    : 'bg-gray-500/20 hover:bg-primary/30 text-gray-800 dark:text-white'
                                            }`}
                                            title={isRecording ? "Stop recording" : "Use voice input"}
                                            aria-label={isRecording ? "Stop recording" : "Start voice input"}
                                        >
                                            <MicrophoneIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {speechRecognitionError && <p className="text-yellow-600 dark:text-yellow-400 -mt-2 mb-4 text-sm bg-yellow-500/10 p-2 rounded-md">{speechRecognitionError}</p>}
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
                                            {!isGeneratingSuggestions && suggestions.length === 0 && (
                                                <button onClick={handleGetSuggestions} className="text-primary hover:underline">
                                                    ✨ Get suggestions based on your image
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-white/10">
                                         <div className="flex justify-between items-center mb-4">
                                            <div className="flex space-x-2">
                                                <button onClick={undo} disabled={!canUndo || isLoading} className="p-2 bg-gray-500/20 rounded-md disabled:opacity-50 transition" title="Undo"><UndoIcon className="w-5 h-5" /></button>
                                                <button onClick={redo} disabled={!canRedo || isLoading} className="p-2 bg-gray-500/20 rounded-md disabled:opacity-50 transition" title="Redo"><RedoIcon className="w-5 h-5" /></button>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <button onClick={handleReset} disabled={!canUndo || isLoading} className="flex items-center space-x-1 text-sm text-gray-500 hover:text-primary disabled:opacity-50 transition" title="Reset Changes">
                                                  <ResetIcon className="w-4 h-4" />
                                                  <span>Reset</span>
                                                </button>
                                                <button onClick={handleClearSession} disabled={isLoading} className="flex items-center space-x-1 text-sm text-red-500 hover:text-red-400 disabled:opacity-50 transition" title="Clear Session & Start New">
                                                  <TrashIcon className="w-4 h-4" />
                                                  <span>Clear All</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-white/10">
                                        <h4 className="text-lg font-bold mb-3 text-gray-800 dark:text-white">Adjustments</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="brightness" className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    <span>Brightness</span>
                                                    <span className="font-mono text-xs bg-gray-500/20 px-1.5 py-0.5 rounded">{brightness - 100}</span>
                                                </label>
                                                <input
                                                    id="brightness"
                                                    type="range"
                                                    min="50"
                                                    max="150"
                                                    value={brightness}
                                                    onChange={(e) => setBrightness(Number(e.target.value))}
                                                    className="w-full h-2 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="contrast" className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    <span>Contrast</span>
                                                    <span className="font-mono text-xs bg-gray-500/20 px-1.5 py-0.5 rounded">{contrast - 100}</span>
                                                </label>
                                                <input
                                                    id="contrast"
                                                    type="range"
                                                    min="50"
                                                    max="150"
                                                    value={contrast}
                                                    onChange={(e) => setContrast(Number(e.target.value))}
                                                    className="w-full h-2 bg-gray-500/30 rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>
                                            {(brightness !== 100 || contrast !== 100) && (
                                                <button type="button" onClick={resetAdjustments} className="text-sm text-primary hover:underline">Reset Adjustments</button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-white/10">
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Download Quality:
                                            </label>
                                            <div className="flex w-full rounded-md bg-gray-500/20 p-1">
                                                {(['low', 'medium', 'high'] as OutputQuality[]).map((q) => (
                                                    <button
                                                        key={q}
                                                        type="button"
                                                        onClick={() => setOutputQuality(q)}
                                                        className={`w-full py-1 text-sm font-semibold rounded transition-colors ${
                                                            outputQuality === q
                                                                ? 'bg-primary text-white shadow'
                                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-500/10'
                                                        }`}
                                                    >
                                                        {q.charAt(0).toUpperCase() + q.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <button
                                              onClick={handleDownload}
                                              disabled={isLoading}
                                              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500/30 text-white font-bold rounded-lg hover:bg-gray-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                              <DownloadIcon className="w-5 h-5" />
                                              <span>Download</span>
                                          </button>
                                          <button
                                              onClick={handleShare}
                                              disabled={shareStatus === 'copied' || isLoading}
                                              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500/30 text-white font-bold rounded-lg hover:bg-gray-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-primary/50"
                                          >
                                              <ShareIcon className="w-5 h-5" />
                                              <span>{shareStatus === 'copied' ? 'Copied!' : 'Share'}</span>
                                          </button>
                                        </div>
                                         <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isLoading}
                                            className="mt-2 w-full flex items-center justify-center space-x-2 px-4 py-2 text-primary border border-primary/50 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
                                        >
                                          <UploadIcon className="w-5 h-5" />
                                          <span>Upload New</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right side: Image Display */}
                         <div
                            ref={canvasRef}
                            className={`aspect-square bg-white/5 dark:bg-black/10 rounded-2xl flex items-center justify-center p-4 border shadow-lg relative overflow-hidden transition-all duration-300 touch-none ${isDragging ? 'border-primary border-dashed border-2' : 'border-white/20 dark:border-white/10'} ${transform.scale > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                            onDrop={handleDrop}
                            onDragOver={handleDragEvents}
                            onDragEnter={handleDragEvents}
                            onDragLeave={handleDragEvents}
                            onWheel={handleWheel}
                            onPointerDown={handlePanStart}
                            onPointerMove={handlePanMove}
                            onPointerUp={handlePanEnd}
                            onPointerLeave={handlePanEnd}
                            onPointerCancel={handlePanEnd}
                        >
                            <AnimatePresence>
                                {isDragging && (
                                    <motion.div 
                                        className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <UploadIcon className="w-16 h-16 text-primary mb-4" />
                                        <h3 className="font-display text-xl font-semibold text-white">
                                            {current ? 'Drop to Replace' : 'Drop Image to Start Editing'}
                                        </h3>
                                    </motion.div>
                                )}
                                {isLoading && (
                                    <motion.div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                                        <Loader />
                                        <p className="mt-4 text-white font-display">{loadingMessage}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            <div
                                className="w-full h-full"
                                style={{
                                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                                }}
                            >
                                <motion.div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{
                                        transform: `scale(${transform.scale}) translate(${transform.x}px, ${transform.y}px)`,
                                        transition: isPanning ? 'none' : 'transform 0.2s ease-out'
                                    }}
                                >
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
                                                Upload or drop an image to begin your creative journey.
                                            </p>
                                        </motion.div>
                                    ) : canUndo && original ? (
                                        <motion.div
                                            ref={imageContainerRef}
                                            className="relative w-full h-full select-none"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            <motion.div className="absolute inset-0">
                                                <img src={original.dataUrl} alt="Original" draggable="false" className="w-full h-full object-contain" />
                                                <div className="absolute top-2 left-2 text-xs font-bold bg-black/50 text-white px-2 py-1 rounded pointer-events-none">Original</div>
                                            </motion.div>
                                            <motion.div
                                                className="absolute inset-0"
                                                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                                            >
                                                <img src={current.dataUrl} alt="Edited" draggable="false" className="w-full h-full object-contain" />
                                                <div className="absolute top-2 right-2 text-xs font-bold bg-black/50 text-white px-2 py-1 rounded pointer-events-none">Edited</div>
                                            </motion.div>
                                            <motion.div
                                                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
                                                style={{ left: `${sliderPosition}%`, x: "-50%" }}
                                                onPointerDown={handleSlideStart}
                                                onPointerMove={handleSlideMove}
                                                onPointerUp={handleSlideEnd}
                                                onPointerLeave={handleSlideEnd}
                                            >
                                                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-9 h-9 rounded-full bg-primary border-2 border-white/50 shadow-lg flex items-center justify-center text-white">
                                                    <SliderIcon className="w-6 h-6" />
                                                </div>
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
                                </motion.div>
                            </div>
                            
                             {current && (
                                <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
                                    <button onClick={() => manualZoom('in')} disabled={transform.scale >= MAX_ZOOM} className="p-2 bg-gray-900/50 backdrop-blur-sm rounded-full text-white hover:bg-gray-900/80 disabled:opacity-50 transition"><ZoomInIcon className="w-5 h-5"/></button>
                                    <button onClick={() => manualZoom('out')} disabled={transform.scale <= MIN_ZOOM} className="p-2 bg-gray-900/50 backdrop-blur-sm rounded-full text-white hover:bg-gray-900/80 disabled:opacity-50 transition"><ZoomOutIcon className="w-5 h-5"/></button>
                                    <button onClick={resetView} disabled={transform.scale === 1 && transform.x === 0 && transform.y === 0} className="p-2 bg-gray-900/50 backdrop-blur-sm rounded-full text-white hover:bg-gray-900/80 disabled:opacity-50 transition"><ExpandIcon className="w-5 h-5"/></button>
                                </div>
                             )}

                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Editor;