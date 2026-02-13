import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
    const [draft, setDraft] = useState({
        train: null,
        coach: null,
        category: null,
        activity: null,
        answers: {}
    });

    // Auto-save draft whenever it changes
    useEffect(() => {
        saveDraft();
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
        }
    };

    const clearDraft = async () => {
        setDraft({ train: null, coach: null, category: null, activity: null, answers: {} });
        await AsyncStorage.removeItem('@inspection_draft');
    };

    return (
        <StoreContext.Provider value={{ draft, setDraft, clearDraft, loadDraft }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => useContext(StoreContext);
