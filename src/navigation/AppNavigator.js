import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import TrainSelection from '../screens/TrainSelection';
import CoachSelection from '../screens/CoachSelection';
import CategorySelection from '../screens/CategorySelection';
import ActivitySelection from '../screens/ActivitySelection';
import QuestionsScreen from '../screens/QuestionsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="TrainSelection"
            screenOptions={{
                headerStyle: { backgroundColor: '#2563eb' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen name="TrainSelection" component={TrainSelection} options={{ title: 'Select Train' }} />
            <Stack.Screen name="CoachSelection" component={CoachSelection} options={{ title: 'Select Coach' }} />
            <Stack.Screen name="CategorySelection" component={CategorySelection} options={{ title: 'Area Selection' }} />
            <Stack.Screen name="ActivitySelection" component={ActivitySelection} options={{ title: 'Activity Type' }} />
            <Stack.Screen name="QuestionsScreen" component={QuestionsScreen} options={{ title: 'Inspection Checklist' }} />
        </Stack.Navigator>
    );
};

export default AppNavigator;
