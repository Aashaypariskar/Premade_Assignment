import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getWspSession, getWspCoaches, createWspCoach } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';
import { useStore } from '../store/StoreContext';

const WspCoachScreen = ({ route, navigation }) => {
    const category_name = route?.params?.category_name || 'WSP Examination';
    const { user } = useStore();
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create Coach State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newCoachNumber, setNewCoachNumber] = useState('');
    const [newCoachType, setNewCoachType] = useState('');
    const [creating, setCreating] = useState(false);

    const loadCoaches = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);
            const data = await getWspCoaches();
            setCoaches(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch WSP coaches');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCoaches();
        }, [])
    );

    const onRefresh = () => {
        loadCoaches(true);
    };

    const handleCreateCoach = async () => {
        if (!newCoachNumber.trim()) {
            Alert.alert('Error', 'Coach number is required');
            return;
        }

        try {
            setCreating(true);
            await createWspCoach({
                coach_number: newCoachNumber.trim(),
                coach_type: newCoachType.trim()
            });
            Alert.alert('Success', 'Coach created successfully');
            setIsModalVisible(false);
            setNewCoachNumber('');
            setNewCoachType('');
            loadCoaches();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to create coach');
        } finally {
            setCreating(false);
        }
    };

    const handleSelectCoach = async (coach) => {
        try {
            setLoading(true);
            const session = await getWspSession(coach.coach_number);
            navigation.navigate('WspScheduleScreen', {
                session_id: session.id,
                coach_id: coach.id,
                coach_number: coach.coach_number,
                category_name: category_name,
                module_type: 'WSP',
                mode: 'INDEPENDENT'
            });
        } catch (err) {
            Alert.alert('Error', 'Failed to initialize WSP session');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !refreshing && !isModalVisible) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="WSP Examination"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Select Coach</Text>
                        <Text style={styles.subtitle}>Choose a coach for WSP Daily Examination</Text>
                    </View>
                    {user?.role === 'Admin' && (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setIsModalVisible(true)}
                        >
                            <Ionicons name="add" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    style={styles.coachList}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                        />
                    }
                >
                    {coaches.map(coach => (
                        <TouchableOpacity
                            key={coach.id}
                            style={styles.coachCard}
                            onPress={() => handleSelectCoach(coach)}
                        >
                            <View style={styles.coachInfo}>
                                <Text style={styles.coachNum}>{coach.coach_number}</Text>
                                <Text style={styles.coachType}>{coach.coach_type || 'General'}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
                        </TouchableOpacity>
                    ))}
                    {coaches.length === 0 && !loading && (
                        <View style={styles.empty}>
                            <Ionicons name="bus-outline" size={48} color={COLORS.disabled} />
                            <Text style={styles.emptyText}>No coaches found for WSP.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Create Coach Modal */}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Coach</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Coach Number (e.g. 123456/C)"
                            placeholderTextColor={COLORS.placeholder}
                            value={newCoachNumber}
                            onChangeText={setNewCoachNumber}
                            autoCapitalize="characters"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Coach Type (e.g. LWSCN)"
                            placeholderTextColor={COLORS.placeholder}
                            value={newCoachType}
                            onChangeText={setNewCoachType}
                            autoCapitalize="characters"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setIsModalVisible(false)}
                                disabled={creating}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleCreateCoach}
                                disabled={creating}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Text style={styles.saveButtonText}>Create</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: SPACING.xl },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.xl },
    coachList: { flex: 1 },
    coachCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 1
    },
    coachInfo: { flex: 1 },
    coachNum: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    coachType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: COLORS.placeholder, fontSize: 14, marginTop: SPACING.md },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.xl
    },
    addButton: {
        backgroundColor: COLORS.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: SPACING.xl
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        elevation: 5
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: 16,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        backgroundColor: COLORS.background
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: SPACING.md,
        marginTop: SPACING.md
    },
    modalButton: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        minWidth: 100,
        alignItems: 'center'
    },
    cancelButton: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    cancelButtonText: {
        color: COLORS.textSecondary,
        fontWeight: '600'
    },
    saveButton: {
        backgroundColor: COLORS.primary
    },
    saveButtonText: {
        color: COLORS.white,
        fontWeight: '600'
    }
});

export default WspCoachScreen;
