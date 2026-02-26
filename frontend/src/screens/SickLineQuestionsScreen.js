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

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.breadcrumb}>
                    <Text style={styles.breadcrumbText}>Coach: {coachName} → </Text>
                    <Text style={[styles.breadcrumbText, { fontWeight: 'bold' }]}>Sick Line Examination</Text>
                </View>
                {user?.role === 'Admin' ? (
                    <TouchableOpacity
                        style={styles.editQuestionsBtn}
                        onPress={() => navigation.navigate('QuestionManagement', {
                            category_name: 'Sick Line Examination',
                            activity_type: 'NA',
                            subcategory_id: 'NA'
                        })}
                    >
                        <Text style={styles.editQuestionsBtnText}>Edit Questions</Text>
                    </TouchableOpacity>
                ) : <View style={{ width: 26 }} />}

                <View style={styles.saveIndicator}>
                    {saveStatus === 'saving' && <Text style={styles.savingText}>Saving...</Text>}
                    {saveStatus === 'saved' && <Text style={styles.savedText}>Saved ✓</Text>}
                    {saveStatus === 'error' && <Text style={styles.errorText}>Save Error ❌</Text>}
                </View>
            </View>

            <QuestionProgressHeader
                totalQuestions={progress.totalQuestions}
                answeredCount={progress.answeredCount}
            />

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

            <ScrollView contentContainerStyle={styles.scroll}>
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
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>FINAL SUBMIT</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    breadcrumb: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 15 },
    breadcrumbText: { fontSize: 13, color: '#64748b' },
    editQuestionsBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2563eb' },
    editQuestionsBtnText: { fontSize: 11, fontWeight: 'bold', color: '#2563eb' },
    sectionHeader: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, marginVertical: 15, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
    sectionTitleText: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 },
    scroll: { padding: 15, paddingBottom: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
    emptyText: { marginTop: 10, color: '#64748b', fontSize: 14, textAlign: 'center' },
    bottomButtons: { marginTop: 30, gap: 10 },
    checkpointBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
    checkpointBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    submitBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 4 },
    submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    disabledBtn: { backgroundColor: '#f1f5f9', opacity: 0.6 },
    saveIndicator: { position: 'absolute', top: 52, right: 20 },
    savingText: { color: '#64748b', fontStyle: 'italic', fontSize: 12 },
    savedText: { color: '#10b981', fontWeight: 'bold', fontSize: 12 },
    errorText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
    defectsHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ef4444',
        marginTop: 10,
        gap: 8,
        elevation: 2
    },
    defectsBtnText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 14
    }
});

export default SickLineQuestionsScreen;
