import { useState, useCallback } from 'react';
import { ImageState } from '../types';

export const useImageHistory = (initialState: ImageState | null) => {
    const [history, setHistory] = useState<ImageState[]>(initialState ? [initialState] : []);
    const [currentIndex, setCurrentIndex] = useState(initialState ? 0 : -1);

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;
    const current = history[currentIndex];
    const original = history[0]; // The first image is always the original

    const push = useCallback((state: ImageState) => {
        const newHistory = history.slice(0, currentIndex + 1);
        newHistory.push(state);
        setHistory(newHistory);
        setCurrentIndex(newHistory.length - 1);
    }, [history, currentIndex]);

    const undo = useCallback(() => {
        if (canUndo) {
            setCurrentIndex(prevIndex => prevIndex - 1);
        }
    }, [canUndo]);

    const redo = useCallback(() => {
        if (canRedo) {
            setCurrentIndex(prevIndex => prevIndex + 1);
        }
    }, [canRedo]);
    
    const reset = useCallback((state: ImageState) => {
      setHistory([state]);
      setCurrentIndex(0);
    }, []);

    return { current, original, push, undo, redo, canUndo, canRedo, reset };
};