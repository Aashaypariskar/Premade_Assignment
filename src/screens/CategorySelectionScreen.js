import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getCategories } from '../services/apiIntegration';

const CategorySelectionScreen = ({ route, navigation }) => {
    const { trainId, coachId, coachNumber } = route.params;
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await getCategories(coachId);
            setCategories(data);
        } catch (err) {
            console.log('Cat fetch failed:', err);
            Alert.alert('Error', 'Could not get categories.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (cat) => {
        navigation.navigate('ActivitySelection', {
            trainId,
            coachId,
            coachNumber,
            categoryId: cat.id,
            categoryName: cat.name
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.topInfo}>Coach: {coachNumber}</Text>
            <Text style={styles.title}>What to Inspect?</Text>
            <FlatList
                data={categories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.categoryCard} onPress={() => handleSelect(item)}>
                        <Text style={styles.categoryText}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
    topInfo: { color: '#666', fontSize: 13 },
    title: { fontSize: 24, fontWeight: 'bold', marginVertical: 15 },
    categoryCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 2,
        borderLeftWidth: 5,
        borderLeftColor: '#2563eb'
    },
    categoryText: { fontSize: 18, fontWeight: '500' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CategorySelectionScreen;
