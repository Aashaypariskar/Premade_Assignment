import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getActivities, getCommissionaryProgress, getSubcategoryMetadata } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Activity Selection Screen
 * Features side-by-side segmented tabs for Minor/Major
 */
const ActivitySelectionScreen = ({ route, navigation }) => {
    const params = route.params;
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setDraft, user } = useStore();
    const [majorProgress, setMajorProgress] = useState({ answered: 0, total: 0 });
    const [minorProgress, setMinorProgress] = useState({ answered: 0, total: 0 });
    const [pendingDefectsCount, setPendingDefectsCount] = useState(0);
    const [sessionId, setSessionId] = useState(null);

    const [supportsActivityType, setSupportsActivityType] = useState(true);

    useEffect(() => {
        loadActivities();
        checkMetadata();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadActivities();
            if (params.categoryName === 'Coach Commissionary' || params.categoryName === 'Sick Line Examination') {
                loadStatus();
            }
        }, [params.coachNumber, params.subcategoryId])
    );

    const loadStatus = async () => {
        try {
            const prog = await getCommissionaryProgress(params.coachNumber);
            const area = prog?.perAreaStatus?.find(
                a => a.subcategory_id === (params.subcategoryId || params.subcategory_id)
            );
            if (area) {
                // TRUE COMPLETION LOGIC: Derived from counts
                setMajorProgress({
                    answered: area.majorAnswered || 0,
                    total: area.majorTotal || 0
                });
                setMinorProgress({
                    answered: area.minorAnswered || 0,
                    total: area.minorTotal || 0
                });
                const count = area.pendingDefects || area.pending_defects || 0;
                console.log('[DEFECT COUNT]', area.subcategory_id, count);
                setPendingDefectsCount(count);
            }
            setSessionId(prog.session_id);
        } catch (err) {
            console.log('Status load error:', err);
        }
    };

    const checkMetadata = async () => {
        try {
            const meta = await getSubcategoryMetadata(params.subcategoryId || params.subcategory_id);
            setSupportsActivityType(meta.supportsActivityType);
        } catch (err) {
            console.log('Metadata check error:', err);
            setSupportsActivityType(true); // Default to true on error
        }
    };

    const loadActivities = async () => {
        try {
            const data = await getActivities(params.coachId, params.categoryName, params.subcategoryId || params.subcategory_id);
            setActivities(data);

            // AUTO-NAVIGATE if single mode is detected early
            // But we wait for metadata check to be sure
        } catch (err) {
            Alert.alert('Error', 'Could not get activities');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (act) => {
        setDraft(prev => ({ ...prev, activity: act, category: params.categoryName }));

        const screen = params.categoryName === 'Coach Commissionary' ? 'CommissionaryQuestions' : 'QuestionsScreen';

        navigation.navigate(screen, {
            ...params,
            activityId: act.id,
            activityType: act.type,
            compartmentId: params.compartmentId || 'NA' // Default to NA if no compartment selected
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

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

            {supportsActivityType === false ? (
                <View style={styles.singleModeContainer}>
                    <TouchableOpacity
                        style={[styles.tab, styles.tabMajor, { width: '100%', height: 200 }]}
                        onPress={() => handleSelect(activities.length ? activities[0] : { id: null, type: null })}
                    >
                        <Text style={styles.tabIcon}>📋</Text>
                        <Text style={[styles.tabText, styles.tabMajorText]}>Start Inspection</Text>
                        <Text style={[styles.subText, styles.tabMajorText]}>Complete check for this area</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.tabContainer}>
                    {activities.map(act => (
                        <View key={act.id} style={styles.activityWrapper}>
                            <TouchableOpacity
                                style={[styles.tab, act.type === 'Major' ? styles.tabMajor : styles.tabMinor]}
                                onPress={() => handleSelect(act)}
                            >
                                <View style={styles.titleRow}>
                                    <Text style={styles.tabIcon}>{act.type === 'Minor' ? '📝' : '⚡'}</Text>
                                    {(() => {
                                        const prog = act.type === 'Major' ? majorProgress : minorProgress;
                                        const isComplete = prog.total > 0 && prog.answered === prog.total;
                                        const isInProgress = !isComplete && prog.answered > 0;

                                        if (isComplete) {
                                            return (
                                                <View style={styles.statusBadge}>
                                                    <Text style={styles.badgeText}>Completed</Text>
                                                </View>
                                            );
                                        } else if (isInProgress) {
                                            return (
                                                <View style={[styles.statusBadge, { backgroundColor: '#f59e0b' }]}>
                                                    <Text style={styles.badgeText}>In Progress</Text>
                                                </View>
                                            );
                                        }
                                        return null;
                                    })()}
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
                                        categoryName: params.categoryName,
                                        subcategoryId: params.subcategoryId || params.subcategory_id
                                    })}
                                >
                                    <Ionicons name="settings-outline" size={14} color="#2563eb" />
                                    <Text style={styles.adminEditBtnText}>Edit {act.type} Questions</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {pendingDefectsCount > 0 && (
                <TouchableOpacity
                    style={styles.defectsBtnFull}
                    onPress={() => navigation.navigate('Defects', {
                        session_id: sessionId,
                        module_type: params.categoryName === 'Coach Commissionary' ? 'commissionary' : (params.categoryName === 'Sick Line Examination' ? 'sickline' : 'amenity'),
                        coach_number: params.coachNumber
                    })}
                >
                    <View style={styles.defectsBtnContent}>
                        <View style={styles.defectsBtnLeading}>
                            <Ionicons name="build" size={24} color="#ef4444" />
                            <Text style={styles.defectsBtnTitle}>View Pending Defects</Text>
                        </View>
                        <View style={styles.defectsBadge}>
                            <Text style={styles.defectsBadgeText}>{pendingDefectsCount}</Text>
                        </View>
                    </View>
                    <Text style={styles.defectsBtnSub}>Tap to resolve {pendingDefectsCount} reported issues</Text>
                </TouchableOpacity>
            )}
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
        backgroundColor: '#eff6ff',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe'
    },
    adminEditBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2563eb',
        marginLeft: 6
    },
    tabMinor: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e2e8f0' },
    tabMajor: { backgroundColor: '#1e293b' },
    defectsBtnFull: {
        marginTop: 30,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: '#ef4444',
        borderStyle: 'dashed',
        elevation: 4,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    defectsBtnContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    defectsBtnLeading: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    defectsBtnTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ef4444',
        marginLeft: 10
    },
    defectsBadge: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    defectsBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold'
    },
    defectsBtnSub: {
        fontSize: 13,
        color: '#7f1d1d',
        opacity: 0.7
    },
    tabIcon: { fontSize: 32, marginBottom: 12 },
    tabText: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    tabMajorText: { color: '#fff' }, // added logic for colors
    subText: { fontSize: 12, color: '#64748b', marginTop: 5 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    titleRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    statusBadge: {
        backgroundColor: '#10b981',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold'
    },
    singleModeContainer: {
        width: '100%',
        paddingHorizontal: 10
    }
});

// Fix for text colors in dynamic map
export default ActivitySelectionScreen;
