import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { getWspSession, getCoaches } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

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

    if (loading && !isModalVisible) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>WSP Examination</Text>
                <View style={{ width: 26 }} />
            </View>

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
                            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    ))}
                    {coaches.length === 0 && !loading && (
                        <View style={styles.empty}>
                            <Ionicons name="bus-outline" size={48} color="#e2e8f0" />
                            <Text style={styles.emptyText}>No coaches found for WSP.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    content: { flex: 1, padding: 25 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 15, color: '#64748b', marginTop: 5, marginBottom: 30 },
    coachList: { flex: 1 },
    coachCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    coachInfo: { flex: 1 },
    coachNum: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    coachType: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#94a3b8', fontSize: 14, marginTop: 10 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default WspCoachScreen;
