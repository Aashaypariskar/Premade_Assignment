import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getSickLineQuestions, saveSickLineAnswers, getSickLineProgress } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import QuestionCard from '../components/QuestionCard';
import { useStore } from '../store/StoreContext';

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

    const isLocked = status === 'COMPLETED';
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        loadQuestions();
        refreshProgress();
    }, []);

    const refreshProgress = async () => {
        try {
            const prog = await getSickLineProgress(coachNumber);
            if (prog?.perAreaStatus) {
                const area = prog.perAreaStatus.find(a => a.subcategory_id === subcategoryId);
                if (area) {
                    setIsMajorDone(area.hasMajor);
                    setIsMinorDone(area.hasMinor);
                }
            }
        } catch (err) {
            console.log('Progress Refresh Error:', err);
        }
    };

    const loadQuestions = async () => {
        try {
            const [major, minor] = await Promise.all([
                getSickLineQuestions(subcategoryId, 'Major'),
                getSickLineQuestions(subcategoryId, 'Minor')
            ]);
            const flatten = (data) => data.flatMap(item => item.questions);
            setMajorQs(flatten(major));
            setMinorQs(flatten(minor));
        } catch (err) {
            Alert.alert('Error', 'Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerUpdate = (qId, data) => {
        setAnswers(prev => ({
            ...prev,
            [qId]: data
        }));
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

                try {
                    if (ans.image_path && typeof ans.image_path === 'string') {
                        const formData = new FormData();
                        Object.keys(payload).forEach(key => {
                            if (key === 'reasons') {
                                formData.append(key, JSON.stringify(payload[key]));
                            } else {
                                formData.append(key, payload[key]);
                            }
                        });

                        let cleanUri = ans.image_path;
                        if (!cleanUri.startsWith('file://')) {
                            cleanUri = `file://${cleanUri}`;
                        }

                        const filename = cleanUri.split('/').pop() || `photo_${Date.now()}.jpg`;
                        formData.append('photo', { uri: cleanUri, name: filename, type: 'image/jpeg' });

                        const hasPhoto = formData._parts && formData._parts.some(p => p[0] === 'photo');

                        if (hasPhoto) {
                            await saveSickLineAnswers(formData);
                        } else {
                            await saveSickLineAnswers(payload);
                        }
                    } else {
                        await saveSickLineAnswers(payload);
                    }
                } catch (saveErr) {
                    console.error(`Error saving Q ${q.id}:`, saveErr.message);
                }
            }

            await refreshProgress();

            if (activeTab === 'Major') setIsMajorDone(true);
            if (activeTab === 'Minor') setIsMinorDone(true);

            const bothDone = isMajorDone && isMinorDone;

            if (bothDone) {
                setGuidedBtns('TO_NEXT');
            }
            else if (!isMajorDone) {
                setGuidedBtns('TO_MAJOR');
            }
            else if (!isMinorDone) {
                setGuidedBtns('TO_MINOR');
            }

            Alert.alert('Success', 'Answers saved successfully.');
        } catch (err) {
            console.error('Save Error:', err);
            Alert.alert('Error', 'Failed to save answers. Please check network.');
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

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
                    <Ionicons name="home-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerSub}>{subcategoryName} - {activeTab}</Text>
                <View style={{ width: 26 }} />
            </View>

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

            <ScrollView contentContainerStyle={styles.scroll}>
                {(activeTab === 'Major' ? majorQs : minorQs).map(renderQuestion)}

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
    activeTab: { backgroundColor: '#f59e0b' },
    tabText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
    activeTabText: { color: '#fff' },
    scroll: { padding: 20, paddingBottom: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, elevation: 4 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    guidedBox: { marginTop: 10, marginBottom: 20, padding: 15, backgroundColor: '#fff', borderRadius: 16, borderLeftWidth: 5, borderLeftColor: '#f59e0b', elevation: 2 },
    guideBtn: { backgroundColor: '#f59e0b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 10 },
    guideBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default SickLineQuestionsScreen;
