import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { StoreProvider, useStore } from './src/store/StoreContext';

/**
 * Main App Entry
 * Wrapped with StoreProvider for Global State & Offline Support
 */
const AppContent = () => {
    const { isLoaded } = useStore();

    if (!isLoaded) return null; // Or a splash screen

    return (
        <NavigationContainer>
            <AppNavigator />
            <StatusBar style="light" />
        </NavigationContainer>
    );
};

export default function App() {
    return (
        <StoreProvider>
            <SafeAreaProvider>
                <AppContent />
            </SafeAreaProvider>
        </StoreProvider>
    );
}
