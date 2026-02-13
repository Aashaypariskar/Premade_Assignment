import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { getTrains } from '../api/api';
import { useStore } from '../store/StoreContext';

/**
 * Modern Train Selection Screen
 * Features premium card design and quick info badges
 */
const TrainSelectionScreen = ({ navigation }) => {
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setDraft } = useStore();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getTrains();
            setTrains(data);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item) => {
        setDraft(prev => ({ ...prev, train: item }));
        navigation.navigate('CoachSelection', { trainId: item.id, trainName: item.name });
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)} activeOpacity={0.7}>
            <View style={styles.iconBox}>
                <Text style={styles.icon}>🚆</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>#{item.train_number}</Text>
                </View>
            </View>
            <Text style={styles.arrow}>❯</Text>
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Active Cleanliness Audit</Text>
                <Text style={styles.subtitle}>Select a train to begin inspection</Text>
            </View>
            <FlatList
                data={trains}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 25, backgroundColor: '#2563eb', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20, elevation: 5 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 14, color: '#bfdbfe', marginTop: 5 },
    list: { padding: 20 },
    card: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    iconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
    icon: { fontSize: 24 },
    info: { flex: 1, marginLeft: 15 },
    name: { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },
    badge: { backgroundColor: '#f1f5f9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    badgeText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
    arrow: { fontSize: 18, color: '#cbd5e1', fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default TrainSelectionScreen;
