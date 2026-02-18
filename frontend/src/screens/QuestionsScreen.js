import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getQuestions } from '../api/api';
import { useStore } from '../store/StoreContext';
import QuestionCard from '../components/QuestionCard';

/**
 * Questions Checklist Screen - PRODUCTION VERSION
 * Highly defensive code to prevent "Cannot read property of null" errors
 */
const QuestionsScreen = ({ route, navigation }) => {
    const params = route?.params || {};
    const { draft, setDraft, user } = useStore();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const data = await getQuestions(params.activityId, params.scheduleId, params.subcategoryId || params.subcategory_id);
            // Unified data handling
            setQuestions(data || []);
        } catch (error) {
            console.log("Fetch Error:", error);
            Alert.alert('Network Error', 'Check if backend is running');
        } finally {
            setLoading(false);
        }
    };

    // Refresh questions whenever screen comes into focus (e.g., after adding/deleting questions)
    useFocusEffect(
        useCallback(() => {
            fetchQuestions();
        }, [params.activityId])
    );

    const updateAnswer = (qId, data) => {
        if (!qId) return;
        setDraft(prev => ({
            ...prev,
            answers: { ...(prev?.answers || {}), [qId]: data }
        }));
    };

    const currentAnswers = draft?.answers || {};

    // Flatten questions for logic/progress if they are grouped
    const isGrouped = questions.length > 0 && (questions[0].item || questions[0].item_name) && questions[0].questions;
    const flatQuestions = isGrouped
        ? questions.reduce((acc, curr) => [...acc, ...curr.questions], [])
        : questions;

    const countCompleted = (flatQuestions || []).filter(q => q && currentAnswers[q.id]?.answer).length;
    const totalQs = (flatQuestions || []).length;
    const progress = totalQs > 0 ? (countCompleted / totalQs) * 100 : 0;
    const isDone = totalQs > 0 && countCompleted === totalQs;

    const goSummary = () => {
        console.log('Running validation check for answers...');

        const qList = flatQuestions || [];
        const ansMap = currentAnswers || {};

        const currentQIds = qList.map(q => q?.id?.toString()).filter(Boolean);
        // Only validate answers that belong to this screen AND have been answered (YES/NO)
        const relevantAnswers = Object.entries(ansMap).filter(([id, ans]) =>
            currentQIds.includes(id) && ans?.answer
        );

        const invalidNo = relevantAnswers.find(([id, ans]) => {
            if (!ans) return false;
            const missingReason = !ans.reasons || ans.reasons.length === 0;
            const missingImage = !ans.image_path;

            const hasProblem = ans.answer === 'NO' && (missingReason || missingImage);

            if (hasProblem) {
                console.log(`Validation failed for Q ID ${id}:`, {
                    ansType: ans.answer,
                    reasonsCount: ans.reasons?.length || 0,
                    hasImage: !!ans.image_path
                });
            }
            return hasProblem;
        });

        if (invalidNo) {
            const [qId, ans] = invalidNo;
            const qObj = qList.find(q => q?.id?.toString() === qId);
            const qText = qObj?.text || 'Question';

            let missing = [];
            if (!ans?.reasons || ans.reasons.length === 0) missing.push('Reasons');
            if (!ans?.image_path) missing.push('a Photo');

            Alert.alert(
                'Missing Information',
                `Question: "${qText.substring(0, 40)}..."\n\nRequires: ${missing.join(' and ')}.`
            );
            return;
        }

        navigation.navigate('SummaryScreen');
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <View style={styles.headerTop}>
                    <View style={styles.breadcrumbs}>
                        <Text style={styles.breadcrumb}>{params.trainName}</Text>
                        <Text style={styles.separator}>›</Text>
                        <Text style={styles.breadcrumb}>{params.coachNumber}</Text>
                        <Text style={styles.separator}>›</Text>
                        <Text style={styles.breadcrumb}>{params.categoryName}</Text>
                        <Text style={styles.separator}>›</Text>
                        <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                            {params.scheduleName || params.activityType}
                        </Text>
                    </View>
                    {user?.role === 'Admin' && (
                        <TouchableOpacity
                            style={styles.editQuestionsBtn}
                            onPress={() => navigation.navigate('QuestionManagement', {
                                activityId: params.activityId,
                                activityType: params.activityType,
                                categoryName: params.categoryName
                            })}
                        >
                            <Text style={styles.editQuestionsBtnText}>✏️ Edit Questions</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.progressRow}>
                    <Text style={styles.progressText}>{countCompleted} / {totalQs} Items</Text>
                    <Text style={styles.percent}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${progress}%` }]} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {isGrouped ? (
                    (questions || []).map((group, gIdx) => (
                        <View key={`group-${gIdx}`} style={styles.groupContainer}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemHeaderText}>{group.item_name || group.item}</Text>
                            </View>
                            {(group.questions || []).map((q, idx) => (
                                <QuestionCard
                                    key={q.id || `q-${idx}`}
                                    question={q}
                                    answerData={currentAnswers[q.id]}
                                    onUpdate={(data) => updateAnswer(q.id, data)}
                                />
                            ))}
                        </View>
                    ))
                ) : (
                    (questions || []).map((q, idx) => q && (
                        <QuestionCard
                            key={q.id || idx}
                            question={q}
                            answerData={currentAnswers[q.id]}
                            onUpdate={(data) => updateAnswer(q.id, data)}
                        />
                    ))
                )}
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    breadcrumbs: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
    breadcrumb: { fontSize: 11, color: '#64748b' },
    separator: { fontSize: 11, color: '#94a3b8', marginHorizontal: 4 },
    activeBreadcrumb: { color: '#2563eb', fontWeight: 'bold' },
    editQuestionsBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2563eb' },
    editQuestionsBtnText: { fontSize: 11, fontWeight: 'bold', color: '#2563eb' },
    groupContainer: { marginBottom: 20 },
    itemHeader: { backgroundColor: '#f8fafc', paddingVertical: 8, paddingHorizontal: 12, borderLeftWidth: 4, borderLeftColor: '#334155', marginBottom: 10, borderRadius: 4 },
    itemHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#334155', textTransform: 'uppercase' }
});

export default QuestionsScreen;
