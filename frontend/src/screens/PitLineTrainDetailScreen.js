import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../api/api';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

const PitLineTrainDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { trainId, trainNumber } = route.params;

    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCoaches = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/pitline/coaches?train_id=${trainId}`);
            setCoaches(response.data);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to fetch coaches');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchCoaches();
        }, [trainId])
    );

    const handleAddCoach = () => {
        Alert.prompt('Add Coach', 'Enter Coach Number (e.g. B1)', async (coachNum) => {
            if (!coachNum) return;
            try {
                await api.post('/pitline/coaches/add', { train_id: trainId, coach_number: coachNum });
                fetchCoaches();
            } catch (err) {
                Alert.alert('Error', err.response?.data?.error || 'Failed to add coach');
            }
        });
    };

    const handleDeleteCoach = (id) => {
        Alert.alert('Delete', 'Delete this coach?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/pitline/coaches/${id}`);
                        fetchCoaches();
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                }
            }
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Train {trainNumber}</Text>
                    <Text style={styles.subTitle}>{coaches.length} Coaches</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={handleAddCoach}>
                    <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
                    <Text style={styles.addText}>Add Coach</Text>
                </TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator size="large" color="#1E3A8A" style={{ marginTop: 40 }} /> : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.sectionLabel}>Rake Layout</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rakeContainer}>
                        {/* Static Engine */}
                        <View style={styles.engineCard}>
                            <MaterialCommunityIcons name="train" size={40} color="#6B7280" />
                            <Text style={styles.engineText}>ENGINE</Text>
                        </View>

                        {/* Coaches */}
                        {coaches.map((coach, index) => (
                            <View key={coach.id.toString()} style={styles.coachWrapper}>
                                <TouchableOpacity
                                    style={styles.coachCard}
                                    onPress={() => navigation.navigate('PitLineSelectArea', { trainId, trainNumber, coachId: coach.id, coachNumber: coach.coach_number })}
                                >
                                    <Text style={styles.coachNum}>{coach.coach_number}</Text>
                                    <View style={styles.posBadge}>
                                        <Text style={styles.posText}>{index + 1}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.itemDel} onPress={() => handleDeleteCoach(coach.id)}>
                                    <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {coaches.length === 0 && (
                            <Text style={styles.emptyText}>No coaches added yet</Text>
                        )}
                    </ScrollView>

                    <View style={styles.instructionCard}>
                        <MaterialCommunityIcons name="information-outline" size={24} color="#3B82F6" />
                        <Text style={styles.instructionText}>
                            Tap on a coach to start inspection. Each coach maintains its own session.
                        </Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E3A8A' },
    subTitle: { fontSize: 14, color: '#6B7280' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E3A8A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    addText: { color: '#FFF', marginLeft: 4, fontWeight: '600' },
    scrollContent: { padding: 16 },
    sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
    rakeContainer: { paddingVertical: 10, marginBottom: 20 },
    engineCard: { width: 100, height: 120, backgroundColor: '#E5E7EB', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#9CA3AF' },
    engineText: { fontSize: 12, fontWeight: 'bold', color: '#6B7280', marginTop: 4 },
    coachWrapper: { position: 'relative', marginRight: 12 },
    coachCard: { width: 100, height: 120, backgroundColor: '#FFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#BFDBFE' },
    coachNum: { fontSize: 20, fontWeight: 'bold', color: '#1E3A8A' },
    itemDel: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FFF', borderRadius: 10 },
    posBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#1E3A8A', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    posText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    emptyText: { alignSelf: 'center', marginTop: 40, color: '#9CA3AF', fontStyle: 'italic' },
    instructionCard: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
    instructionText: { color: '#1E40AF', flex: 1, marginLeft: 12, lineHeight: 20 }
});

export default PitLineTrainDetailScreen;
