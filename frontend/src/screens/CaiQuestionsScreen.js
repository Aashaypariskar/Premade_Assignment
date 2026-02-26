import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getCaiQuestions,
    getCaiAnswers,
    autosaveInspection,
    saveInspectionCheckpoint,
    submitCaiSession,
    getDefects
} from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import QuestionCard from '../components/QuestionCard';
import { useStore } from '../store/StoreContext';
import QuestionProgressHeader from '../components/QuestionProgressHeader';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const CaiQuestionsScreen = ({ route, navigation }) => {
    const { session_id, coach_id, coach_number, category_name } = route.params;
    const sessionId = session_id; // Keeping local for mapping
    const { user } = useStore();

    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('DRAFT');
    const [progress, setProgress] = useState({ answeredCount: 0, totalQuestions: 0 });
    const [pendingDefects, setPendingDefects] = useState(0);

    const isMounted = useRef(true);
    const autoSaveTimer = useRef(null);
    const [saveStatus, setSaveStatus] = useState('saved');

    const isLocked = status === 'SUBMITTED';

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [qs, ansList] = await Promise.all([
                getCaiQuestions(),
                getCaiAnswers(sessionId)
            ]);

            if (!isMounted.current) return;

            // Map answers
            const mappedAnswers = {};
            ansList.forEach(ans => {
                mappedAnswers[ans.question_id] = {
                    status: ans.status,
                    reasons: ans.reason_ids || [],
                    remarks: ans.remarks || '',
                    photo_url: ans.before_photo_url || null,
                    resolved: ans.resolved,
                    after_photo_url: ans.after_photo_url,
                    resolution_remark: ans.resolution_remark
                };
            });
            setAnswers(mappedAnswers);

            // Format questions for QuestionCard
            const formattedQs = qs.map(q => ({
                id: q.id,
                text: `${q.cai_code} ${q.question_text}`,
                original_text: q.question_text,
                cai_code: q.cai_code
            }));
            setQuestions(formattedQs);

            // Initial progress calculation
            calculateProgress(formattedQs, mappedAnswers);
            loadDefectCount();

        } catch (err) {
            console.error("CAI Load Error:", err);
            Alert.alert('Error', 'Failed to load CAI questions');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [sessionId]);

    useFocusEffect(
        useCallback(() => {
            isMounted.current = true;
            // Load both questions/answers and count on focus
            loadData();
            loadDefectCount();
            return () => {
                isMounted.current = false;
            };
        }, [sessionId, loadData])
    );

    const calculateProgress = (qs, ans) => {
        const total = qs.length;
        const answered = qs.filter(q => ans[q.id]?.status).length;
        setProgress({ answeredCount: answered, totalQuestions: total });
    };

    const loadDefectCount = async () => {
        try {
            const res = await getCaiAnswers(sessionId);
            const defects = res.filter(a => a.status === 'DEFICIENCY' && Number(a.resolved) === 0);
            setPendingDefects(defects.length);
        } catch (err) {
            console.log('Defects Count Error:', err);
        }
    };

    const triggerAutoSave = (qId, data) => {
        if (isLocked) return;

        setSaveStatus('saving');
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

        autoSaveTimer.current = setTimeout(async () => {
            try {
                await autosaveInspection({
                    module_type: 'cai',
                    session_id: sessionId,
                    question_id: qId,
                    status: data.status,
                    remarks: data.remarks,
                    reason_ids: data.reasons,
                    photo_url: data.photo_url
                });
                setSaveStatus('saved');
                calculateProgress(questions, { ...answers, [qId]: data });
                loadDefectCount();
            } catch (err) {
                console.error('CAI AutoSave Error:', err);
                setSaveStatus('error');
            }
        }, 1000);
    };

    const handleAnswerUpdate = (qId, data) => {
        setAnswers(prev => ({ ...prev, [qId]: data }));
        triggerAutoSave(qId, data);
    };

    const handleFinalSubmit = async () => {
        // Validation: All questions answered and no pending defects
        if (progress.answeredCount < progress.totalQuestions) {
            return Alert.alert('Incomplete', 'Please answer all questions before final submission.');
        }
        if (pendingDefects > 0) {
            return Alert.alert('Pending Defects', 'Please resolve all deficiencies before final submission.');
        }

        Alert.alert(
            'Final Submit',
            'Are you sure? This will lock the CAI checklist and mark it as submitted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Submit',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            await submitCaiSession(sessionId);
                            setStatus('SUBMITTED');
                            Alert.alert('Success', 'CAI checklist submitted successfully.');
                            navigation.goBack();
                        } catch (err) {
                            Alert.alert('Error', 'Submission failed.');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="CAI Checklist"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.headerInfo}>
                <View style={styles.breadcrumb}>
                    <Text style={styles.breadcrumbText}>Coach: {coach_number} → </Text>
                    <Text style={[styles.breadcrumbText, { fontWeight: 'bold' }]}>{category_name || 'CAI Modifications'}</Text>
                </View>
                <View style={styles.saveIndicator}>
                    {saveStatus === 'saving' && <Text style={styles.savingText}>Saving...</Text>}
                    {saveStatus === 'saved' && <Text style={styles.savedText}>Saved ✓</Text>}
                    {saveStatus === 'error' && <Text style={styles.errorText}>Error ❌</Text>}
                </View>
            </View>

            <QuestionProgressHeader
                totalQuestions={progress.totalQuestions}
                answeredCount={progress.answeredCount}
                color={COLORS.primary}
            />

            {pendingDefects > 0 && (
                <View style={styles.defectsContainer}>
                    <TouchableOpacity
                        style={styles.defectsBtn}
                        onPress={() => navigation.navigate('Defects', {
                            session_id: session_id,
                            module_type: 'cai',
                            coach_number: coach_number
                        })}
                    >
                        <Ionicons name="warning-outline" size={20} color="#fff" />
                        <Text style={styles.defectsBtnText}>View Defects ({pendingDefects})</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scroll}>
                {questions.map(q => (
                    <QuestionCard
                        key={q.id}
                        question={q}
                        answerData={answers[q.id]}
                        onUpdate={(data) => handleAnswerUpdate(q.id, data)}
                        readOnly={isLocked}
                    />
                ))}

                <TouchableOpacity
                    style={[styles.submitBtn, (isLocked || progress.answeredCount < progress.totalQuestions || pendingDefects > 0) && styles.disabledBtn]}
                    onPress={handleFinalSubmit}
                    disabled={saving || isLocked}
                >
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>FINAL SUBMIT</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    breadcrumb: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    breadcrumbText: { fontSize: 13, color: COLORS.textSecondary },
    scroll: { padding: 15, paddingBottom: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    defectsContainer: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: COLORS.surface },
    defectsBtn: { flexDirection: 'row', backgroundColor: COLORS.error, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    defectsBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    submitBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: RADIUS.lg, alignItems: 'center', marginTop: 30, elevation: 4 },
    submitBtnText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
    disabledBtn: { backgroundColor: COLORS.border },
    saveIndicator: { marginLeft: 10 },
    savingText: { color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 12 },
    savedText: { color: COLORS.success, fontWeight: 'bold', fontSize: 12 },
    errorText: { color: COLORS.error, fontWeight: 'bold', fontSize: 12 }
});

export default CaiQuestionsScreen;
