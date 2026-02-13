import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getCoaches } from '../services/apiIntegration';

const CoachSelection = ({ route, navigation }) => {
    const { trainId, trainName } = route.params;
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoaches();
    }, [trainId]);

    const fetchCoaches = async () => {
        try {
            const data = await getCoaches(trainId);
            setCoaches(data);
        } catch (error) {
            console.error('Error fetching coaches:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CategorySelection', { trainId, coachId: item.id, coachNumber: item.coach_number })}
        >
            <Text style={styles.coachNumber}>Coach: {item.coach_number}</Text>
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>{trainName}</Text>
            <Text style={styles.subHeader}>Select Coach</Text>
            <FlatList
                data={coaches}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    header: { fontSize: 18, color: '#64748b' },
    subHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#1e293b' },
    list: { paddingBottom: 20 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    coachNumber: { fontSize: 16, fontWeight: '600', color: '#334155' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CoachSelection;
