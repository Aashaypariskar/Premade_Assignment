import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import TrainSelectionScreen from '../screens/TrainSelectionScreen';
import CoachSelectionScreen from '../screens/CoachSelectionScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import ActivitySelectionScreen from '../screens/ActivitySelectionScreen';
import QuestionsScreen from '../screens/QuestionsScreen';
import SummaryScreen from '../screens/SummaryScreen';
import { useStore } from '../store/StoreContext';

const Stack = createStackNavigator();

/**
 * PRODUCTION NAVIGATOR
 * Features dynamic initial route detection for session resumption
 */
const AppNavigator = () => {
    const { draft } = useStore();

    // Logic to determine where the user left off
    let initialRoute = "TrainSelection";
    let initialParams = {};

    if (draft.category && draft.activity) {
        initialRoute = "QuestionsScreen";
        initialParams = {
            categoryId: draft.category.id,
            categoryName: draft.category.name,
            activityType: draft.activity.type,
            activityId: draft.activity.id
        };
    } else if (draft.coach) {
        initialRoute = "CategorySelection";
        initialParams = {
            coachId: draft.coach.id,
            coachNumber: draft.coach.coach_number
        };
    } else if (draft.train) {
        initialRoute = "CoachSelection";
        initialParams = {
            trainId: draft.train.id,
            trainName: draft.train.name
        };
    }

    return (
        <Stack.Navigator
            initialRouteName={initialRoute}
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
                initialParams={initialRoute === "TrainSelection" ? initialParams : {}}
            />
            <Stack.Screen
                name="CoachSelection"
                component={CoachSelectionScreen}
                options={{ title: 'Select Coach' }}
                initialParams={initialRoute === "CoachSelection" ? initialParams : {}}
            />
            <Stack.Screen
                name="CategorySelection"
                component={CategorySelectionScreen}
                options={{ title: 'Select Area' }}
                initialParams={initialRoute === "CategorySelection" ? initialParams : {}}
            />
            <Stack.Screen
                name="ActivitySelection"
                component={ActivitySelectionScreen}
                options={{ title: 'Type' }}
                initialParams={initialRoute === "ActivitySelection" ? initialParams : {}}
            />
            <Stack.Screen
                name="QuestionsScreen"
                component={QuestionsScreen}
                options={{ title: 'Checklist' }}
                initialParams={initialRoute === "QuestionsScreen" ? initialParams : {}}
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
