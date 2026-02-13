import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import TrainSelectionScreen from '../screens/TrainSelectionScreen';
import CoachSelectionScreen from '../screens/CoachSelectionScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import ActivitySelectionScreen from '../screens/ActivitySelectionScreen';
import QuestionsScreen from '../screens/QuestionsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="TrainSelection"
            screenOptions={{
                headerStyle: { backgroundColor: '#2563eb' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
            }}
        >
            <Stack.Screen
                name="TrainSelection"
                component={TrainSelectionScreen}
                options={{ title: 'Train Selection' }}
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
                options={{ title: 'Activity Type' }}
            />
            <Stack.Screen
                name="QuestionsScreen"
                component={QuestionsScreen}
                options={{ title: 'Inspection' }}
            />
        </Stack.Navigator>
    );
};

export default AppNavigator;
