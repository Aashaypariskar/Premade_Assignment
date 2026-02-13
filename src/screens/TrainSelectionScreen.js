import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getTrains } from '../services/apiIntegration';

const TrainSelectionScreen = ({ navigation }) => {
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);

    // loading trains on mount
    useEffect(() => {
        loadTrains();
    }, []);

    const loadTrains = async () => {
        try {
            const data = await getTrains();
            setTrains(data);
        } catch (err) {
            console.log('Error:', err);
            Alert.alert('Connection Error', 'Please check if server is running!');
        } finally {
            setLoading(false);
        }
    };

    const renderTrain = ({ item }) => (
        <TouchableOpacity
            style={styles.trainCard}
            onPress={() => navigation.navigate('CoachSelection', {
                trainId: item.id,
                trainName: item.name
            })}
        >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.number}>#{item.train_number}</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ marginTop: 10 }}>Loading Trains...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Available Trains</Text>
            <FlatList
                data={trains}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTrain}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 15 },
    header: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333' },
    list: { paddingBottom: 20 },
    trainCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    name: { fontSize: 16, fontWeight: '600' },
    number: { color: '#888', marginTop: 4, fontSize: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default TrainSelectionScreen;
