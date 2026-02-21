import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import CombinedReportScreen from '../screens/CombinedReportScreen';
import ReportSuccessScreen from '../screens/ReportSuccessScreen';
import CommissionaryCoachScreen from '../screens/CommissionaryCoachScreen';
import CommissionaryCompartmentScreen from '../screens/CommissionaryCompartmentScreen';
import CommissionaryDashboardScreen from '../screens/CommissionaryDashboardScreen';
import CommissionaryQuestionsScreen from '../screens/CommissionaryQuestionsScreen';
import CommissionaryCombinedReport from '../screens/CommissionaryCombinedReport';

import SickLineCoachScreen from '../screens/SickLineCoachScreen';
import SickLineDashboardScreen from '../screens/SickLineDashboardScreen';
import SickLineActivitySelectionScreen from '../screens/SickLineActivitySelectionScreen';
import SickLineQuestionsScreen from '../screens/SickLineQuestionsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const { user, isAppReady } = useStore();

    if (!isAppReady) return null;

    return (
        <Stack.Navigator
            screenOptions={({ navigation, route }) => ({
                headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
                headerTintColor: '#1e293b',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
                headerTitleAlign: 'center',
                headerBackTitleVisible: false,
                headerRight: () => (
                    route.name !== 'Dashboard' && route.name !== 'Login' ? (
                        <TouchableOpacity
                            onPress={() => navigation.reset({
                                index: 0,
                                routes: [{ name: 'Dashboard' }],
                            })}
                            style={{ marginRight: 15 }}
                        >
                            <Ionicons name="home-outline" size={24} color="#1e293b" />
                        </TouchableOpacity>
                    ) : null
                )
            })}
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
                        name="ReportSuccess"
                        component={ReportSuccessScreen}
                        options={{ title: 'Success', headerLeft: () => null }}
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
                    <Stack.Screen
                        name="CombinedReport"
                        component={CombinedReportScreen}
                        options={{ title: 'Combined Compartment Report' }}
                    />

                    <Stack.Screen
                        name="CommissionaryCoach"
                        component={CommissionaryCoachScreen}
                        options={{ title: 'Coach Commissionary' }}
                    />
                    <Stack.Screen
                        name="CommissionaryCompartment"
                        component={CommissionaryCompartmentScreen}
                        options={{ title: 'Compartments' }}
                    />
                    <Stack.Screen
                        name="CommissionaryDashboard"
                        component={CommissionaryDashboardScreen}
                        options={{ title: 'Area Selection' }}
                    />
                    <Stack.Screen
                        name="CommissionaryQuestions"
                        component={CommissionaryQuestionsScreen}
                        options={{ title: 'Inspection Form' }}
                    />
                    <Stack.Screen
                        name="CommissionaryCombinedReport"
                        component={CommissionaryCombinedReport}
                        options={{ title: 'Executive Matrix Report' }}
                    />

                    {/* Sick Line Framework */}
                    <Stack.Screen
                        name="SickLineCoach"
                        component={SickLineCoachScreen}
                        options={{ title: 'Sick Line Examination' }}
                    />
                    <Stack.Screen
                        name="SickLineDashboard"
                        component={SickLineDashboardScreen}
                        options={{ title: 'Area Selection' }}
                    />
                    <Stack.Screen
                        name="SickLineActivitySelection"
                        component={SickLineActivitySelectionScreen}
                        options={{ title: 'Select Activity' }}
                    />
                    <Stack.Screen
                        name="SickLineQuestions"
                        component={SickLineQuestionsScreen}
                        options={{ title: 'Inspection Form' }}
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
