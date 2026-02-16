import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getReports } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const ReportListScreen = ({ navigation }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const data = await getReports();
            setReports(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ReportDetail', {
                submission_id: item.id, // ID is now submission_id
                train_number: item.train_number,
                coach_number: item.coach_number,
                date: item.date,
                user_name: item.user_name,
                user_id: item.user_id
            })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.trainText}>🚄 {item.train_number} - {item.coach_number}</Text>
                <Text style={styles.dateText}>{item.date}</Text>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.userText}><Ionicons name="person-circle-outline" size={16} /> {item.user_name}</Text>
                <Text style={styles.questionsText}>{item.total_questions} Questions</Text>
            </View>
            <View style={styles.chevron}>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No reports found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    trainText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    dateText: { color: '#64748b', fontSize: 14 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userText: { color: '#475569', fontSize: 14 },
    questionsText: { color: '#2563eb', fontWeight: '600', fontSize: 13, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    chevron: { position: 'absolute', right: 16, top: '50%', marginTop: -10 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#94a3b8', fontSize: 16 }
});

export default ReportListScreen;
