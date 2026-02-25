import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
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
        const subId = params.subcategoryId || params.subcategory_id;
        try {
            setLoading(true);
            setQuestions([]); // State Reset

            console.log(`[FETCHING QUESTIONS] Generic - Subcategory: ${subId}, Activity: ${params.activityId}`);

            let rawResponse;
            if (params.categoryName === 'WSP Examination') {
                rawResponse = await getWspQuestions(params.scheduleId);
            } else {
                rawResponse = await getQuestions(params.activityId, params.scheduleId, subId);
            }

            if (!isMounted.current) return;

            const normalized = normalizeQuestionResponse(rawResponse);
            setQuestions(normalized.groups);

            // Fetch actual pending defects from server
            const moduleType = params.categoryName === 'Amenity' ? 'AMENITY' :
                (params.categoryName === 'Pit Line Examination' ? 'PITLINE' :
                    (params.categoryName === 'WSP Examination' ? 'WSP' : 'GENERIC'));

            const defectsRes = await require('../api/api').getDefects({
                session_id: params.sessionId,
                subcategory_id: params.subcategoryId || params.subcategory_id,
                schedule_id: params.scheduleId || params.schedule_id,
                compartment_id: params.compartment,
                mode: params.mode,
                type: moduleType
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

    useFocusEffect(
        useCallback(() => {
            isMounted.current = true;
            fetchRef.current = null;
            loadData();
            return () => {
                isMounted.current = false;
            };
        }, [loadData])
    );

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
                let moduleType = 'wsp';
                if (params.categoryName === 'Amenity') moduleType = 'amenity';
                if (params.categoryName === 'Pit Line Examination') moduleType = 'pitline';
                if (params.categoryName === 'WSP Examination') moduleType = 'wsp';

                await autosaveInspection({
                    module_type: moduleType,
                    session_id: params.sessionId,
                    question_id: qId,
                    status: data.status,
                    remarks: data.remarks,
                    reason_ids: data.reasons,
                    photo_url: data.photo_url || data.image_path,
                    compartment_id: params.compartment || 'NA',
                    subcategory_id: params.subcategoryId || 0,
                    activity_type: params.activityType || 'Major'
                });
                setSaveStatus('saved');
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

    // Flatten questions for logic/progress since we now guarantee they are grouped
    const flatQuestions = questions.flatMap(group => group.questions || []);

    const qList = flatQuestions || [];
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
            const qText = qObj?.text || 'Question';

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

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <View style={styles.breadcrumbs}>
                        {!isWsp ? (
                            <>
                                <Text style={styles.breadcrumb}>{params.trainName}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>{params.coachNumber}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>{params.categoryName}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>
                                    {params.compartment ? `${params.subcategoryName} (${params.compartment})` : params.subcategoryName}
                                </Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                                    {params.activityType}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.breadcrumb}>{params.coachNumber}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>WSP</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                                    {params.scheduleName}
                                </Text>
                            </>
                        )}
                    </View>
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
                            session_id: params.sessionId,
                            module_type: params.categoryName === 'WSP Examination' ? 'wsp' : 'generic',
                            coach_number: params.coachNumber,
                            mode: params.mode,
                            categoryName: params.categoryName,
                            subcategoryId: params.subcategoryId || params.subcategory_id,
                            scheduleId: params.scheduleId || params.schedule_id,
                            compartment: params.compartment
                        })}
                    >
                        <Ionicons name="warning-outline" size={18} color="#ef4444" />
                        <Text style={styles.defectsBtnText}>View Defects ({pendingDefectsCount})</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {Array.isArray(questions) && questions.length > 0 ? (
                    questions.map((group, gIdx) => (
                        <View key={`group-${gIdx}`} style={styles.groupContainer}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemHeaderText}>{group.item_name || group.item || 'Questions'}</Text>
                            </View>
                            {Array.isArray(group.questions) && group.questions.map((q, idx) => (
                                <QuestionCard
                                    key={q.id || `q-${idx}`}
                                    question={q}
                                    answerData={currentAnswers[getAnswerKey(q.id)]}
                                    onUpdate={(data) => updateAnswer(q.id, data)}
                                    isDraft={true}
                                />
                            ))}
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="information-circle-outline" size={60} color="#94a3b8" />
                        <Text style={styles.emptyText}>No questions available for this area.</Text>
                    </View>
                )}
            </ScrollView>

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
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    stickyHeader: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', elevation: 3 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressText: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
    percent: { fontSize: 13, fontWeight: 'bold', color: '#2563eb' },
    barBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: '#2563eb' },
    list: { padding: 15, paddingBottom: 180 }, // More padding for dual buttons
    bottomButtons: { position: 'absolute', bottom: 20, left: 20, right: 20, gap: 10 },
    checkpointBtn: { backgroundColor: '#f59e0b', paddingVertical: 14, borderRadius: 12, alignItems: 'center', elevation: 2 },
    checkpointBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    submitBtn: { backgroundColor: '#1e293b', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 8 },
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    headerFeedback: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    saveIndicator: { marginLeft: 10, minWidth: 60 },
    savingText: { color: '#64748b', fontStyle: 'italic', fontSize: 10 },
    savedText: { color: '#10b981', fontWeight: 'bold', fontSize: 10 },
    errorText: { color: '#ef4444', fontWeight: 'bold', fontSize: 10 },
    defectsHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ef4444',
        marginTop: 5,
        marginBottom: 10,
        gap: 8,
        elevation: 2
    },
    defectsBtnText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 14
    },
    adminEditFab: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        backgroundColor: '#2563eb',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5
    },
    fabText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 8
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    breadcrumbs: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
    breadcrumb: { fontSize: 11, color: '#64748b' },
    separator: { fontSize: 11, color: '#94a3b8', marginHorizontal: 4 },
    activeBreadcrumb: { color: '#2563eb', fontWeight: 'bold' },
    editQuestionsBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2563eb' },
    editQuestionsBtnText: { fontSize: 11, fontWeight: 'bold', color: '#2563eb' },
    groupContainer: { marginBottom: 20 },
    itemHeader: { backgroundColor: '#f8fafc', paddingVertical: 8, paddingHorizontal: 12, borderLeftWidth: 4, borderLeftColor: '#334155', marginBottom: 10, borderRadius: 4 },
    itemHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#334155', textTransform: 'uppercase' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyText: { marginTop: 15, color: '#64748b', fontSize: 16, fontWeight: '500' }
});

export default QuestionsScreen;
