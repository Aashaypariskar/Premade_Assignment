import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const ActivitySelection = ({ route, navigation }) => {
    const { trainId, coachId, coachNumber, categoryId, categoryName } = route.params;

    const activities = [
        { id: 'ACT1', name: 'Minor', type: 'Minor' },
        { id: 'ACT2', name: 'Major', type: 'Major' },
    ];

    const handleSelect = (activity) => {
        navigation.navigate('QuestionsScreen', {
            trainId,
            coachId,
            coachNumber,
            categoryId,
            activityId: activity.id,
            activityType: activity.type
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>{categoryName} Inspection</Text>
            <Text style={styles.subHeader}>Select Inspection Intensity</Text>

            <View style={styles.grid}>
                {activities.map(act => (
                    <TouchableOpacity
                        key={act.id}
                        style={styles.card}
                        onPress={() => handleSelect(act)}
                    >
                        <Text style={styles.activityName}>{act.name}</Text>
                        <Text style={styles.activityDesc}>Full check-up</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
    header: { fontSize: 18, color: '#64748b' },
    subHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#1e293b' },
    grid: { flexDirection: 'row', justifyContent: 'space-between' },
    card: { backgroundColor: '#fff', padding: 24, borderRadius: 16, width: '48%', elevation: 3, alignItems: 'center' },
    activityName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    activityDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4 }
});

export default ActivitySelection;
