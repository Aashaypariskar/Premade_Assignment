import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, {
    getQuestions,
    getWspQuestions,
    autosaveInspection,
    saveInspectionCheckpoint
} from '../api/api';
import { useStore } from '../store/StoreContext';
import QuestionCard from '../components/QuestionCard';
import { Ionicons } from '@expo/vector-icons';
import { normalizeQuestionResponse } from '../utils/normalization';
import QuestionProgressHeader from '../components/QuestionProgressHeader';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

/**
 * Questions Checklist Screen - PRODUCTION VERSION
 * Highly defensive code to prevent "Cannot read property of null" errors
 */
const QuestionsScreen = ({ route, navigation }) => {
    const params = route?.params || {};
    const { draft, setDraft, user } = useStore();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingCheckpoint, setSavingCheckpoint] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
    const [pendingDefectsCount, setPendingDefectsCount] = useState(0);
    const autoSaveTimer = useRef(null);

    const fetchRef = useRef(null);

    const isMounted = useRef(true);

    const loadData = useCallback(async () => {
        const subId = params.subcategory_id || params.subcategoryId;
        const categoryName = params.category_name || 'Amenity';
        const areaName = params.area_name || params.areaName;

        try {
            setLoading(true);
            setQuestions([]);

            // Centralized Framework Resolution — Strict Phase 3 Logic
            let frameworkToUse = null;

            if (params.module_type === 'PITLINE') {
                if (areaName === 'WSP Maintenance' || params.module_type === 'pitline_wsp') {
                    frameworkToUse = 'WSP';
                } else if (areaName === 'Undergear') {
                    frameworkToUse = 'COMMISSIONARY';
                } else {
                    frameworkToUse = 'AMENITY';
                }
            } else if (categoryName === 'Coach Commissioning' || categoryName === 'Coach Commissionary') {
                frameworkToUse = 'COMMISSIONARY';
            } else if (categoryName === 'WSP Examination' || params.module_type === 'WSP') {
                frameworkToUse = 'WSP';
            } else if (categoryName === 'Amenity') {
                frameworkToUse = 'AMENITY';
            } else if (categoryName === 'Sick Line Examination' || params.module_type === 'SICKLINE') {
                frameworkToUse = 'SICKLINE';
            } else if (categoryName === 'CAI / Modifications' || params.module_type === 'CAI') {
                frameworkToUse = 'CAI';
            }

            // Explicit Framework from params (Override)
            if (params.framework) {
                frameworkToUse = params.framework;
            }

            // STRICT GUARD: No GENERIC, No Fallback
            if (!frameworkToUse) {
                const fatalError = `FAILED TO RESOLVE FRAMEWORK: [MODULE: ${params.module_type}] [CATEGORY: ${categoryName}] [AREA: ${areaName}]`;
                console.error(fatalError);
                throw new Error(fatalError);
            }

            console.log(`[STABILIZATION GUARD]
[MODULE]: ${params.module_type || 'N/A'}
[CATEGORY]: ${categoryName || 'N/A'}
[FRAMEWORK]: ${frameworkToUse}
[SUBCATEGORY]: ${subId || 'N/A'}
[ACTIVITY]: ${params.activity_type || 'N/A'}
[COMPARTMENT]: ${params.compartment_id || params.compartment || 'NA'}`);

            console.log('[API CALL] Fetching checklist...');
            let rawResponse;
            let apiCategoryName = categoryName;
            if (params.subcategoryName?.toLowerCase() === 'undergear' || params.area_name?.toLowerCase() === 'undergear' || categoryName?.toLowerCase() === 'undergear') {
                apiCategoryName = 'Undergear';
            }

            if (categoryName === 'WSP Examination' && !params.subcategory_id) {
                rawResponse = await getWspQuestions(params.schedule_id || params.scheduleId);
            } else {
                rawResponse = await getQuestions(
                    params.activity_id || params.activityId,
                    params.schedule_id || params.scheduleId,
                    subId,
                    frameworkToUse,
                    params.activity_type || params.activityType,
                    apiCategoryName
                );
            }

            console.log(`[API RESPONSE] Count: ${Array.isArray(rawResponse) ? rawResponse.length : (rawResponse?.groupedQuestions ? 'Grouped' : 'NULL')}`);

            if (!isMounted.current) return;

            let apiQuestions = [];
            if (rawResponse?.questions && Array.isArray(rawResponse.questions)) {
                apiQuestions = rawResponse.questions;
            } else if (rawResponse?.data?.questions && Array.isArray(rawResponse.data.questions)) {
                apiQuestions = rawResponse.data.questions;
            } else {
                const normalized = normalizeQuestionResponse(rawResponse);
                apiQuestions = normalized.groups;
            }

            console.log('API QUESTIONS LENGTH:', apiQuestions.length);
            setQuestions(apiQuestions);

            // Fetch actual pending defects from server
            const defectsRes = await api.get('/inspection/defects', {
                params: {
                    session_id: params.session_id,
                    train_id: params.train_id,
                    coach_id: params.coach_id,
                    subcategory_id: params.subcategory_id,
                    schedule_id: params.schedule_id,
                    compartment_id: params.compartment_id || params.compartment,
                    mode: params.mode,
                    type: params.module_type || params.type || frameworkToUse
                }
            });

            if (defectsRes.success && isMounted.current) {
                const count = (defectsRes.defects || []).filter(a =>
                    a.status === 'DEFICIENCY' && Number(a.resolved) === 0
                ).length;
                setPendingDefectsCount(count);
            }
        } catch (error) {
            console.error("[QUESTION FETCH ERROR]", error);
            if (isMounted.current) {
                Alert.alert('Network Error', 'Check if backend is running');
                setQuestions([]);
            }
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [params.subcategoryId, params.subcategory_id, params.activityId, params.scheduleId, params.categoryName]);

    useEffect(() => {
        isMounted.current = true;
        loadData();
        return () => {
            isMounted.current = false;
        };
    }, [loadData]);

    const onRefresh = React.useCallback(() => {
        loadData();
    }, [loadData]);

    const getAnswerKey = (qId) => {
        if (!qId) {
            console.warn('[GET ANSWER KEY] Missing qId!');
            return 'missing_id';
        }
        try {
            return params.compartment ? `${params.compartment}_${qId}` : qId.toString();
        } catch (err) {
            console.error('[GET ANSWER KEY ERROR]', err, 'qId:', qId);
            return 'error_id';
        }
    };

    const triggerAutoSave = (qId, data) => {
        // Enforce lock if session is submitted
        if (params.status === 'SUBMITTED' || params.status === 'COMPLETED') return;

        setSaveStatus('saving');
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            try {
                // Determine module_type
                let moduleType = params.module_type || params.type;
                if (moduleType && moduleType.toUpperCase() === 'PITLINE') {
                    // Safe PitLine detection
                } else {
                    // Existing fallback logic
                    moduleType = 'wsp';
                    if (params.categoryName === 'Amenity') moduleType = 'amenity';
                    if (params.categoryName === 'Pit Line Examination') moduleType = 'pitline';
                    if (params.categoryName === 'WSP Examination') moduleType = 'wsp';
                }

                const res = await autosaveInspection({
                    module_type: moduleType,
                    session_id: params.session_id,
                    train_id: params.train_id,
                    coach_id: params.coach_id,
                    question_id: qId,
                    status: data.status,
                    remarks: data.remarks,
                    reason_ids: data.reasons,
                    photo_url: data.photo_url || data.image_path,
                    compartment_id: params.compartment_id || params.compartment || 'NA',
                    subcategory_id: params.subcategory_id || 0,
                    activity_type: params.activity_type || params.activityType || 'Major'
                });

                if (res && res.success === true) {
                    setSaveStatus('saved');
                } else {
                    setSaveStatus('error');
                }
            } catch (err) {
                console.error('AutoSave Error:', err);
                setSaveStatus('error');
            }
        }, 1000);
    };

    const updateAnswer = (qId, data) => {
        if (!qId) return;
        const key = getAnswerKey(qId);
        setDraft(prev => ({
            ...prev,
            answers: { ...(prev?.answers || {}), [key]: data }
        }));
        triggerAutoSave(qId, data);
    };

    const currentAnswers = draft?.answers || {};

    const selectedCategory = params.category_name || params.categoryName || params.area_name;
    const selectedSeverity = params.activity_type || params.activityType;

    // 1. Update Question Filtering Logic:
    const isUndergear = selectedCategory?.toLowerCase() === 'undergear' || Number(params.subcategory_id || params.subcategoryId) === 179;

    const safeQuestions = Array.isArray(questions) ? questions : [];

    const filteredQuestions = isUndergear
        ? safeQuestions
        : safeQuestions.flatMap(group => group?.questions || []).filter(q => {
            if (!selectedSeverity) return true;
            return q?.activity_type === selectedSeverity;
        });

    let filteredGroups = [];
    if (isUndergear) {
        filteredGroups = [
            {
                title: 'UNDERGEAR',
                data: filteredQuestions || []
            }
        ];
    } else {
        filteredGroups = safeQuestions.map(group => {
            if (!group?.questions) return group;
            const filteredQ = group.questions.filter(q => {
                if (!selectedSeverity) return true;
                return q?.activity_type === selectedSeverity;
            });
            return { ...group, questions: filteredQ };
        }).filter(g => g?.questions?.length > 0);
    }

    // Flattening handled above for Undergear

    const qList = filteredQuestions || [];
    const ansMap = currentAnswers || {};
    const currentQIds = qList.map(q => {
        try {
            return q?.id?.toString();
        } catch (e) {
            console.error('[CURRENT QIDS ERROR]', e, 'q:', q);
            return null;
        }
    }).filter(Boolean);

    // FIXED: Define relevantAnswers in scope for both validation and render
    const relevantAnswers = Object.entries(ansMap).filter(([key, ans]) => {
        try {
            const parts = key.split('_');
            const qId = parts.length > 1 ? parts[1] : parts[0];
            const comp = parts.length > 1 ? parts[0] : null;

            return currentQIds.includes(qId) &&
                comp === (params.compartment || null) &&
                (ans?.status || ans?.observed_value);
        } catch (e) {
            console.error('[RELEVANT ANSWERS ERROR]', e, 'key:', key);
            return false;
        }
    });

    const countCompleted = qList.filter(q => {
        try {
            if (!q) return false;
            const ans = ansMap[getAnswerKey(q.id)];
            return ans && (ans.status || ans.observed_value);
        } catch (e) {
            console.error('[COUNT COMPLETED ERROR]', e, 'q:', q);
            return false;
        }
    }).length;

    const totalQs = qList.length;

    // Calculate answeredCount following TRUE completion rules
    const answeredCount = qList.filter(q => {
        const ans = ansMap[getAnswerKey(q.id)];
        return ans && ans.status; // True completion requires a status selected
    }).length;

    const progress = totalQs > 0 ? (answeredCount / totalQs) * 100 : 0;

    const goSummary = () => {
        const invalidDeficiency = relevantAnswers.find(([key, ans]) => {
            if (!ans) return false;
            const missingReason = !ans.reasons || ans.reasons.length === 0;
            const missingImage = !ans.image_path;
            const missingRemark = !ans.remarks || !ans.remarks.trim();

            const hasProblem = ans.status === 'DEFICIENCY' && (missingReason || missingImage || missingRemark);
            return hasProblem;
        });

        if (invalidDeficiency) {
            const [key, ans] = invalidDeficiency;
            const parts = key.split('_');
            const qId = parts.length > 1 ? parts[1] : parts[0];
            const qObj = qList.find(q => q?.id?.toString() === qId);
            const qText = qObj?.question_text || qObj?.text || 'Question';

            let missing = [];
            if (!ans?.reasons || ans.reasons.length === 0) missing.push('Reasons');
            if (!ans?.remarks) missing.push('Remarks');
            if (!ans?.image_path) missing.push('a Photo');

            Alert.alert(
                'Missing Information',
                `Question: "${qText.substring(0, 40)}..."\n\nRequires: ${missing.join(', ')}.`
            );
            return;
        }

        navigation.navigate('SummaryScreen', { ...params });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    const isWsp = params.categoryName === 'WSP Examination' || params.mode === 'WSP';

    if (!Array.isArray(questions)) {
        console.error('Questions is not an array');
        return null;
    }

    if (!filteredGroups) {
        return null;
    }

    const headerTitle = isUndergear
        ? 'Undergear'
        : params.subcategoryName || 'Checklist';

    return (
        <View style={styles.container}>
            <AppHeader
                title={headerTitle}
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.stickyHeader}>
                <View style={styles.breadcrumbsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbsScroll}>
                        {!isWsp ? (
                            <>
                                <Text style={styles.breadcrumb}>{params.trainName || params.train_number}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>{params.coachNumber || params.coach_number}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>{params.categoryName}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={[styles.breadcrumb, isUndergear && styles.activeBreadcrumb]}>
                                    {params.compartment ? `${params.subcategoryName} (${params.compartment})` : params.subcategoryName}
                                </Text>
                                {!isUndergear && (
                                    <>
                                        <Text style={styles.separator}>›</Text>
                                        <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                                            {params.activityType || params.activity_type}
                                        </Text>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <Text style={styles.breadcrumb}>{params.coachNumber || params.coach_number}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>WSP</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                                    {params.scheduleName || params.schedule_name}
                                </Text>
                            </>
                        )}
                    </ScrollView>
                </View>

                <View style={styles.headerFeedback}>
                    <QuestionProgressHeader
                        totalQuestions={totalQs}
                        answeredCount={answeredCount}
                    />
                    <View style={styles.saveIndicator}>
                        {saveStatus === 'saving' && <Text style={styles.savingText}>Saving...</Text>}
                        {saveStatus === 'saved' && <Text style={styles.savedText}>Saved ✓</Text>}
                        {saveStatus === 'error' && <Text style={styles.errorText}>Save Error ❌</Text>}
                    </View>
                </View>

                {/* View Defects Button - Stricter Visibility */}
                {pendingDefectsCount > 0 && (
                    <TouchableOpacity
                        style={styles.defectsHeaderBtn}
                        onPress={() => navigation.navigate('Defects', {
                            session_id: params.session_id || params.sessionId,
                            module_type: (params.module_type || params.type || '').toLowerCase().includes('wsp') ? 'wsp' : (params.module_type || params.type || 'generic'),
                            coach_number: params.coach_number || params.coachNumber,
                            mode: params.mode,
                            category_name: params.category_name || params.categoryName,
                            subcategory_id: params.subcategory_id || params.subcategoryId,
                            schedule_id: params.schedule_id || params.scheduleId,
                            compartment_id: params.compartment_id || params.compartment
                        })}
                    >
                        <Ionicons name="warning-outline" size={18} color="#ef4444" />
                        <Text style={styles.defectsBtnText}>View Defects ({pendingDefectsCount})</Text>
                    </TouchableOpacity>
                )}
            </View>

            {console.log('QUESTIONS STATE:', questions)}
            {isUndergear ? (
                <ScrollView
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={onRefresh}
                            colors={[COLORS.secondary]}
                        />
                    }
                >
                    {questions?.map((q, index) => (
                        <QuestionCard
                            key={q.id || index}
                            question={q}
                            session_id={params.session_id || params.sessionId}
                            module_type={params.module_type || params.type}
                            train_id={params.train_id}
                            coach_id={params.coach_id}
                            answerData={currentAnswers[getAnswerKey(q.id)]}
                            onUpdate={(data) => updateAnswer(q.id, data)}
                            isDraft={true}
                        />
                    ))}
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={onRefresh}
                            colors={[COLORS.secondary]}
                        />
                    }
                >
                    {questions?.map((group, groupIndex) => (
                        <View key={groupIndex} style={{ marginBottom: 20 }}>
                            <Text style={{
                                fontSize: 16,
                                fontWeight: 'bold',
                                marginBottom: 8
                            }}>
                                {group.item_name}
                            </Text>

                            {group.questions?.map((q, index) => (
                                <QuestionCard
                                    key={q.id || index}
                                    question={q}
                                    session_id={params.session_id || params.sessionId}
                                    module_type={params.module_type || params.type}
                                    train_id={params.train_id}
                                    coach_id={params.coach_id}
                                    answerData={currentAnswers[getAnswerKey(q.id)]}
                                    onUpdate={(data) => updateAnswer(q.id, data)}
                                    isDraft={true}
                                />
                            ))}
                        </View>
                    ))}
                </ScrollView>
            )}

            <View style={styles.bottomButtons}>
                <TouchableOpacity
                    style={[styles.checkpointBtn, savingCheckpoint && { opacity: 0.7 }]}
                    onPress={async () => {
                        try {
                            setSavingCheckpoint(true);
                            // Determine module_type
                            let moduleType = 'wsp';
                            if (params.categoryName === 'Amenity') moduleType = 'amenity';
                            if (params.categoryName === 'Pit Line Examination') moduleType = 'pitline';

                            await saveInspectionCheckpoint({
                                module_type: moduleType,
                                session_id: params.sessionId,
                                answers: relevantAnswers.map(([key, data]) => {
                                    const parts = key.split('_');
                                    const qId = parts.length > 1 ? parts[1] : parts[0];
                                    return {
                                        question_id: qId,
                                        compartment_id: params.compartment || 'NA',
                                        subcategory_id: params.subcategoryId || 0,
                                        activity_type: params.activityType || 'Major',
                                        ...data
                                    };
                                })
                            });
                            Alert.alert('Checkpoint', 'Session checkpoint saved successfully.');
                        } catch (e) {
                            console.error('Checkpoint Error:', e);
                            Alert.alert('Error', 'Failed to save checkpoint.');
                        } finally {
                            setSavingCheckpoint(false);
                        }
                    }}
                    disabled={savingCheckpoint}
                >
                    <Text style={styles.checkpointBtnText}>SAVE CHECKPOINT</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitBtn} onPress={goSummary}>
                    <Text style={styles.submitText}>Review Inspection ({relevantAnswers.length})</Text>
                </TouchableOpacity>
            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    stickyHeader: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3
    },
    breadcrumbsContainer: {
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        marginBottom: SPACING.sm
    },
    breadcrumbsScroll: {
        alignItems: 'center',
        paddingRight: SPACING.xl
    },
    breadcrumb: { fontSize: 12, color: COLORS.textSecondary },
    separator: { fontSize: 12, color: COLORS.placeholder, marginHorizontal: SPACING.xs },
    activeBreadcrumb: { color: COLORS.secondary, fontWeight: 'bold' },
    headerFeedback: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.xs
    },
    saveIndicator: { marginLeft: SPACING.md, minWidth: 60 },
    savingText: { color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 11 },
    savedText: { color: COLORS.success, fontWeight: 'bold', fontSize: 11 },
    errorText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 11 },
    defectsHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.danger,
        marginTop: SPACING.md,
        gap: SPACING.sm,
        elevation: 1
    },
    defectsBtnText: {
        color: COLORS.danger,
        fontWeight: 'bold',
        fontSize: 14
    },
    list: { padding: SPACING.lg, paddingBottom: 180 },
    groupContainer: { marginBottom: SPACING.xl },
    itemHeader: {
        backgroundColor: '#f8fafc',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        marginBottom: SPACING.md,
        borderRadius: RADIUS.sm
    },
    itemHeaderText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        textTransform: 'uppercase'
    },
    bottomButtons: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        gap: SPACING.sm
    },
    checkpointBtn: {
        backgroundColor: COLORS.warning,
        paddingVertical: 14,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        elevation: 1
    },
    checkpointBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    submitBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
    },
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyText: { marginTop: SPACING.lg, color: COLORS.textSecondary, fontSize: 16, fontWeight: '500' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default QuestionsScreen;
