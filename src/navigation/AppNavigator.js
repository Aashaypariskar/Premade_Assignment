import React from 'react';
// In a real development environment, we'd import { createStackNavigator } from '@react-navigation/stack';
// For this conversion, I'm defining the structure and flow.

import TrainListScreen from '../screens/TrainListScreen';
import CoachListScreen from '../screens/CoachListScreen';
import CategoryScreen from '../screens/CategoryScreen';
import ActivityScreen from '../screens/ActivityScreen';
import QuestionsScreen from '../screens/QuestionsScreen';

// Mocking the Stack for the sake of the exercise flow
const Stack = {
    Navigator: ({ children }) => <>{children}</>,
    Screen: () => null,
};

const AppNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="TrainList">
            <Stack.Screen name="TrainList" component={TrainListScreen} options={{ title: 'Select Train' }} />
            <Stack.Screen name="CoachList" component={CoachListScreen} options={{ title: 'Select Coach' }} />
            <Stack.Screen name="Category" component={CategoryScreen} options={{ title: 'Select Category' }} />
            <Stack.Screen name="Activity" component={ActivityScreen} options={{ title: 'Select Activity' }} />
            <Stack.Screen name="Questions" component={QuestionsScreen} options={{ title: 'Inspection' }} />
        </Stack.Navigator>
    );
};

export default AppNavigator;
