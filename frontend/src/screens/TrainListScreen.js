import React, { useState, useEffect } from 'react';
// import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
// Note: Imports commented out to focus on logic as if in a real environment
import { getTrains } from '../services/ApiService';

const TrainListScreen = ({ navigation }) => {
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
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (train) => {
        // moving to coach selection with selected train
        navigation.navigate('CoachList', { trainId: train.id, trainName: train.name });
    };

    // Helper to render each train item
    const renderTrainItem = (train) => (
        <div key={train.id} className="list-item" onClick={() => handleSelect(train)}>
            <span className="item-text">{train.name}</span>
        </div>
    );

    if (loading) return <div>Loading trains...</div>;

    return (
        <div className="container">
            <div className="header">Select a Train</div>
            <div className="list">
                {trains.map(renderTrainItem)}
            </div>
        </div>
    );
};

/* 
// Note on React Native Styling (for the user):
const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
    header: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
    item: { padding: 16, backgroundColor: '#fff', borderRadius: 8, marginBottom: 12, elevation: 2 },
    itemText: { fontSize: 16, color: '#334155' }
});
*/

export default TrainListScreen;
