import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getTrains } from '../services/apiIntegration';

const TrainSelection = ({ navigation }) => {
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrains();
    }, []);

    const fetchTrains = async () => {
        try {
            const data = await getTrains();
            setTrains(data);
        } catch (error) {
            console.error('Error fetching trains:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CoachSelection', { trainId: item.id, trainName: item.name })}
        >
            <Text style={styles.trainName}>{item.name}</Text>
            <Text style={styles.trainNumber}>ID: {item.train_number || item.id}</Text>
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Select Train</Text>
            <FlatList
                data={trains}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#1e293b' },
    list: { paddingBottom: 20 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    trainName: { fontSize: 16, fontWeight: '600', color: '#334155' },
    trainNumber: { fontSize: 12, color: '#64748b', marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default TrainSelection;
