import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getActivities } from '../api/api';
import { useStore } from '../store/StoreContext';

/**
 * Activity Selection Screen
 * Features side-by-side segmented tabs for Minor/Major
 */
const ActivitySelectionScreen = ({ route, navigation }) => {
    const params = route.params;
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setDraft } = useStore();

    useEffect(() => {
        loadActivities();
    }, []);

    const loadActivities = async () => {
        try {
            const data = await getActivities(params.categoryId);
            setActivities(data);
        } catch (err) {
            Alert.alert('Error', 'Could not get activities');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (act) => {
        setDraft(prev => ({ ...prev, activity: act }));
        navigation.navigate('QuestionsScreen', {
            ...params,
            activityId: act.id,
            activityType: act.type
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.pills}>
                <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coachNumber}</Text></View>
                <View style={[styles.pill, styles.activePill]}><Text style={[styles.pillText, { color: '#fff' }]}>{params.categoryName}</Text></View>
            </View>

            <Text style={styles.title}>Select Activity Type</Text>

            <View style={styles.tabContainer}>
                {activities.map(act => (
                    <TouchableOpacity
                        key={act.id}
                        style={[styles.tab, act.type === 'Major' ? styles.tabMajor : styles.tabMinor]}
                        onPress={() => handleSelect(act)}
                    >
                        <Text style={styles.tabIcon}>{act.type === 'Minor' ? '📝' : '⚡'}</Text>
                        <Text style={styles.tabText}>{act.type}</Text>
                        <Text style={styles.subText}>{act.type === 'Minor' ? 'Regular Check' : 'Deep Audit'}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    pills: { flexDirection: 'row', marginBottom: 20 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8 },
    activePill: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b', marginBottom: 40 },
    tabContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    tab: {
        width: '48%',
        height: 160,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10
    },
    tabMinor: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e2e8f0' },
    tabMajor: { backgroundColor: '#1e293b' },
    tabIcon: { fontSize: 32, marginBottom: 12 },
    tabText: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    tabMajorText: { color: '#fff' }, // added logic for colors
    subText: { fontSize: 12, color: '#64748b', marginTop: 5 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

// Fix for text colors in dynamic map
export default ActivitySelectionScreen;
