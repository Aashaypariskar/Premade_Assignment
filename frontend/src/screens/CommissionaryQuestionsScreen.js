import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import { getCommissionaryQuestions, getCommissionaryAnswers, saveCommissionaryAnswers, getCommissionaryProgress } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import QuestionCard from '../components/QuestionCard';
import { useStore } from '../store/StoreContext';
import { normalizeQuestionResponse } from '../utils/normalization';

const CommissionaryQuestionsScreen = ({ route, navigation }) => {
    const { sessionId, coachNumber, compartmentId, subcategoryId, subcategoryName, status, subcategories, currentIndex } = route.params;
    const { user } = useStore();
    const [majorQs, setMajorQs] = useState([]);
    const [minorQs, setMinorQs] = useState([]);
    const [activeTab, setActiveTab] = useState('Major'); // Default to Major
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [guidedBtns, setGuidedBtns] = useState(null); // 'TO_MAJOR', 'TO_MINOR', 'TO_NEXT'
    const [isMajorDone, setIsMajorDone] = useState(false);
    const [isMinorDone, setIsMinorDone] = useState(false);
    const fetchRef = useRef(null);
    const [supportsActivityType, setSupportsActivityType] = useState(true);

    const isLocked = status === 'COMPLETED';

    // answers: { questionId: { answer, reason, photo_url } }
    const [answers, setAnswers] = useState({});
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        const key = `${subcategoryId}-${activeTab}`;
        if (fetchRef.current === key) return;
        fetchRef.current = key;

        let isMounted = true;

        const load = async () => {
            try {
                setLoading(true);
                // State Reset: Clear existing questions before fetch
                setMajorQs([]);
                setMinorQs([]);

                console.log(`[FETCHING QUESTIONS] Commissionary - Subcategory: ${subcategoryId}, Tab: ${activeTab}`);

                // Single fetch model: Fetch questions and existing answers concurrently
                const [response, savedAnswers] = await Promise.all([
                    getCommissionaryQuestions(subcategoryId, activeTab),
                    getCommissionaryAnswers(sessionId.toString(), subcategoryId.toString(), activeTab, compartmentId)
                ]);

                if (!isMounted) return;

                // Prefill existing answers
                const mappedAnswers = {};
                if (savedAnswers && Array.isArray(savedAnswers)) {
                    savedAnswers.forEach(ans => {
                        mappedAnswers[ans.question_id] = {
                            status: ans.status,
                            reasons: ans.reasons || [],
                            remarks: ans.remarks || '',
                            image_path: ans.photo_url || null
                        };
                    });
                }
                setAnswers(mappedAnswers);
                setIsDirty(false);

                console.log(`[RAW QUESTIONS RESPONSE - ${activeTab}]`, response);

                const normalized = normalizeQuestionResponse(response);
                setSupportsActivityType(normalized.supportsActivityType);

                if (activeTab === 'Major') {
                    setMajorQs(normalized.groups.flatMap(g => g.questions || []));
                } else if (activeTab === 'Minor') {
                    setMinorQs(normalized.groups.flatMap(g => g.questions || []));
                } else {
                    // Fallback for subcategories without specific tab logic
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

    const refreshProgress = async () => {
        try {
            const prog = await getCommissionaryProgress(coachNumber);
            if (prog?.perAreaStatus) {
                const area = prog.perAreaStatus.find(a => a.subcategory_id === subcategoryId);
                if (area) {
                    const compStatus = area.compartmentStatus?.[compartmentId] || { major: false, minor: false };
                    setIsMajorDone(compStatus.major);
                    setIsMinorDone(compStatus.minor);
                    return compStatus;
                }
            }
        } catch (err) {
            console.log('Progress Refresh Error:', err);
        }
        return null;
    };

    const handleAnswerUpdate = (qId, data) => {
        setIsDirty(true);
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
                    compartment_id: compartmentId,
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
                    formData.append('photo', { uri: cleanUri, name: cleanUri.split('/').pop(), type: 'image/jpeg' });
                    hasPhoto = true;
                }

                await saveCommissionaryAnswers(hasPhoto ? formData : payload);
            }

            const freshStatus = await refreshProgress();
            if (freshStatus) {
                if (freshStatus.major && freshStatus.minor) {
                    setGuidedBtns('TO_NEXT');
                } else if (!freshStatus.major) {
                    setGuidedBtns('TO_MAJOR');
                } else if (!freshStatus.minor) {
                    setGuidedBtns('TO_MINOR');
                }
            }
            setIsDirty(false);
            Alert.alert('Success', 'Answers saved successfully.');
        } catch (err) {
            console.error('Save Error:', err);
            Alert.alert('Error', 'Failed to save answers.');
        } finally {
            setSaving(false);
        }
    };

    const navigateToNext = () => {
        const nextIndex = currentIndex + 1;
        if (subcategories && nextIndex < subcategories.length) {
            const nextArea = subcategories[nextIndex];
            navigation.replace('CommissionaryQuestions', {
                ...route.params,
                subcategoryId: nextArea.id,
                subcategoryName: nextArea.name,
                currentIndex: nextIndex
            });
        } else {
            navigation.navigate('CommissionaryDashboard', { ...route.params });
        }
    };

    const currentQs = activeTab === 'Major' ? majorQs : minorQs;
    const allAnswered = currentQs.length > 0 && currentQs.every(q => answers[q.id]?.status);

    let btnText = 'Save & Sync';
    let btnAction = handleSave;

    if (isLocked) {
        btnText = 'Inspection Completed (Read-Only)';
    } else if (allAnswered && !isDirty) {
        btnText = activeTab === 'Major' ? 'Go To Minor' : 'Go To Next Area';
        btnAction = () => {
            if (activeTab === 'Major') setActiveTab('Minor');
            else navigateToNext();
        };
    } else if (isDirty) {
        btnText = activeTab === 'Major' ? 'Save & Sync & Go To Minor' : 'Save & Sync & Go To Next Area';
        btnAction = async () => {
            await handleSave();
            if (activeTab === 'Major') setActiveTab('Minor');
            else navigateToNext();
        };
    }

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
                <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
                    <Ionicons name="home-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerSub}>{subcategoryName} - {activeTab} ({compartmentId})</Text>
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

                                    navigation.replace('CommissionaryQuestions', {
                                        ...route.params,
                                        subcategoryId: nextArea.id,
                                        subcategoryName: nextArea.name,
                                        currentIndex: nextIndex
                                    });
                                } else {
                                    navigation.navigate('CommissionaryDashboard', { ...route.params });
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
                    onPress={btnAction}
                    disabled={saving || isLocked}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={[styles.saveBtnText, isLocked && { color: '#94a3b8' }]}>
                            {btnText}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {
                user?.role === 'Admin' && supportsActivityType && (
                    <TouchableOpacity
                        style={styles.adminEditFab}
                        onPress={() => navigation.navigate('QuestionManagement', {
                            activityId: activeTab === 'Major' ? majorQs[0]?.activity_id : minorQs[0]?.activity_id,
                            activityType: activeTab,
                            categoryName: 'Coach Commissionary'
                        })}
                    >
                        <Ionicons name="settings" size={20} color="#fff" />
                        <Text style={styles.fabText}>Edit Questions</Text>
                    </TouchableOpacity>
                )
            }
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

    saveBtn: {
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        elevation: 4
    },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    guidedBox: {
        marginTop: 10,
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderLeftWidth: 5,
        borderLeftColor: '#2563eb',
        elevation: 2
    },
    guideBtn: {
        backgroundColor: '#2563eb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 10
    },
    guideBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

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
        elevation: 10
    },
    fabText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 8
    }
});

export default CommissionaryQuestionsScreen;
