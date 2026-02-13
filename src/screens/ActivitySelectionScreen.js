import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getActivities } from '../services/apiIntegration';

/**
 * Activity Selection Screen
 * Fetches Minor/Major tasks from backend for the selected area
 */
const ActivitySelectionScreen = ({ route, navigation }) => {
    const params = route.params;
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivities();
    }, []);

    const loadActivities = async () => {
        try {
            const data = await getActivities(params.categoryId);
            setActivities(data);
        } catch (err) {
            console.log('Error fetching activities:', err);
            Alert.alert('Error', 'Could not get activities from server');
        } finally {
            setLoading(false);
        }
    };

    const goChecklist = (act) => {
        navigation.navigate('QuestionsScreen', {
            ...params,
            activityId: act.id,
            activityType: act.type
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.topInfo}>{params.categoryName} Inspection</Text>
            <Text style={styles.title}>Select Activity Type</Text>

            <View style={styles.row}>
                {activities.map(act => (
                    <TouchableOpacity key={act.id} style={styles.box} onPress={() => goChecklist(act)}>
                        <Text style={styles.actName}>{act.type} Check</Text>
                        <Text style={styles.small}>Detailed inspection</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activities.length === 0 && (
                <View style={styles.center}>
                    <Text style={{ color: '#999' }}>No activities found for this category.</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    topInfo: { color: '#888', fontSize: 13 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40, marginTop: 5 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    box: {
        width: '48%',
        height: 140,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    actName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    small: { fontSize: 12, color: '#64748b', marginTop: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }
});

export default ActivitySelectionScreen;
