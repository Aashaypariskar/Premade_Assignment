import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';
import { useStore } from '../store/StoreContext';

import LoginScreen from '../screens/LoginScreen';
import CategoryDashboard from '../screens/CategoryDashboard';
import TrainSelectionScreen from '../screens/TrainSelectionScreen';
import CoachSelectionScreen from '../screens/CoachSelectionScreen';
import ActivitySelectionScreen from '../screens/ActivitySelectionScreen';
import QuestionsScreen from '../screens/QuestionsScreen';
import SummaryScreen from '../screens/SummaryScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import CreateUserScreen from '../screens/CreateUserScreen';
import QuestionManagementScreen from '../screens/QuestionManagementScreen';
import ReportListScreen from '../screens/ReportListScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import ScheduleSelectionScreen from '../screens/ScheduleSelectionScreen';
import AmenitySubcategoryScreen from '../screens/AmenitySubcategoryScreen';
import CompartmentSelectionScreen from '../screens/CompartmentSelectionScreen';
import CombinedSummaryScreen from '../screens/CombinedSummaryScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const { user, isAppReady } = useStore();

    if (!isAppReady) return null;

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
                headerTintColor: '#1e293b',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
                headerTitleAlign: 'center',
                headerBackTitleVisible: false
            }}
        >
            {!user ? (
                // Auth Stack
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
            ) : (
                // App Stack
                // Using Fragment to group multiple screens if needed, though Stack.Navigator handles children array fine
                // But mixing conditional rendering requires Fragment usually if logic is complex
                <>
                    <Stack.Screen
                        name="Dashboard"
                        component={CategoryDashboard}
                        options={{ title: 'Audit Dashboard' }}
                    />
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
                        name="ActivitySelection"
                        component={ActivitySelectionScreen}
                        options={{ title: 'Select Activity' }}
                    />
                    <Stack.Screen
                        name="QuestionsScreen"
                        component={QuestionsScreen}
                        options={{ title: 'Checklist' }}
                    />
                    <Stack.Screen
                        name="SummaryScreen"
                        component={SummaryScreen}
                        options={{ title: 'Review Report' }}
                    />
                    <Stack.Screen
                        name="ReportList"
                        component={ReportListScreen}
                        options={{ title: 'Inspection Reports' }}
                    />
                    <Stack.Screen
                        name="ReportDetail"
                        component={ReportDetailScreen}
                        options={{ title: 'Report Details' }}
                    />
                    <Stack.Screen
                        name="ScheduleSelection"
                        component={ScheduleSelectionScreen}
                        options={{ title: 'Select Schedule' }}
                    />
                    <Stack.Screen
                        name="AmenitySubcategory"
                        component={AmenitySubcategoryScreen}
                        options={{ title: 'Select Area' }}
                    />
                    <Stack.Screen
                        name="CompartmentSelection"
                        component={CompartmentSelectionScreen}
                        options={{ title: 'Select Compartment' }}
                    />
                    <Stack.Screen
                        name="CombinedSummary"
                        component={CombinedSummaryScreen}
                        options={{ title: 'Combined Summary' }}
                    />

                    {user.role === 'Admin' && (
                        <>
                            <Stack.Screen
                                name="UserManagement"
                                component={UserManagementScreen}
                                options={{ title: 'System Users' }}
                            />
                            <Stack.Screen
                                name="CreateUser"
                                component={CreateUserScreen}
                                options={{ title: 'User Access' }}
                            />
                            <Stack.Screen
                                name="QuestionManagement"
                                component={QuestionManagementScreen}
                                options={{ title: 'Question Management' }}
                            />
                        </>
                    )}
                </>
            )}
        </Stack.Navigator>
    );
};

export default AppNavigator;
