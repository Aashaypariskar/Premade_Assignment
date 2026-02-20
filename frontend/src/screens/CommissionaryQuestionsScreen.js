import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { getCommissionaryQuestions, saveCommissionaryAnswers } from '../api/api';
import { Ionicons } from '@expo/vector-icons';

const CommissionaryQuestionsScreen = ({ route, navigation }) => {
    const { sessionId, coachNumber, compartmentId, subcategoryId, subcategoryName, status } = route.params;
    const [majorQs, setMajorQs] = useState([]);
    const [minorQs, setMinorQs] = useState([]);
    const [activeTab, setActiveTab] = useState('Major'); // Default to Major
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // answers: { questionId: { answer, reason, photo_url } }
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        try {
            const [major, minor] = await Promise.all([
                getCommissionaryQuestions(subcategoryId, 'Major'),
                getCommissionaryQuestions(subcategoryId, 'Minor')
            ]);

            // Flatten grouped items
            const flatten = (data) => data.flatMap(item => item.questions);
            setMajorQs(flatten(major));
            setMinorQs(flatten(minor));
        } catch (err) {
            Alert.alert('Error', 'Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (qId, val) => {
        setAnswers(prev => ({
            ...prev,
            [qId]: { ...prev[qId], status: val }
        }));
    };

    const handleRemark = (qId, text) => {
        setAnswers(prev => ({
            ...prev,
            [qId]: { ...prev[qId], reason: text }
        }));
    };

    const validate = () => {
        const currentQs = activeTab === 'Major' ? majorQs : minorQs;
        for (const q of currentQs) {
            const ans = answers[q.id];
            if (!ans || !ans.status) return { valid: false, msg: `Status is required for "${q.text}".` };
            if (ans.status === 'DEFICIENCY' && (!ans.reason || !ans.reason.trim())) {
                return { valid: false, msg: `Remark is required for "DEFICIENCY" on "${q.text}".` };
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
            const payload = {
                session_id: sessionId,
                compartment_id: compartmentId,
                subcategory_id: subcategoryId,
                activity_type: activeTab,
                answers: currentQs.map(q => ({
                    question_id: q.id,
                    status: answers[q.id].status,
                    reason: answers[q.id].reason || '',
                    photo_url: answers[q.id].photo_url || ''
                }))
            };

            await saveCommissionaryAnswers(payload);

            if (activeTab === 'Major' && minorQs.length > 0) {
                Alert.alert('Saved', 'Major questions saved. Now proceeding to Minor.', [
                    { text: 'Continue', onPress: () => setActiveTab('Minor') }
                ]);
            } else {
                Alert.alert('Success', 'All questions for this activity saved!', [
                    { text: 'OK', onPress: () => navigation.navigate('CompartmentSelection', { ...route.params }) }
                ]);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to save answers');
        } finally {
            setSaving(false);
        }
    };

    const renderQuestion = (q) => {
        const ans = answers[q.id] || {};
        const isLocked = status === 'COMPLETED';

        return (
            <View key={q.id} style={styles.qCard}>
                <Text style={styles.qText}>{q.text}</Text>
                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={[styles.ansBtn, ans.status === 'OK' && styles.ansBtnOk]}
                        onPress={() => !isLocked && handleAnswer(q.id, 'OK')}
                        disabled={isLocked}
                    >
                        <Text style={[styles.ansBtnText, ans.status === 'OK' && styles.ansBtnTextActive]}>OK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.ansBtn, ans.status === 'DEFICIENCY' && styles.ansBtnDeficiency]}
                        onPress={() => !isLocked && handleAnswer(q.id, 'DEFICIENCY')}
                        disabled={isLocked}
                    >
                        <Text style={[styles.ansBtnText, ans.status === 'DEFICIENCY' && styles.ansBtnTextActive]}>DEFICIENCY</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.ansBtn, ans.status === 'NA' && styles.ansBtnNa]}
                        onPress={() => !isLocked && handleAnswer(q.id, 'NA')}
                        disabled={isLocked}
                    >
                        <Text style={[styles.ansBtnText, ans.status === 'NA' && styles.ansBtnTextActive]}>NA</Text>
                    </TouchableOpacity>
                </View>

                {ans.status === 'DEFICIENCY' && (
                    <View style={styles.remarkBox}>
                        <TextInput
                            style={styles.remarkInput}
                            placeholder="Enter specific remark..."
                            value={ans.reason}
                            onChangeText={(text) => handleRemark(q.id, text)}
                            multiline
                            editable={!isLocked}
                        />
                        <TouchableOpacity style={[styles.photoBtn, isLocked && { opacity: 0.5 }]} disabled={isLocked}>
                            <Ionicons name="camera" size={20} color="#64748b" />
                            <Text style={styles.photoBtnText}>Add Photo</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('CategoryDashboard')}>
                    <Ionicons name="home-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerSub}>{subcategoryName} ({compartmentId})</Text>
                <View style={{ width: 26 }} />
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Major' && styles.activeTab]}
                    onPress={() => setActiveTab('Major')}
                >
                    <Text style={[styles.tabText, activeTab === 'Major' && styles.activeTabText]}>MAJOR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Minor' && styles.activeTab]}
                    onPress={() => setActiveTab('Minor')}
                >
                    <Text style={[styles.tabText, activeTab === 'Minor' && styles.activeTabText]}>MINOR</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {(activeTab === 'Major' ? majorQs : minorQs).map(renderQuestion)}
                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving || status === 'COMPLETED'}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={[styles.saveBtnText, (saving || status === 'COMPLETED') && { color: '#94a3b8' }]}>
                            {status === 'COMPLETED' ? 'Inspection Locked' : 'Save & Sync'}
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
    qCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2 },
    qText: { fontSize: 16, color: '#1e293b', fontWeight: '500', marginBottom: 15 },
    btnRow: { flexDirection: 'row', gap: 10 },
    ansBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
    ansBtnOk: { backgroundColor: '#10b981', borderColor: '#10b981' },
    ansBtnDeficiency: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    ansBtnNa: { backgroundColor: '#64748b', borderColor: '#64748b' },
    ansBtnText: { fontWeight: 'bold', color: '#64748b', fontSize: 10 },
    ansBtnTextActive: { color: '#fff' },
    remarkBox: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    remarkInput: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, fontSize: 13, minHeight: 60, textAlignVertical: 'top' },
    photoBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    photoBtnText: { marginLeft: 6, fontSize: 12, color: '#64748b', fontWeight: 'bold' },
    saveBtn: { backgroundColor: '#2563eb', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 4 },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CommissionaryQuestionsScreen;
