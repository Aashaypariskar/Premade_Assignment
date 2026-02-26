import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getSickLineQuestions,
    getSickLineAnswers,
    getSickLineProgress,
    autosaveInspection,
    saveInspectionCheckpoint,
    submitSickLineInspection
} from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import QuestionCard from '../components/QuestionCard';
import { useStore } from '../store/StoreContext';
import { normalizeQuestionResponse } from '../utils/normalization';
import QuestionProgressHeader from '../components/QuestionProgressHeader';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const SickLineQuestionsScreen = ({ route, navigation }) => {
    const {
        session_id,
        coach_id,
        coach_number,
        category_name,
        status = 'IN_PROGRESS'
    } = route?.params || {};

    const sessionId = session_id;
    const coachId = coach_id;
    const coachName = coach_number;
    const { user } = useStore();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState({ answeredCount: 0, totalQuestions: 0 });
    const isMounted = useRef(true);

    const isLocked = status === 'SUBMITTED' || status === 'COMPLETED';
    const [answers, setAnswers] = useState({});
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
    const [pendingDefectsCount, setPendingDefectsCount] = useState(0);
    const autoSaveTimer = useRef(null);

    const refreshProgress = async () => {
        try {
            const prog = await getSickLineProgress(sessionId);
            if (prog && prog.totalQuestions !== undefined) {
                setProgress({
                    answeredCount: prog.answeredCount || 0,
                    totalQuestions: prog.totalQuestions || 0
                });
            }
        } catch (err) {
            console.log('Progress Refresh Error:', err);
        }
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setGroups([]);

            console.log(`[SICKLINE] Loading single checklist questions for coach ${coachName}`);

            const [response, savedAnswers] = await Promise.all([
                getSickLineQuestions({ coach_id: coachId }),
                getSickLineAnswers((sessionId || 'NA').toString())
            ]);

            if (!isMounted.current) return;

            const mappedAnswers = {};
            if (savedAnswers && Array.isArray(savedAnswers)) {
                savedAnswers.forEach(ans => {
                    mappedAnswers[ans.question_id] = {
                        status: ans.status,
                        reasons: ans.reasons || [],
                        remarks: ans.remarks || '',
                        photo_url: ans.photo_url || null,
                        resolved: ans.resolved,
                        after_photo_url: ans.after_photo_url,
                        resolution_remark: ans.resolution_remark
                    };
                });
            }
            setAnswers(mappedAnswers);
            setIsDirty(false);

            // Calculate pending defects count
            const pendingCount = Object.values(mappedAnswers).filter(a =>
                a.status === 'DEFICIENCY' && Number(a.resolved) === 0
            ).length;
            setPendingDefectsCount(pendingCount);

            setGroups(Array.isArray(response) ? response : []);

            await refreshProgress();
        } catch (err) {
            console.error("[QUESTION FETCH ERROR]", err);
            if (isMounted.current) {
                Alert.alert('Error', 'Failed to load questions');
            }
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [sessionId]);

    useFocusEffect(
        useCallback(() => {
            isMounted.current = true;
            loadData();
            return () => {
                isMounted.current = false;
            };
        }, [loadData])
    );

    const triggerAutoSave = (qId, data) => {
        if (isLocked) return;

        setSaveStatus('saving');
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            try {
                await autosaveInspection({
                    module_type: 'sickline',
                    session_id: sessionId,
                    question_id: qId,
                    status: data.status,
                    remarks: data.remarks,
                    reason_ids: data.reasons,
                    photo_url: data.photo_url
                });
                setSaveStatus('saved');
                refreshProgress();
            } catch (err) {
                console.error('AutoSave Error:', err);
                setSaveStatus('error');
            }
        }, 1000);
    };

    const handleAnswerUpdate = (qId, data) => {
        setAnswers(prev => ({ ...prev, [qId]: data }));
        triggerAutoSave(qId, data);
    };

    const validate = () => {
        const flatQs = groups.flatMap(g => g.questions || []);
        for (const q of flatQs) {
            const ans = answers[q.id];
            if (!ans || !ans.status) return { valid: false, msg: `Status is required for "${q.text}".` };
            if (ans.status === 'DEFICIENCY') {
                const hasReasons = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                const hasRemarks = ans.remarks && ans.remarks.trim().length > 0;
                const hasPhoto = !!ans.image_path || !!ans.photo_url;
                if (!hasReasons || !hasRemarks || !hasPhoto) {
                    let missing = [];
                    if (!hasReasons) missing.push('Reasons');
                    if (!hasRemarks) missing.push('Remarks');
                    if (!hasPhoto) missing.push('Photo');
                    return { valid: false, msg: `"${q.text}" requires: ${missing.join(', ')} for DEFICIENCY.` };
                }
            }
        }
        return { valid: true };
    };

    const handleSave = async () => {
        const check = validate();
        if (!check.valid) {
            Alert.alert('Validation Error', check.msg);
            return;
        }

        setSaving(true);
        try {
            const flatQs = groups.flatMap(g => g.questions || []);
            const answeredQs = flatQs.filter(q => answers[q.id]?.status);

            for (const q of answeredQs) {
                const ans = answers[q.id];
                const payload = {
                    session_id: (sessionId || 'NA').toString(),
                    question_id: (q.id || 'NA').toString(),
                    status: ans.status,
                    reasons: ans.reasons || [],
                    remarks: ans.remarks || ''
                };

                const formData = new FormData();
                let hasPhoto = false;
                if (ans.image_path && typeof ans.image_path === 'string') {
                    if (ans.image_path.startsWith('http')) {
                        payload.photo_url = ans.image_path;
                    } else {
                        Object.keys(payload).forEach(key => {
                            formData.append(key, key === 'reasons' ? JSON.stringify(payload[key]) : payload[key]);
                        });
                        const cleanUri = ans.image_path.startsWith('file://') ? ans.image_path : `file://${ans.image_path}`;
                        formData.append('photo', { uri: cleanUri, name: cleanUri.split('/').pop() || `photo_${Date.now()}.jpg`, type: 'image/jpeg' });
                        hasPhoto = true;
                    }
                }

                await saveSickLineAnswers(hasPhoto ? formData : payload);
            }

            await refreshProgress();
            setIsDirty(false);
            Alert.alert('Success', 'Answers saved successfully.');
        } catch (err) {
            console.error('Save Error:', err);
            Alert.alert('Error', 'Failed to save answers.');
        } finally {
            setSaving(false);
        }
    };

    const renderQuestion = (q) => (
        <QuestionCard
            key={q.id}
            question={q}
            answerData={answers[q.id]}
            onUpdate={(data) => handleAnswerUpdate(q.id, data)}
            readOnly={isLocked}
        />
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="Sick Line Examination"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
                rightComponent={user?.role === 'Admin' && (
                    <TouchableOpacity
                        style={styles.editQuestionsBtn}
                        onPress={() => navigation.navigate('QuestionManagement', {
                            category_name: 'Sick Line Examination',
                            activity_type: 'NA',
                            subcategory_id: 'NA'
                        })}
                    >
                        <Ionicons name="settings-outline" size={18} color={COLORS.secondary} />
                    </TouchableOpacity>
                )}
            />

            <View style={styles.content}>
                <View style={styles.badgeRow}>
                    <View style={styles.badge}><Text style={styles.badgeText}>COACH: {coachName}</Text></View>
                    <View style={[styles.badge, styles.activeBadge]}>
                        <Text style={[styles.badgeText, { color: '#fff' }]}>Sick Line</Text>
                    </View>
                </View>

                <View style={styles.headerFeedback}>
                    <QuestionProgressHeader
                        totalQuestions={progress.totalQuestions}
                        answeredCount={progress.answeredCount}
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
                            session_id: session_id,
                            module_type: 'sickline',
                            coach_number: coach_number
                        })}
                    >
                        <Ionicons name="warning-outline" size={18} color="#ef4444" />
                        <Text style={styles.defectsBtnText}>View Defects ({pendingDefectsCount})</Text>
                    </TouchableOpacity>
                )}

                <ScrollView contentContainerStyle={styles.list}>
                    {groups.length > 0 ? (
                        groups.map((group, gIdx) => (
                            <View key={group.item_name || gIdx}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitleText}>{group.item_name || 'General'}</Text>
                                </View>
                                {group.questions.map(renderQuestion)}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="information-circle-outline" size={48} color="#94a3b8" />
                            <Text style={styles.emptyText}>No questions available for SS1-C.</Text>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.bottomButtons}>
                    <TouchableOpacity
                        style={[styles.checkpointBtn, isLocked && styles.disabledBtn]}
                        onPress={async () => {
                            try {
                                setSaving(true);
                                await saveInspectionCheckpoint({
                                    module_type: 'sickline',
                                    session_id: sessionId,
                                    answers: Object.entries(answers).map(([id, data]) => ({
                                        question_id: id,
                                        ...data
                                    }))
                                });
                                Alert.alert('Checkpoint', 'Session checkpoint saved successfully.');
                            } catch (e) {
                                Alert.alert('Error', 'Failed to save checkpoint.');
                            } finally {
                                setSaving(false);
                            }
                        }}
                        disabled={saving || isLocked}
                    >
                        <Text style={styles.checkpointBtnText}>SAVE CHECKPOINT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.submitBtn, isLocked && styles.disabledBtn]}
                        onPress={() => {
                            Alert.alert(
                                'Final Submit',
                                'Are you sure? This will lock the inspection for further editing.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Submit',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                setSaving(true);
                                                await submitSickLineInspection(sessionId);
                                                Alert.alert('Success', 'Inspection submitted successfully.');
                                                navigation.goBack();
                                            } catch (e) {
                                                Alert.alert('Error', 'Submission failed.');
                                            } finally {
                                                setSaving(false);
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                        disabled={saving || isLocked}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>FINAL SUBMIT</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, paddingHorizontal: SPACING.lg },
    badgeRow: { flexDirection: 'row', paddingVertical: SPACING.md, gap: SPACING.sm },
    badge: { backgroundColor: COLORS.disabled, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.md },
    activeBadge: { backgroundColor: COLORS.secondary },
    badgeText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textSecondary },
    headerFeedback: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginBottom: SPACING.md
    },
    saveIndicator: { marginLeft: 10, minWidth: 60 },
    savingText: { color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 11 },
    savedText: { color: COLORS.success, fontWeight: 'bold', fontSize: 11 },
    errorText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 11 },
    list: { paddingBottom: 120 },
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
        elevation: 2
    },
    checkpointBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
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
    submitText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
    editQuestionsBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center'
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    sectionHeader: { backgroundColor: COLORS.disabled, padding: 12, borderRadius: RADIUS.md, marginVertical: 15, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
    sectionTitleText: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
    emptyText: { marginTop: 10, color: COLORS.placeholder, fontSize: 14, textAlign: 'center' },
    disabledBtn: { backgroundColor: COLORS.disabled, opacity: 0.6 },
    defectsHeaderBtn: { marginTop: 10, marginHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220, 38, 38, 0.08)', borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.danger, gap: 8, elevation: 0 },
    defectsBtnText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 14 }
});

export default SickLineQuestionsScreen;
