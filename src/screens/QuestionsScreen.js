import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getQuestions, submitInspection } from '../services/apiIntegration';
import NoReasonModal from '../components/NoReasonModal';

/**
 * Inspection Questions Screen
 * Handling dynamic questions from backend
 */
const QuestionsScreen = ({ route, navigation }) => {
    const params = route.params;
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, [params.activityType]);

    const fetchQuestions = async () => {
        try {
            const data = await getQuestions(params.activityType, params.categoryId);
            setQuestions(data);
        } catch (error) {
            console.log('Error getting questions:', error);
            Alert.alert('Network Error', 'Check if backend is running');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (q, val) => {
        if (val === 'NO') {
            setActiveQuestion(q);
        } else {
            setAnswers(prev => ({
                ...prev,
                [q.id]: { answer: val }
            }));
        }
    };

    const handleModalDone = (auditData) => {
        setAnswers(prev => ({
            ...prev,
            [activeQuestion.id]: { answer: 'NO', ...auditData }
        }));
        setActiveQuestion(null);
    };

    const isFormValid = () => {
        return questions.length > 0 && questions.every(q => answers[q.id]);
    };

    const handleSubmit = async () => {
        if (!isFormValid()) {
            Alert.alert('Wait', 'Finish all questions first bhai');
            return;
        }

        setSubmitting(true);
        const payload = {
            train_id: params.trainId,
            coach_id: params.coachId,
            activity_id: params.activityId,
            answers: Object.entries(answers).map(([qId, data]) => ({
                question_id: parseInt(qId),
                ...data
            }))
        };

        try {
            await submitInspection(payload);
            Alert.alert('Done!', 'Inspection submitted to server', [
                { text: 'Ok', onPress: () => navigation.popToTop() }
            ]);
        } catch (error) {
            console.log('Submit failed:', error);
            Alert.alert('Error', 'Submission failed, check network');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{params.activityType} Check</Text>
                <Text style={styles.details}>Coach: {params.coachNumber}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {questions.map((q, idx) => (
                    <View key={q.id} style={styles.card}>
                        <Text style={styles.qText}>{idx + 1}. {q.text}</Text>
                        <View style={styles.toggleRow}>
                            {['YES', 'NO'].map(opt => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[
                                        styles.toggleBtn,
                                        answers[q.id]?.answer === opt && (opt === 'YES' ? styles.btnYes : styles.btnNo)
                                    ]}
                                    onPress={() => handleAnswer(q, opt)}
                                >
                                    <Text style={[styles.toggleText, answers[q.id]?.answer === opt && styles.textActive]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <TouchableOpacity
                style={[styles.submitBtn, !isFormValid() && styles.submitBtnDisabled]}
                disabled={submitting}
                onPress={handleSubmit}
            >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Inspection</Text>}
            </TouchableOpacity>

            {activeQuestion && (
                <NoReasonModal
                    question={activeQuestion}
                    onDone={handleModalDone}
                    onCancel={() => setActiveQuestion(null)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
    title: { fontSize: 18, fontWeight: 'bold' },
    details: { fontSize: 14, color: '#666' },
    list: { padding: 12, paddingBottom: 100 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    qText: { fontSize: 16, fontWeight: '500', color: '#334155', marginBottom: 16, lineHeight: 22 },
    toggleRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 4 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    btnYes: { backgroundColor: '#10b981' },
    btnNo: { backgroundColor: '#ef4444' },
    toggleText: { fontWeight: '700', color: '#64748b', fontSize: 14 },
    textActive: { color: '#fff' },
    submitBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 5 },
    submitBtnDisabled: { backgroundColor: '#cbd5e1' },
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default QuestionsScreen;
