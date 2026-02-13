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
            const data = await getQuestions(params.activityType);
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
                        <View style={styles.btnRow}>
                            {['YES', 'NO', 'NA'].map(opt => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[styles.optBtn, answers[q.id]?.answer === opt && styles.optBtnActive]}
                                    onPress={() => handleAnswer(q, opt)}
                                >
                                    <Text style={[styles.optText, answers[q.id]?.answer === opt && styles.optTextActive]}>{opt}</Text>
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
    list: { padding: 12 },
    card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, elevation: 2 },
    qText: { fontSize: 15, marginBottom: 12 },
    btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
    optBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', marginHorizontal: 4, borderRadius: 4, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ccc' },
    optBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    optText: { fontWeight: '600', color: '#666' },
    optTextActive: { color: '#fff' },
    submitBtn: { margin: 16, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    submitBtnDisabled: { backgroundColor: '#ccc' },
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default QuestionsScreen;
