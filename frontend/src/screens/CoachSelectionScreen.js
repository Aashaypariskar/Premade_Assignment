import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getCoaches } from '../api/api';
import { useStore } from '../store/StoreContext';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

/**
 * Modern Coach Selection Screen
 * Features 2-column grid layout with select indicators
 */
const CoachSelectionScreen = ({ route, navigation }) => {
    const { trainId, trainName, categoryName } = route.params || {};
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setDraft } = useStore();

    useEffect(() => {
        loadData();
    }, [trainId, categoryName]);

    const loadData = async () => {
        try {
            const data = await getCoaches(trainId, categoryName);
            setCoaches(data);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item) => {
        setDraft(prev => ({ ...prev, coach: item, category: categoryName }));

        const nextParams = {
            coachId: item.id,
            coachNumber: item.coach_number,
            trainId: trainId,
            trainName: trainName || 'Audit',
            categoryName
        };

        if (categoryName === 'WSP Examination') {
            navigation.navigate('WspScheduleScreen', { ...nextParams, mode: 'INDEPENDENT' });
        } else if (categoryName === 'Amenity') {
            navigation.navigate('AmenitySubcategory', nextParams);
        } else {
            navigation.navigate('ActivitySelection', nextParams);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.gridItem} onPress={() => handleSelect(item)} activeOpacity={0.7}>
            <View style={styles.coachCard}>
                <Text style={styles.coachIcon}>🚃</Text>
                <Text style={styles.coachNum}>{item.coach_number}</Text>
                <Text style={styles.type}>Sleeper/AC</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title={categoryName || 'Select Coach'}
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            {trainName && (
                <View style={styles.trainInfo}>
                    <Text style={styles.trainLabel}>TRAIN</Text>
                    <Text style={styles.trainValue}>{trainName}</Text>
                </View>
            )}

            <FlatList
                data={coaches}
                numColumns={2}
                renderItem={renderItem}
                keyExtractor={(item, index) => (item?.id || index).toString()}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    trainInfo: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
    trainLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    trainValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary },
    list: { padding: 12 },
    gridItem: { flex: 0.5, padding: 8 },
    coachCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    coachIcon: { fontSize: 32, marginBottom: 8 },
    coachNum: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    type: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }
});

export default CoachSelectionScreen;
