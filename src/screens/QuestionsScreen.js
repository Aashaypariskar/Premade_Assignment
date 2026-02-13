import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getQuestions } from '../api/api';
import { useStore } from '../store/StoreContext';
import QuestionCard from '../components/QuestionCard';

/**
 * Questions Checklist Screen
 * Features Progress Bar and explicit Yes/No logic
 */
const QuestionsScreen = ({ route, navigation }) => {
    const params = route.params;
    const { draft, setDraft } = useStore();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuestions();
    }, [params.activityType]);

    const fetchQuestions = async () => {
        try {
            const data = await getQuestions(params.activityType, params.categoryId);
            setQuestions(data);
        } catch (error) {
            Alert.alert('Network Error', 'Check if backend is running');
        } finally {
            setLoading(false);
        }
    };

    const updateAnswer = (qId, data) => {
        setDraft(prev => ({
            ...prev,
            answers: { ...prev.answers, [qId]: data }
        }));
    };

    const countCompleted = questions.filter(q => draft.answers[q.id]).length;
    const progress = questions.length > 0 ? (countCompleted / questions.length) * 100 : 0;
    const isDone = questions.length > 0 && countCompleted === questions.length;

    const goSummary = () => {
        console.log('Running validation check for answers...');
        // Only validate questions that belong to the current activity
        const currentQIds = questions.map(q => q.id.toString());
        const relevantAnswers = Object.entries(draft.answers).filter(([id]) => currentQIds.includes(id));

        const invalidNo = relevantAnswers.find(([id, ans]) => {
            const hasProblem = ans.answer === 'NO' && (!ans.reasons?.length || !ans.image_path);
            if (hasProblem) {
                console.log(`Validation failed for Q ID ${id}:`, {
                    ansType: ans.answer,
                    reasonsCount: ans.reasons?.length,
                    hasImage: !!ans.image_path
                });
            }
            return hasProblem;
        });

        if (invalidNo) {
            Alert.alert('Incomplete!', 'Negative findings (NO) require both reasons and a photo.');
            return;
        }

        navigation.navigate('SummaryScreen');
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <View style={styles.progressRow}>
                    <Text style={styles.progressText}>{countCompleted} / {questions.length} Items</Text>
                    <Text style={styles.percent}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${progress}%` }]} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {questions.map((q, idx) => (
                    <QuestionCard
                        key={q.id}
                        question={q}
                        answerData={draft.answers[q.id]}
                        onUpdate={(data) => updateAnswer(q.id, data)}
                    />
                ))}
            </ScrollView>

            <TouchableOpacity
                style={[styles.nextBtn, !isDone && styles.btnDisabled]}
                disabled={!isDone}
                onPress={goSummary}
            >
                <Text style={styles.nextText}>Review Inspection ➔</Text>
            </TouchableOpacity>
        </View>
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
    list: { padding: 15, paddingBottom: 100 },
    nextBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#1e293b', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 8 },
    btnDisabled: { backgroundColor: '#cbd5e1' },
    nextText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default QuestionsScreen;
