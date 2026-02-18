import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getAmenitySubcategories } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';

const AmenitySubcategoryScreen = ({ route, navigation }) => {
    const params = route.params;
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setDraft } = useStore();

    useEffect(() => {
        loadSubcategories();
    }, []);

    const loadSubcategories = async () => {
        try {
            const data = await getAmenitySubcategories(params.categoryName, params.coachId);
            setSubcategories(data);
        } catch (err) {
            Alert.alert('Error', 'Could not fetch subcategories');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (sub) => {
        setDraft(prev => ({
            ...prev,
            subcategory_id: sub.id,
            subcategory_name: sub.name
        }));

        navigation.navigate('ActivitySelection', {
            ...params,
            subcategoryId: sub.id,
            subcategoryName: sub.name
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.pills}>
                <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coachNumber}</Text></View>
                <View style={[styles.pill, styles.activePill]}><Text style={[styles.pillText, { color: '#fff' }]}>{params.categoryName}</Text></View>
            </View>

            <Text style={styles.title}>Select Area</Text>
            <Text style={styles.subtitle}>Choose an amenity area to inspect</Text>

            <FlatList
                data={subcategories}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.subCard}
                        onPress={() => handleSelect(item)}
                    >
                        <View style={styles.iconBox}>
                            <Ionicons name="apps-outline" size={24} color="#2563eb" />
                        </View>
                        <Text style={styles.subName}>{item.name}</Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    pills: { flexDirection: 'row', marginBottom: 20 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8 },
    activePill: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginBottom: 30 },
    list: { paddingBottom: 20 },
    subCard: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 6,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        minHeight: 140
    },
    iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    subName: { fontSize: 13, fontWeight: 'bold', color: '#334155', textAlign: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default AmenitySubcategoryScreen;
