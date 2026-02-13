import React from 'react';
// import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
// import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';

// Mocking NavigationContainer for the structure
const NavigationContainer = ({ children }) => <div className="nav-container">{children}</div>;

const App = () => {
    return (
        <NavigationContainer>
            <AppNavigator />
        </NavigationContainer>
    );
};

/*
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
});
*/

export default App;
