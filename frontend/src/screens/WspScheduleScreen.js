import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getWspSchedules, getWspSession, getWspProgress } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';

const WspScheduleScreen = ({ route, navigation }) => {
    const { coachId, coachNumber, categoryName, mode, sickLineSessionId } = route.params || {};
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wspSession, setWspSession] = useState(null);
    const { setDraft, user } = useStore();

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        try {
            setLoading(true);
            const scheduleData = await getWspSchedules();
            setSchedules(scheduleData);

            if (mode === 'INDEPENDENT') {
                const session = await getWspSession(coachNumber);
                setWspSession(session);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to initialize WSP flow');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (schedule) => {
        const sessionId = mode === 'SICKLINE' ? sickLineSessionId : wspSession?.id;

        setDraft(prev => ({
            ...prev,
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            activity: null
        }));

        navigation.navigate('QuestionsScreen', {
            coachId,
            coachNumber,
            categoryName,
            mode,
            sessionId,
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            activityId: null,
            activityType: schedule.name
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>WSP Schedules</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.coachPill}>
                    <Text style={styles.coachText}>COACH: {coachNumber}</Text>
                    <View style={styles.modeBadge}>
                        <Text style={styles.modeText}>{mode}</Text>
                    </View>
                </View>

                <Text style={styles.title}>Select Schedule</Text>
                <Text style={styles.subtitle}>Choose an inspection schedule for WSP Examination</Text>

                <FlatList
                    data={schedules}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.scheduleCard}
                            onPress={() => handleSelect(item)}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="clipboard-outline" size={24} color="#2563eb" />
                                </View>
                                <View style={styles.info}>
                                    <Text style={styles.scheduleName}>{item.name}</Text>
                                    <Text style={styles.scheduleDetail}>Click to start inspection</Text>
                                    {user?.role === 'Admin' && (
                                        <TouchableOpacity
                                            style={styles.wspEditBtn}
                                            onPress={() => {
                                                navigation.navigate('QuestionManagement', {
                                                    categoryName,
                                                    scheduleId: item.id,
                                                    coachId,
                                                    activityType: item.name
                                                });
                                            }}
                                        >
                                            <Ionicons name="settings-outline" size={14} color="#2563eb" />
                                            <Text style={styles.wspEditBtnText}>Edit {item.name}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.list}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    content: { flex: 1, padding: 25 },
    coachPill: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    coachText: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginRight: 10 },
    modeBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    modeText: { fontSize: 10, fontWeight: 'bold', color: '#475569' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 15, color: '#64748b', marginTop: 5, marginBottom: 30 },
    list: { paddingBottom: 20 },
    scheduleCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2
    },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15
    },
    info: { flex: 1 },
    scheduleName: { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },
    scheduleDetail: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    wspEditBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#eff6ff', borderRadius: 8, alignSelf: 'flex-start' },
    wspEditBtnText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }
});

export default WspScheduleScreen;
