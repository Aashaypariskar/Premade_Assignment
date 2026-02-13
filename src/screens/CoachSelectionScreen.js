import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getCoaches } from '../services/apiIntegration';

const CoachSelectionScreen = ({ route, navigation }) => {
    const { trainId, trainName } = route.params;
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoaches();
    }, []);

    const fetchCoaches = async () => {
        try {
            const data = await getCoaches(trainId);
            setCoaches(data);
        } catch (err) {
            console.log('Coach fetch failed:', err);
            Alert.alert('Error', 'Could not get coaches.');
        } finally {
            setLoading(false);
        }
    };

    const renderCoach = ({ item }) => (
        <TouchableOpacity
            style={styles.coachItem}
            onPress={() => navigation.navigate('CategorySelection', {
                trainId,
                coachId: item.id,
                coachNumber: item.coach_number
            })}
        >
            <Text style={styles.coachText}>Coach: {item.coach_number}</Text>
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.info}>{trainName}</Text>
            <Text style={styles.title}>Select Coach</Text>
            <FlatList
                data={coaches}
                renderItem={renderCoach}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    info: { color: '#666', marginBottom: 5 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    coachItem: {
        padding: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#eee'
    },
    coachText: { fontSize: 18, textAlign: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CoachSelectionScreen;
