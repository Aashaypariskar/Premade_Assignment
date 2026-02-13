import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import TrainSelectionScreen from '../screens/TrainSelectionScreen';
import CoachSelectionScreen from '../screens/CoachSelectionScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import ActivitySelectionScreen from '../screens/ActivitySelectionScreen';
import QuestionsScreen from '../screens/QuestionsScreen';
import SummaryScreen from '../screens/SummaryScreen';

const Stack = createStackNavigator();

/**
 * PRODUCTION NAVIGATOR
 * Features centralized styling and all inspection steps
 */
const AppNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="TrainSelection"
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#fff',
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0
                },
                headerTintColor: '#1e293b',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
                headerTitleAlign: 'center',
                headerBackTitleVisible: false
            }}
        >
            <Stack.Screen
                name="TrainSelection"
                component={TrainSelectionScreen}
                options={{ title: 'Select Train' }}
            />
            <Stack.Screen
                name="CoachSelection"
                component={CoachSelectionScreen}
                options={{ title: 'Select Coach' }}
            />
            <Stack.Screen
                name="CategorySelection"
                component={CategorySelectionScreen}
                options={{ title: 'Select Area' }}
            />
            <Stack.Screen
                name="ActivitySelection"
                component={ActivitySelectionScreen}
                options={{ title: 'Type' }}
            />
            <Stack.Screen
                name="QuestionsScreen"
                component={QuestionsScreen}
                options={{ title: 'Checklist' }}
            />
            <Stack.Screen
                name="SummaryScreen"
                component={SummaryScreen}
                options={{ title: 'Review' }}
            />
        </Stack.Navigator>
    );
};

export default AppNavigator;
