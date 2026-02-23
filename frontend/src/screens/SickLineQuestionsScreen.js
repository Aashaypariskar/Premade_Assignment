import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getSickLineQuestions, saveSickLineAnswers, getSickLineProgress } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import QuestionCard from '../components/QuestionCard';
import { useStore } from '../store/StoreContext';
import { normalizeQuestionResponse } from '../utils/normalization';

const SickLineQuestionsScreen = ({ route, navigation }) => {
    const { sessionId, coachNumber, compartmentId, subcategoryId, subcategoryName, status, subcategories, currentIndex } = route.params;
    const { user } = useStore();
    const [majorQs, setMajorQs] = useState([]);
    const [minorQs, setMinorQs] = useState([]);
    const [activeTab, setActiveTab] = useState('Major');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [guidedBtns, setGuidedBtns] = useState(null);
    const [isMajorDone, setIsMajorDone] = useState(false);
    const [isMinorDone, setIsMinorDone] = useState(false);
    const fetchRef = useRef(null);
    const [supportsActivityType, setSupportsActivityType] = useState(true);

    const isLocked = status === 'COMPLETED';
    const [answers, setAnswers] = useState({});

    const refreshProgress = async () => {
        try {
            const prog = await getSickLineProgress(coachNumber);
            if (prog?.perAreaStatus) {
                const area = prog.perAreaStatus.find(a => a.subcategory_id === subcategoryId);
                if (area) {
                    setIsMajorDone(area.hasMajor);
                    setIsMinorDone(area.hasMinor);
                    return area;
                }
            }
        } catch (err) {
            console.log('Progress Refresh Error:', err);
        }
        return null;
    };

    useEffect(() => {
        const key = `${subcategoryId}-${activeTab}`;
        if (fetchRef.current === key) return;
        fetchRef.current = key;

        let isMounted = true;

        const load = async () => {
            try {
                setLoading(true);
                // State Reset
                setMajorQs([]);
                setMinorQs([]);

                console.log(`[FETCHING QUESTIONS] SickLine - Subcategory: ${subcategoryId}, Tab: ${activeTab}`);

                const response = await getSickLineQuestions(subcategoryId, activeTab);

                if (!isMounted) return;

                console.log(`[RAW QUESTIONS RESPONSE - ${activeTab}]`, response);

                const normalized = normalizeQuestionResponse(response);
                setSupportsActivityType(normalized.supportsActivityType);

                if (activeTab === 'Major') {
                    setMajorQs(normalized.groups.flatMap(g => g.questions || []));
                } else if (activeTab === 'Minor') {
                    setMinorQs(normalized.groups.flatMap(g => g.questions || []));
                } else {
                    setMajorQs(normalized.groups.flatMap(g => g.questions || []));
                }

                await refreshProgress();
            } catch (err) {
                console.error("[QUESTION FETCH ERROR]", err);
                if (isMounted) {
                    Alert.alert('Error', 'Failed to load questions');
                    setMajorQs([]);
                    setMinorQs([]);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [subcategoryId, activeTab]);

    const handleAnswerUpdate = (qId, data) => {
        setAnswers(prev => ({ ...prev, [qId]: data }));
    };

    const validate = () => {
        const currentQs = activeTab === 'Major' ? majorQs : minorQs;
        for (const q of currentQs) {
            const ans = answers[q.id];
            if (!ans || !ans.status) return { valid: false, msg: `Status is required for "${q.text}".` };
            if (ans.status === 'DEFICIENCY') {
                const hasReasons = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                const hasRemarks = ans.remarks && ans.remarks.trim().length > 0;
                const hasPhoto = !!ans.image_path;
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
            const currentQs = activeTab === 'Major' ? majorQs : minorQs;
            const answeredQs = currentQs.filter(q => answers[q.id]?.status);

            for (const q of answeredQs) {
                const ans = answers[q.id];
                const payload = {
                    session_id: sessionId.toString(),
                    compartment_id: compartmentId || 'NA',
                    subcategory_id: subcategoryId.toString(),
                    activity_type: activeTab,
                    question_id: q.id.toString(),
                    status: ans.status,
                    reasons: ans.reasons || [],
                    remarks: ans.remarks || ''
                };

                const formData = new FormData();
                let hasPhoto = false;
                if (ans.image_path && typeof ans.image_path === 'string') {
                    Object.keys(payload).forEach(key => {
                        formData.append(key, key === 'reasons' ? JSON.stringify(payload[key]) : payload[key]);
                    });
                    const cleanUri = ans.image_path.startsWith('file://') ? ans.image_path : `file://${ans.image_path}`;
                    formData.append('photo', { uri: cleanUri, name: cleanUri.split('/').pop() || `photo_${Date.now()}.jpg`, type: 'image/jpeg' });
                    hasPhoto = true;
                }

                await saveSickLineAnswers(hasPhoto ? formData : payload);
            }

            const freshStatus = await refreshProgress();
            if (freshStatus) {
                if (freshStatus.hasMajor && freshStatus.hasMinor) {
                    setGuidedBtns('TO_NEXT');
                } else if (!freshStatus.hasMajor) {
                    setGuidedBtns('TO_MAJOR');
                } else if (!freshStatus.hasMinor) {
                    setGuidedBtns('TO_MINOR');
                }
            }
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
                <Text style={styles.headerSub}>{subcategoryName} {supportsActivityType ? `- ${activeTab}` : ''}</Text>
                <View style={{ width: 26 }} />
            </View>

            {supportsActivityType && (
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Major' && styles.activeTab]}
                        onPress={() => setActiveTab('Major')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Major' && styles.activeTabText]}>
                            MAJOR {isMajorDone && '✓'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'Minor' && styles.activeTab]}
                        onPress={() => setActiveTab('Minor')}
                    >
                        <Text style={[styles.tabText, activeTab === 'Minor' && styles.activeTabText]}>
                            MINOR {isMinorDone && '✓'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scroll}>
                {Array.isArray(activeTab === 'Major' ? majorQs : minorQs) && (activeTab === 'Major' ? majorQs : minorQs).length > 0 ? (
                    (activeTab === 'Major' ? majorQs : minorQs).map(renderQuestion)
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="information-circle-outline" size={48} color="#94a3b8" />
                        <Text style={styles.emptyText}>No questions available for this selection.</Text>
                    </View>
                )}

                {guidedBtns && (
                    <View style={styles.guidedBox}>
                        {guidedBtns === 'TO_MAJOR' && (
                            <TouchableOpacity style={styles.guideBtn} onPress={() => { setActiveTab('Major'); setGuidedBtns(null); }}>
                                <Text style={styles.guideBtnText}>Continue to Major</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                        {guidedBtns === 'TO_MINOR' && (
                            <TouchableOpacity style={styles.guideBtn} onPress={() => { setActiveTab('Minor'); setGuidedBtns(null); }}>
                                <Text style={styles.guideBtnText}>Continue to Minor</Text>
                                <Ionicons name="arrow-forward" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                        {guidedBtns === 'TO_NEXT' && (
                            <TouchableOpacity style={[styles.guideBtn, { backgroundColor: '#10b981' }]} onPress={() => {
                                const nextIndex = currentIndex + 1;

                                if (subcategories && nextIndex < subcategories.length) {
                                    const nextArea = subcategories[nextIndex];

                                    navigation.replace('SickLineQuestions', {
                                        ...route.params,
                                        subcategoryId: nextArea.id,
                                        subcategoryName: nextArea.name,
                                        currentIndex: nextIndex
                                    });
                                } else {
                                    navigation.navigate('SickLineDashboard', { ...route.params });
                                }
                            }}>
                                <Text style={styles.guideBtnText}>Go to Next Area</Text>
                                <Ionicons name="apps-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.saveBtn, isLocked && { backgroundColor: '#f1f5f9' }, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving || isLocked}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={[styles.saveBtnText, isLocked && { color: '#94a3b8' }]}>
                            {isLocked ? 'Inspection Completed (Read-Only)' : 'Save & Sync'}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, paddingHorizontal: 20, marginBottom: 10 },
    headerSub: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', margin: 20, borderRadius: 12, padding: 4, elevation: 2 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#2563eb' },
    tabText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
    activeTabText: { color: '#fff' },
    scroll: { padding: 20, paddingBottom: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
    emptyText: { marginTop: 10, color: '#64748b', fontSize: 14, textAlign: 'center' },
    saveBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, elevation: 4 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    guidedBox: { marginTop: 10, marginBottom: 20, padding: 15, backgroundColor: '#fff', borderRadius: 16, borderLeftWidth: 5, borderLeftColor: '#2563eb', elevation: 2 },
    guideBtn: { backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 10 },
    guideBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default SickLineQuestionsScreen;
