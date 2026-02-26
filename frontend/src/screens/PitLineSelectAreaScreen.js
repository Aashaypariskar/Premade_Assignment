import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../api/api';
import { useRoute, useNavigation } from '@react-navigation/native';

const PitLineSelectAreaScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { trainId, trainNumber, coachId, coachNumber } = route.params;

    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);

    const areas = [
        { id: 119, name: "Exterior", icon: "train-car", type: 'AMENITY' },
        { id: 120, name: "Interior passenger area", icon: "seat-recline-normal", type: 'AMENITY' },
        { id: 175, name: "Door Area", icon: "door", type: 'AMENITY' },
        { id: 176, name: "Passage area", icon: "human-male-height-variant", type: 'AMENITY' },
        { id: 177, name: "Lavatory area", icon: "toilet", type: 'AMENITY' },
        { id: 178, name: "Seat and Berths", icon: "bed-outline", type: 'AMENITY' },
        { id: 179, name: "Undergear", icon: "cog-outline", type: 'UNDERGEAR' },
        { id: 186, name: "WSP Maintenance", icon: "wrench", type: 'WSP' }
    ];

    React.useEffect(() => {
        const startSession = async () => {
            try {
                setLoading(true);
                const res = await api.post('/pitline/session/start', {
                    train_id: trainId,
                    coach_id: coachId
                });
                if (res.data.success) {
                    setSessionId(res.data.session_id);
                }
            } catch (err) {
                console.error('[PITLINE SESSION START ERROR]', err);
                Alert.alert('Error', 'Failed to initialize session');
            } finally {
                setLoading(false);
            }
        };

        if (!sessionId) {
            startSession();
        }
    }, []);

    const handleAreaSelect = (area) => {
        if (!sessionId) {
            Alert.alert('Please Wait', 'Session is still initializing...');
            return;
        }

        const params = {
            module_type: 'PITLINE',
            session_id: sessionId,
            train_id: trainId,
            train_number: trainNumber,
            coach_id: coachId,
            coach_number: coachNumber,
            areaName: area.name,
            subcategoryId: area.id,
            subcategory_id: area.id
        };

        if (area.type === 'WSP') {
            navigation.navigate('WspScheduleScreen', { ...params, mode: 'INDEPENDENT', module_type: 'pitline_wsp' });
        } else {
            navigation.navigate('QuestionsScreen', { ...params, categoryName: area.type === 'UNDERGEAR' ? 'Undergear' : 'Amenity' });
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Area</Text>
                <Text style={styles.subTitle}>{trainNumber} / {coachNumber}</Text>
            </View>

            {loading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#1E3A8A" />
                    <Text style={styles.loadingText}>Starting Session...</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.grid}>
                    {areas.map((area) => (
                        <TouchableOpacity
                            key={area.id}
                            style={styles.card}
                            onPress={() => handleAreaSelect(area)}
                            disabled={loading}
                        >
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name={area.icon} size={32} color="#1E3A8A" />
                            </View>
                            <Text style={styles.areaName}>{area.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    subTitle: { fontSize: 16, color: '#1E3A8A', marginTop: 4, fontWeight: '600' },
    scrollContent: { padding: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { width: '48%', backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    iconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    areaName: { fontSize: 14, fontWeight: 'bold', color: '#374151', textAlign: 'center' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#1E3A8A', fontWeight: 'bold' }
});

export default PitLineSelectAreaScreen;
