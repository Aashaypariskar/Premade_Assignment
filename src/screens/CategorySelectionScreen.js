import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getCategories } from '../api/api';
import { useStore } from '../store/StoreContext';

/**
 * Category Selection Screen
 * Show card with icon for 'Exterior' area
 */
const CategorySelectionScreen = ({ route, navigation }) => {
    const { coachId, coachNumber } = route.params;
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setDraft } = useStore();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getCategories(coachId);
            setCategories(data);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item) => {
        setDraft(prev => ({ ...prev, category: item }));
        navigation.navigate('ActivitySelection', { categoryId: item.id, categoryName: item.name });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.infoBox}>
                <Text style={styles.coachLabel}>COACH</Text>
                <Text style={styles.coachVal}>{coachNumber}</Text>
            </View>

            <Text style={styles.title}>Inspection Focus</Text>

            <View style={styles.list}>
                {categories.map(cat => (
                    <TouchableOpacity key={cat.id} style={styles.areaCard} onPress={() => handleSelect(cat)}>
                        <View style={styles.areaIcon}>
                            <Text style={{ fontSize: 32 }}>✨</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.areaName}>{cat.name}</Text>
                            <Text style={styles.areaSub}>Full body & lettering check</Text>
                        </View>
                        <Text style={styles.go}>START ➔</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 25 },
    infoBox: { backgroundColor: '#1e293b', borderRadius: 12, padding: 15, marginBottom: 30 },
    coachLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
    coachVal: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
    list: { flex: 1 },
    areaCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10
    },
    areaIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    areaName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    areaSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
    go: { fontSize: 12, fontWeight: 'bold', color: '#2563eb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CategorySelectionScreen;
