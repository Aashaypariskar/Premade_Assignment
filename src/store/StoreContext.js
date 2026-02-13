import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [draft, setDraft] = useState({
        train: null,
        coach: null,
        category: null,
        activity: null,
        answers: {}
    });
    // Load saved draft on app startup
    useEffect(() => {
        loadDraft();
    }, []);

    // Auto-save draft whenever it changes
    useEffect(() => {
        if (draft.train || Object.keys(draft.answers).length > 0) {
            saveDraft();
        }
    }, [draft]);

    const saveDraft = async () => {
        try {
            await AsyncStorage.setItem('@inspection_draft', JSON.stringify(draft));
        } catch (e) {
            console.error('Draft save failed:', e);
        }
    };

    const loadDraft = async () => {
        try {
            const saved = await AsyncStorage.getItem('@inspection_draft');
            if (saved) setDraft(JSON.parse(saved));
        } catch (e) {
            console.error('Draft load failed:', e);
        } finally {
            setIsLoaded(true);
        }
    };

    const clearDraft = async () => {
        setDraft({ train: null, coach: null, category: null, activity: null, answers: {} });
        await AsyncStorage.removeItem('@inspection_draft');
    };

    return (
        <StoreContext.Provider value={{ draft, setDraft, clearDraft, loadDraft, isLoaded }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => useContext(StoreContext);
