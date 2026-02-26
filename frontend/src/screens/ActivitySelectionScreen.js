import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api, { getActivities, getCommissionaryProgress, getSubcategoryMetadata } from '../api/api';
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
    const isPitLine = params?.module_type === 'PITLINE';

    useEffect(() => {
        loadActivities();
        checkMetadata();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadActivities();
            const category_name = params.category_name;
            if (category_name === 'Coach Commissionary' || category_name === 'Sick Line Examination' || isPitLine) {
                loadStatus();
            }
        }, [params.coach_number, params.subcategory_id, isPitLine])
    );

    const loadStatus = async () => {
        try {
            if (isPitLine) {
                const res = await api.get('/inspection/defects', {
                    params: {
                        type: 'PITLINE',
                        train_id: params.train_id,
                        coach_id: params.coach_id,
                        session_id: params.session_id
                    }
                });
                setPendingDefectsCount(res.data.defects?.length || 0);
                setSessionId(params.session_id);
                return;
            }

            const coachNum = params.coach_number;
            const subId = params.subcategory_id;
            const prog = await getCommissionaryProgress(coachNum);
            const area = prog?.perAreaStatus?.find(
                a => a.subcategory_id === subId
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
            const subId = params.subcategory_id || params.subcategoryId;
            const meta = await getSubcategoryMetadata(subId);
            setSupportsActivityType(meta.supportsActivityType);
        } catch (err) {
            console.log('Metadata check error:', err);
            setSupportsActivityType(true); // Default to true on error
        }
    };

    const loadActivities = async () => {
        try {
            if (isPitLine) {
                // Hardcode Major/Minor for Pit Line as per Requirement Part 3
                setActivities([
                    { id: 'pit_major', type: 'Major' },
                    { id: 'pit_minor', type: 'Minor' }
                ]);
                setLoading(false);
                return;
            }

            const categoryName = params.category_name || params.categoryName;
            const subId = params.subcategory_id || params.subcategoryId;
            const data = await getActivities(params.coach_id || params.coachId, categoryName, subId);
            setActivities(data);
        } catch (err) {
            Alert.alert('Error', 'Could not get activities');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (act) => {
        const category_name = params.category_name;
        setDraft(prev => ({ ...prev, activity: act, category: category_name }));

        const screen = (category_name === 'Coach Commissionary' && !isPitLine) ? 'CommissionaryQuestions' : 'QuestionsScreen';

        // Requirement Part 10: Param propagation
        navigation.navigate(screen, {
            ...params,
            category_name: category_name,
            activity_id: act.id,
            activity_type: act.type,
            compartment_id: params.compartment_id || 'NA'
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
                    <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coach_number}</Text></View>
                    <View style={[styles.pill, styles.activePill]}>
                        <Text style={[styles.pillText, { color: '#fff' }]}>
                            {isPitLine ? 'Pit Line' : (params.category_name)}
                        </Text>
                    </View>
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
                                        categoryName: params.category_name || params.categoryName,
                                        subcategoryId: params.subcategory_id || params.subcategoryId
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
                        module_type: isPitLine ? 'PITLINE' : ((params.category_name || params.categoryName) === 'Coach Commissionary' ? 'commissionary' : ((params.category_name || params.categoryName) === 'Sick Line Examination' ? 'sickline' : 'amenity')),
                        coach_number: params.coach_number || params.coachNumber,
                        train_id: params.train_id,
                        coach_id: params.coach_id
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
