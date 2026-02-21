import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { getCommissionaryCoaches, createCommissionaryCoach, getSickLineSession } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

// Sick Line shares coach creation API since coaches are global, but we use SickLineSession specifically
const SickLineCoachScreen = ({ navigation }) => {
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Create Coach Form State
    const [coachNumber, setCoachNumber] = useState('');
    const [coachType, setCoachType] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadCoaches();
    }, []);

    const loadCoaches = async () => {
        try {
            setLoading(true);
            const data = await getCommissionaryCoaches();
            setCoaches(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch coaches');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCoach = async () => {
        if (!coachNumber.trim()) return Alert.alert('Error', 'Coach number is required');

        try {
            setSubmitting(true);
            await createCommissionaryCoach({
                coach_number: coachNumber.trim(),
                coach_type: coachType.trim()
            });
            setIsModalVisible(false);
            setCoachNumber('');
            setCoachType('');
            loadCoaches();
            Alert.alert('Success', 'Coach created successfully');
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to create coach');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectCoach = async (coach) => {
        try {
            setLoading(true);
            const session = await getSickLineSession(coach.coach_number);
            navigation.navigate('SickLineDashboard', {
                sessionId: session.id,
                coachId: coach.id,
                coachNumber: coach.coach_number,
                categoryName: 'Sick Line Examination',
                status: session.status
            });
        } catch (err) {
            Alert.alert('Error', 'Failed to initialize session');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !isModalVisible) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
                    <Ionicons name="home-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sick Line Examination</Text>
                <View style={{ width: 26 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Manage Coaches</Text>
                <Text style={styles.subtitle}>Select an existing coach or create a new one for Sick Line</Text>

                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => setIsModalVisible(true)}
                >
                    <Ionicons name="add-circle-outline" size={24} color="#fff" />
                    <Text style={styles.createBtnText}>Create New Coach</Text>
                </TouchableOpacity>

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
                            <Text style={styles.emptyText}>No coaches found. Create one to start.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Create Coach Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Coach Registration</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.label}>Coach Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., 22436-B1"
                                value={coachNumber}
                                onChangeText={setCoachNumber}
                            />

                            <Text style={styles.label}>Coach Type (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., LHB AC 3-Tier"
                                value={coachType}
                                onChangeText={setCoachType}
                            />

                            <TouchableOpacity
                                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                                onPress={handleCreateCoach}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Save Coach</Text>
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
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    content: { flex: 1, padding: 25 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 15, color: '#64748b', marginTop: 5, marginBottom: 30 },
    createBtn: { flexDirection: 'row', backgroundColor: '#2563eb', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, marginBottom: 25 },
    createBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    coachList: { flex: 1 },
    coachCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    coachInfo: { flex: 1 },
    coachNum: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    coachType: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#94a3b8', fontSize: 14, marginTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    modalBody: { paddingBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#64748b', marginBottom: 8 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 15, fontSize: 16, color: '#1e293b', marginBottom: 20 },
    submitBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default SickLineCoachScreen;
