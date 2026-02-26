import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../api/api';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const PitLineTrainDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { train_id, train_number } = route.params;
    const trainId = train_id; // For local usage convenience
    const trainNumber = train_number;

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
            <AppHeader
                title={`Train ${trainNumber}`}
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
                rightComponent={
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddCoach}>
                        <MaterialCommunityIcons name="plus" size={20} color={COLORS.surface} />
                        <Text style={styles.addText}>Add Coach</Text>
                    </TouchableOpacity>
                }
            />

            {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
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
                                    onPress={() => navigation.navigate('PitLineSelectArea', {
                                        train_id: trainId,
                                        train_number: trainNumber,
                                        coach_id: coach.id,
                                        coach_number: coach.coach_number
                                    })}
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
    container: { flex: 1, backgroundColor: COLORS.background },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.md
    },
    addText: { color: COLORS.surface, marginLeft: 4, fontWeight: 'bold', fontSize: 13 },
    scrollContent: { padding: SPACING.lg },
    sectionLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.md },
    rakeContainer: { paddingVertical: SPACING.sm, marginBottom: SPACING.xl },
    engineCard: {
        width: 100,
        height: 120,
        backgroundColor: COLORS.disabled,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.placeholder
    },
    engineText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary, marginTop: 4 },
    coachWrapper: { position: 'relative', marginRight: SPACING.md },
    coachCard: {
        width: 100,
        height: 120,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    coachNum: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
    itemDel: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        elevation: 2
    },
    posBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: COLORS.secondary,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    posText: { color: COLORS.surface, fontSize: 10, fontWeight: 'bold' },
    emptyText: { alignSelf: 'center', marginTop: 40, color: COLORS.placeholder, fontStyle: 'italic' },
    instructionCard: {
        backgroundColor: '#EFF6FF',
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#BFDBFE'
    },
    instructionText: { color: '#1E40AF', flex: 1, marginLeft: SPACING.md, lineHeight: 20, fontSize: 13 }
});

export default PitLineTrainDetailScreen;
