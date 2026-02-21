import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getActivities, getSickLineProgress } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const SickLineActivitySelectionScreen = ({ route, navigation }) => {
    const params = route.params;
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setDraft, user } = useStore();
    const [isMajorDone, setIsMajorDone] = useState(false);
    const [isMinorDone, setIsMinorDone] = useState(false);

    useEffect(() => {
        loadActivities();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadStatus();
        }, [])
    );

    const loadStatus = async () => {
        try {
            const prog = await getSickLineProgress(params.coachNumber);
            const area = prog?.perAreaStatus?.find(
                a => a.subcategory_id === (params.subcategoryId || params.subcategory_id)
            );
            if (area) {
                setIsMajorDone(area.hasMajor);
                setIsMinorDone(area.hasMinor);
            }
        } catch (err) {
            console.log('Status load error:', err);
        }
    };

    const loadActivities = async () => {
        try {
            // Reusing getActivities since it uses standard Master tables
            const data = await getActivities(params.coachId, 'Sick Line Examination', params.subcategoryId || params.subcategory_id);
            setActivities(data);
        } catch (err) {
            Alert.alert('Error', 'Could not get activities');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (act) => {
        setDraft(prev => ({ ...prev, activity: act, category: params.categoryName }));

        navigation.navigate('SickLineQuestions', {
            ...params,
            activityId: act.id,
            activityType: act.type,
            compartmentId: 'NA' // Sick Line uses NA for compartment
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.pills}>
                    <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coachNumber}</Text></View>
                    <View style={[styles.pill, styles.activePill]}><Text style={[styles.pillText, { color: '#fff' }]}>{params.categoryName}</Text></View>
                </View>
                <View style={{ width: 26 }} />
            </View>

            <Text style={styles.title}>Select Activity Type</Text>

            <View style={styles.tabContainer}>
                {activities.map(act => (
                    <View key={act.id} style={styles.activityWrapper}>
                        <TouchableOpacity
                            style={[styles.tab, act.type === 'Major' ? styles.tabMajor : styles.tabMinor]}
                            onPress={() => handleSelect(act)}
                        >
                            <View style={styles.titleRow}>
                                <Text style={styles.tabIcon}>{act.type === 'Minor' ? '📝' : '⚡'}</Text>
                                {((act.type === 'Major' && isMajorDone) || (act.type === 'Minor' && isMinorDone)) && (
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.badgeText}>Completed</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.tabText, act.type === 'Major' && styles.tabMajorText]}>{act.type}</Text>
                            <Text style={[styles.subText, act.type === 'Major' && styles.tabMajorText]}>{act.type === 'Minor' ? 'Regular Check' : 'Deep Audit'}</Text>
                        </TouchableOpacity>

                        {user?.role === 'Admin' && (
                            <TouchableOpacity
                                style={styles.adminEditBtn}
                                onPress={() => navigation.navigate('QuestionManagement', {
                                    activityId: act.id,
                                    activityType: act.type,
                                    categoryName: params.categoryName
                                })}
                            >
                                <Ionicons name="settings-outline" size={14} color="#f59e0b" />
                                <Text style={styles.adminEditBtnText}>Edit Questions</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    pills: { flexDirection: 'row', marginBottom: 20 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8 },
    activePill: { backgroundColor: '#f59e0b' },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b', marginBottom: 40 },
    tabContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    activityWrapper: { width: '48%', alignItems: 'center' },
    tab: {
        width: '100%',
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
    adminEditBtn: {
        marginTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fde68a'
    },
    adminEditBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#f59e0b',
        marginLeft: 6
    },
    tabMinor: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e2e8f0' },
    tabMajor: { backgroundColor: '#1e293b' },
    tabIcon: { fontSize: 32, marginBottom: 12 },
    tabText: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    tabMajorText: { color: '#fff' },
    subText: { fontSize: 12, color: '#64748b', marginTop: 5 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    titleRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    statusBadge: { backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});

export default SickLineActivitySelectionScreen;
