import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getAmenitySubcategories, getCommissionaryProgress } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const CommissionaryDashboardScreen = ({ route, navigation }) => {
    const { sessionId, coachNumber, compartmentId, status } = route.params;
    const [subcategories, setSubcategories] = useState([]);
    const [progress, setProgress] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [subs, prog] = await Promise.all([
                getAmenitySubcategories('Amenity', 1), // Dummy ID since master fetch
                getCommissionaryProgress(sessionId)
            ]);
            setSubcategories(subs);
            setProgress(prog[compartmentId] || {});
        } catch (err) {
            Alert.alert('Error', 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (sub) => {
        navigation.navigate('CommissionaryQuestions', {
            sessionId,
            coachNumber,
            compartmentId,
            subcategoryId: sub.id,
            subcategoryName: sub.name,
            status
        });
    };

    const renderItem = ({ item }) => {
        const subProgress = progress[item.id] || { Major: false, Minor: false };
        const bothComplete = subProgress.Major && subProgress.Minor;

        return (
            <TouchableOpacity
                style={[styles.card, bothComplete && styles.cardComplete]}
                onPress={() => handleSelect(item)}
            >
                <View style={[styles.iconBox, bothComplete && styles.iconBoxComplete]}>
                    <Ionicons
                        name={item.name.toLowerCase().includes('undergear') ? 'settings-outline' : 'cube-outline'}
                        size={24}
                        color={bothComplete ? "#fff" : "#2563eb"}
                    />
                </View>
                <Text style={styles.subName}>{item.name}</Text>

                <View style={styles.indicators}>
                    <View style={[styles.indicator, subProgress.Major && styles.indicatorDone]}>
                        <Text style={[styles.indicatorText, subProgress.Major && styles.indicatorTextDone]}>Major</Text>
                    </View>
                    <View style={[styles.indicator, subProgress.Minor && styles.indicatorDone]}>
                        <Text style={[styles.indicatorText, subProgress.Minor && styles.indicatorTextDone]}>Minor</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('CategoryDashboard')}>
                    <Ionicons name="home-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.pills}>
                    <View style={styles.pill}><Text style={styles.pillText}>{coachNumber}</Text></View>
                    <View style={[styles.pill, { backgroundColor: '#2563eb' }]}><Text style={[styles.pillText, { color: '#fff' }]}>{compartmentId}</Text></View>
                </View>
                <View style={{ width: 26 }} />
            </View>

            <Text style={styles.title}>Areas to Inspect</Text>
            <Text style={styles.subtitle}>Complete both Major and Minor for each area</Text>

            <FlatList
                data={subcategories}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />

            <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.navigate('CommissionaryCompartment', { sessionId, coachNumber, status })}
            >
                <Ionicons name="arrow-back" size={20} color="#64748b" />
                <Text style={styles.backBtnText}>Change Compartment</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, marginBottom: 20 },
    pills: { flexDirection: 'row', gap: 6 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 13, color: '#64748b', marginBottom: 20 },
    list: { paddingBottom: 100 },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 6,
        padding: 15,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardComplete: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7', borderWidth: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    iconBoxComplete: { backgroundColor: '#10b981' },
    subName: { fontSize: 12, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', height: 36 },
    indicators: { flexDirection: 'row', gap: 4, marginTop: 10 },
    indicator: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f1f5f9' },
    indicatorDone: { backgroundColor: '#10b981' },
    indicatorText: { fontSize: 8, fontWeight: 'bold', color: '#94a3b8' },
    indicatorTextDone: { color: '#fff' },
    backBtn: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        elevation: 2
    },
    backBtnText: { marginLeft: 8, fontSize: 14, color: '#64748b', fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CommissionaryDashboardScreen;
