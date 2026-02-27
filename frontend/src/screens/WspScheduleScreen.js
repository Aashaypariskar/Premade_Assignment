import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getWspSchedules, getWspSession, getWspProgress } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const WspScheduleScreen = ({ route, navigation }) => {
    const { coach_id, coach_number, category_name, mode, sick_line_session_id } = route.params || {};
    // Fallback for legacy / mixed params during transition
    const coachId = coach_id || route.params?.coachId;
    const coachNumber = coach_number || route.params?.coachNumber;
    const categoryName = category_name || route.params?.categoryName;
    const sickLineSessionId = sick_line_session_id || route.params?.sickLineSessionId;

    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wspSession, setWspSession] = useState(null);
    const [pendingDefectsCount, setPendingDefectsCount] = useState(0);
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
                if (route.params.module_type === 'pitline_wsp') {
                    // Pit Line WSP uses the Pit Line session directly
                    setWspSession({ id: route.params.session_id });
                } else {
                    const session = await getWspSession(coachNumber);
                    setWspSession(session);
                    if (session) {
                        const progress = await getWspProgress(coachNumber, mode);
                        const count = progress.pendingDefects || progress.pending_defects || 0;
                        setPendingDefectsCount(count);
                    }
                }
            } else if (mode === 'SICKLINE' && sickLineSessionId) {
                const progress = await getWspProgress(coachNumber, mode);
                const count = progress.pendingDefects || progress.pending_defects || 0;
                setPendingDefectsCount(count);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to initialize WSP flow');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (schedule) => {
        const session_id = mode === 'SICKLINE' ? sickLineSessionId : wspSession?.id;

        setDraft(prev => ({
            ...prev,
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            activity: null
        }));

        const navParams = {
            ...route.params,
            category_name: route.params.category_name || route.params.categoryName,
            session_id,
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            activity_id: null,
            activity_type: schedule.name,
            subcategory_id: null // STRICT Ph 10: Never send subcategory_id for schedules
        };

        navigation.navigate('QuestionsScreen', navParams);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="WSP Schedules"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.content}>
                <View style={styles.badgeRow}>
                    <View style={styles.badge}><Text style={styles.badgeText}>COACH: {coachNumber}</Text></View>
                    <View style={[styles.badge, styles.activeBadge]}>
                        <Text style={[styles.badgeText, { color: '#fff' }]}>{mode}</Text>
                    </View>
                </View>

                <Text style={styles.title}>Select Schedule</Text>
                <Text style={styles.subtitle}>Choose a WSP maintenance schedule</Text>

                {pendingDefectsCount > 0 && (
                    <TouchableOpacity
                        style={styles.defectsTab}
                        onPress={() => navigation.navigate('Defects', {
                            session_id: mode === 'SICKLINE' ? sickLineSessionId : wspSession?.id,
                            module_type: 'wsp',
                            coach_number: coachNumber
                        })}
                    >
                        <Ionicons name="build-outline" size={20} color={COLORS.danger} />
                        <Text style={styles.defectsTabText}>
                            Resolve {pendingDefectsCount} Pending Defects
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                )}

                <FlatList
                    data={schedules}
                    keyExtractor={(item, index) => (item?.id || index).toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => handleSelect(item)}
                        >
                            <View style={styles.iconBg}>
                                <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.catTitle}>{item.name}</Text>
                                <Text style={styles.catSub}>Tap to start inspection</Text>
                                {user?.role === 'Admin' && (
                                    <TouchableOpacity
                                        style={styles.wspEditBtn}
                                        onPress={() => {
                                            navigation.navigate('QuestionManagement', {
                                                category_name: route.params.category_name,
                                                scheduleId: item.id,
                                                coach_id: route.params.coach_id || route.params.coachId,
                                                activityType: item.name
                                            });
                                        }}
                                    >
                                        <Ionicons name="settings-outline" size={14} color={COLORS.secondary} />
                                        <Text style={styles.wspEditBtnText}>Edit {item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.list}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: SPACING.xl },
    badgeRow: { flexDirection: 'row', marginBottom: SPACING.lg, gap: SPACING.sm },
    badge: { backgroundColor: COLORS.disabled, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.md },
    activeBadge: { backgroundColor: COLORS.secondary },
    badgeText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textSecondary },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.md },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xxl },
    list: { paddingBottom: 40 },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        marginBottom: SPACING.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border
    },
    iconBg: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.mutedLight,
    },
    cardContent: { flex: 1 },
    catTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    catSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    wspEditBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, alignSelf: 'flex-start' },
    wspEditBtnText: { color: COLORS.secondary, fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
    defectsTab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.dangerLight,
        padding: 15,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: '#FECACA',
        borderStyle: 'dashed',
    },
    defectsTabText: {
        flex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.danger,
        marginLeft: 10,
    },
});

export default WspScheduleScreen;
