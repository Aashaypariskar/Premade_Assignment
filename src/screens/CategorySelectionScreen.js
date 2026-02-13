import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getCategories } from '../services/apiIntegration';

const CategorySelection = ({ route, navigation }) => {
    const { trainId, coachId, coachNumber } = route.params;
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, [coachId]);

    const fetchCategories = async () => {
        try {
            const data = await getCategories(coachId);
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ActivitySelection', { trainId, coachId, coachNumber, categoryId: item.id, categoryName: item.name })}
        >
            <Text style={styles.catName}>{item.name}</Text>
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Coach {coachNumber}</Text>
            <Text style={styles.subHeader}>Select area to inspect</Text>
            <FlatList
                data={categories}
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
    catName: { fontSize: 16, fontWeight: '600', color: '#334155' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CategorySelection;
