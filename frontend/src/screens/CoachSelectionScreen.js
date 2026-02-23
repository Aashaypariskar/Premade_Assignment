import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getCoaches } from '../api/api';
import { useStore } from '../store/StoreContext';

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
            <View style={styles.topBar}>
                {trainName && <Text style={styles.trainName}>{trainName}</Text>}
                <Text style={styles.title}>{categoryName || 'Select Coach Plate'}</Text>
            </View>

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
    container: { flex: 1, backgroundColor: '#f8fafc' },
    topBar: { padding: 25, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    trainName: { color: '#64748b', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginTop: 4 },
    list: { padding: 12 },
    gridItem: { flex: 0.5, padding: 8 },
    coachCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    coachIcon: { fontSize: 30, marginBottom: 10 },
    coachNum: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    type: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CoachSelectionScreen;
