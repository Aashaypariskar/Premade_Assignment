import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { getCommissionaryProgress, completeCommissionarySession } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const CommissionaryCompartmentScreen = ({ route, navigation }) => {
    const { sessionId, coachNumber, status } = route.params;
    const [progress, setProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const [subcategories, setSubcategories] = useState([]);

    const compartments = ['L1', 'L2', 'L3', 'L4', 'D1', 'D2', 'D3', 'D4'];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [progressData, subsData] = await Promise.all([
                getCommissionaryProgress(sessionId),
                // We assume Amenity category is being searched. In prod we'd fetch this dynamically.
                // For now, let's just get any subcategories for 'Amenity'
                require('../api/api').getAmenitySubcategories('Amenity', 1) // coachId 1 is dummy for master fetch
            ]);
            setProgress(progressData);
            setSubcategories(subsData);
        } catch (err) {
            Alert.alert('Error', 'Failed to load progress');
        } finally {
            setLoading(false);
        }
    };

    const isCompartmentComplete = (comp) => {
        const compProgress = progress[comp];
        if (!compProgress) return false;

        // Check if all subcategories have both Major and Minor complete
        return subcategories.every(sub =>
            compProgress[sub.id] &&
            compProgress[sub.id].Major &&
            compProgress[sub.id].Minor
        );
    };

    const isAllComplete = () => {
        return compartments.every(comp => isCompartmentComplete(comp));
    };

    const handleSelect = (comp) => {
        navigation.navigate('CommissionaryDashboard', {
            sessionId,
            coachNumber,
            compartmentId: comp,
            status
        });
    };

    const handleSubmit = async () => {
        Alert.alert(
            'Confirm Submission',
            'Are you sure you want to complete this session? You won\'t be able to edit it later.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit',
                    onPress: async () => {
                        try {
                            await completeCommissionarySession(sessionId);
                            Alert.alert('Success', 'Inspection completed successfully!', [
                                { text: 'OK', onPress: () => navigation.navigate('CategoryDashboard') }
                            ]);
                        } catch (err) {
                            Alert.alert('Error', 'Failed to complete session');
                        }
                    }
                }
            ]
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('CategoryDashboard')}>
                    <Ionicons name="home-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.coachPill}>
                    <Text style={styles.coachText}>COACH: {coachNumber}</Text>
                </View>
                <View style={{ width: 26 }} />
            </View>

            <Text style={styles.title}>Select Compartment</Text>
            <Text style={styles.subtitle}>Complete all 8 compartments to submit</Text>

            <FlatList
                data={compartments}
                keyExtractor={(item) => item}
                numColumns={2}
                renderItem={({ item }) => {
                    const complete = isCompartmentComplete(item);
                    return (
                        <TouchableOpacity
                            style={[styles.card, complete && styles.cardComplete]}
                            onPress={() => handleSelect(item)}
                        >
                            <View style={[styles.iconBox, complete && styles.iconBoxComplete]}>
                                <Ionicons
                                    name={item.startsWith('L') ? "water-outline" : "exit-outline"}
                                    size={24}
                                    color={complete ? "#fff" : "#2563eb"}
                                />
                            </View>
                            <Text style={styles.compName}>{item}</Text>
                            <View style={styles.statusRow}>
                                <Ionicons
                                    name={complete ? "checkmark-circle" : "time-outline"}
                                    size={12}
                                    color={complete ? "#10b981" : "#94a3b8"}
                                />
                                <Text style={[styles.statusText, complete && { color: '#10b981' }]}>
                                    {complete ? 'Complete' : 'Pending'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={styles.list}
            />

            {isAllComplete() && status === 'DRAFT' && (
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                    <Text style={styles.submitBtnText}>Final Submit</Text>
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            )}

            {status === 'COMPLETED' && (
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: '#2563eb' }]}
                    onPress={() => navigation.navigate('CommissionaryCombinedReport', { sessionId })}
                >
                    <Text style={styles.submitBtnText}>View Combined Report</Text>
                    <Ionicons name="document-text-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, marginBottom: 20 },
    coachPill: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    coachText: { fontSize: 12, fontWeight: 'bold', color: '#2563eb' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 13, color: '#64748b', marginBottom: 20 },
    list: { paddingBottom: 100 },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 6,
        padding: 15,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardComplete: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7', borderWidth: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    iconBoxComplete: { backgroundColor: '#10b981' },
    compName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusText: { fontSize: 10, color: '#94a3b8', marginLeft: 4 },
    submitBtn: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#10b981',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CommissionaryCompartmentScreen;
