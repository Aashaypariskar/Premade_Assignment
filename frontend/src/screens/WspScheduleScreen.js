import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getWspSchedules, getWspSession, getWspProgress } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';
import { useStore } from '../store/StoreContext';

const WspScheduleScreen = ({ route, navigation }) => {
    const { coach_id, coach_number, category_name, mode, sick_line_session_id } = route.params || {};
    const coachId = coach_id;
    const coachNumber = coach_number;
    const categoryName = category_name;
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [wspSession, setWspSession] = useState(null);
    const [pendingDefectsCount, setPendingDefectsCount] = useState(0);
    const { setDraft, user } = useStore();

    const init = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            else setRefreshing(true);
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
            } else if (mode === 'SICKLINE' && sick_line_session_id) {
                const progress = await getWspProgress(coachNumber, mode);
                const count = progress.pendingDefects || progress.pending_defects || 0;
                setPendingDefectsCount(count);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to initialize WSP flow');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            init();
        }, [])
    );

    const onRefresh = () => {
        init(true);
    };

    const handleSelect = (item) => {
        navigation.navigate('QuestionsScreen', {
            session_id: wspSession?.id,
            schedule_id: item.id,
            schedule_name: item.name,
            module_type: 'WSP',
            mode: mode,
            category_name: categoryName
        });
    };

    if (loading && !refreshing) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.secondary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="WSP Schedules"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] })}
            />

            <View style={styles.content}>
                {/* ... badge row and titles ... */}
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
                                                category_name: category_name,
                                                scheduleId: item.id,
                                                coach_id: coach_id,
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
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.secondary]}
                            tintColor={COLORS.secondary}
                        />
                    }
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
