import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { getWspSession, getCoaches } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const WspCoachScreen = ({ route, navigation }) => {
    const category_name = route?.params?.category_name || 'WSP Examination';
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Create Coach Form State (WSP usually doesn't create coaches, but keeping for parity if needed)
    const [coachNumber, setCoachNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadCoaches();
    }, []);

    const loadCoaches = async () => {
        try {
            setLoading(true);
            const data = await getCoaches(undefined, category_name);
            setCoaches(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch coaches');
        } finally {
            setLoading(false);
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

    if (loading && !isModalVisible) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

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
                <Text style={styles.title}>Select Coach</Text>
                <Text style={styles.subtitle}>Choose a coach for WSP Daily Examination</Text>

                <ScrollView style={styles.coachList} showsVerticalScrollIndicator={false}>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default WspCoachScreen;
