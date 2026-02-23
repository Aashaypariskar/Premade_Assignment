import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getQuestions, getWspQuestions } from '../api/api';
import { useStore } from '../store/StoreContext';
import QuestionCard from '../components/QuestionCard';
import { Ionicons } from '@expo/vector-icons';
import { normalizeQuestionResponse } from '../utils/normalization';

/**
 * Questions Checklist Screen - PRODUCTION VERSION
 * Highly defensive code to prevent "Cannot read property of null" errors
 */
const QuestionsScreen = ({ route, navigation }) => {
    const params = route?.params || {};
    const { draft, setDraft, user } = useStore();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRef = useRef(null);

    useEffect(() => {
        const subId = params.subcategoryId || params.subcategory_id;
        const key = `${subId}-${params.activityId}-${params.scheduleId}`;

        if (fetchRef.current === key) return;
        fetchRef.current = key;

        let isMounted = true;

        const load = async () => {
            try {
                setLoading(true);
                setQuestions([]); // State Reset

                console.log(`[FETCHING QUESTIONS] Generic - Subcategory: ${subId}, Activity: ${params.activityId}`);

                let rawResponse;
                if (params.categoryName === 'WSP Examination') {
                    rawResponse = await getWspQuestions(params.scheduleId);
                } else {
                    rawResponse = await getQuestions(params.activityId, params.scheduleId, subId);
                }

                if (!isMounted) return;

                const normalized = normalizeQuestionResponse(rawResponse);
                setQuestions(normalized.groups);
            } catch (error) {
                console.error("[QUESTION FETCH ERROR]", error);
                if (isMounted) {
                    Alert.alert('Network Error', 'Check if backend is running');
                    setQuestions([]);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [params.activityId, params.subcategoryId, params.subcategory_id, params.scheduleId]);

    const getAnswerKey = (qId) => params.compartment ? `${params.compartment}_${qId}` : qId.toString();

    const updateAnswer = (qId, data) => {
        if (!qId) return;
        const key = getAnswerKey(qId);
        setDraft(prev => ({
            ...prev,
            answers: { ...(prev?.answers || {}), [key]: data }
        }));
    };

    const currentAnswers = draft?.answers || {};

    // Flatten questions for logic/progress since we now guarantee they are grouped
    const flatQuestions = questions.flatMap(group => group.questions || []);

    const qList = flatQuestions || [];
    const ansMap = currentAnswers || {};
    const currentQIds = qList.map(q => q?.id?.toString()).filter(Boolean);

    // FIXED: Define relevantAnswers in scope for both validation and render
    const relevantAnswers = Object.entries(ansMap).filter(([key, ans]) => {
        const parts = key.split('_');
        const qId = parts.length > 1 ? parts[1] : parts[0];
        const comp = parts.length > 1 ? parts[0] : null;

        return currentQIds.includes(qId) &&
            comp === (params.compartment || null) &&
            (ans?.status || ans?.observed_value);
    });

    const countCompleted = qList.filter(q => {
        if (!q) return false;
        const ans = ansMap[getAnswerKey(q.id)];
        return ans && (ans.status || ans.observed_value);
    }).length;

    const totalQs = qList.length;
    const progress = totalQs > 0 ? (countCompleted / totalQs) * 100 : 0;

    const goSummary = () => {
        const invalidDeficiency = relevantAnswers.find(([key, ans]) => {
            if (!ans) return false;
            const missingReason = !ans.reasons || ans.reasons.length === 0;
            const missingImage = !ans.image_path;
            const missingRemark = !ans.remarks || !ans.remarks.trim();

            const hasProblem = ans.status === 'DEFICIENCY' && (missingReason || missingImage || missingRemark);
            return hasProblem;
        });

        if (invalidDeficiency) {
            const [key, ans] = invalidDeficiency;
            const parts = key.split('_');
            const qId = parts.length > 1 ? parts[1] : parts[0];
            const qObj = qList.find(q => q?.id?.toString() === qId);
            const qText = qObj?.text || 'Question';

            let missing = [];
            if (!ans?.reasons || ans.reasons.length === 0) missing.push('Reasons');
            if (!ans?.remarks) missing.push('Remarks');
            if (!ans?.image_path) missing.push('a Photo');

            Alert.alert(
                'Missing Information',
                `Question: "${qText.substring(0, 40)}..."\n\nRequires: ${missing.join(', ')}.`
            );
            return;
        }

        navigation.navigate('SummaryScreen', { ...params });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    const isWsp = params.categoryName === 'WSP Examination' || params.mode === 'WSP';

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <View style={styles.breadcrumbs}>
                        {!isWsp ? (
                            <>
                                <Text style={styles.breadcrumb}>{params.trainName}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>{params.coachNumber}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>{params.categoryName}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>
                                    {params.compartment ? `${params.subcategoryName} (${params.compartment})` : params.subcategoryName}
                                </Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                                    {params.activityType}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.breadcrumb}>{params.coachNumber}</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={styles.breadcrumb}>WSP</Text>
                                <Text style={styles.separator}>›</Text>
                                <Text style={[styles.breadcrumb, styles.activeBreadcrumb]}>
                                    {params.scheduleName}
                                </Text>
                            </>
                        )}
                    </View>
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
                {Array.isArray(questions) && questions.length > 0 ? (
                    questions.map((group, gIdx) => (
                        <View key={`group-${gIdx}`} style={styles.groupContainer}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemHeaderText}>{group.item_name || group.item || 'Questions'}</Text>
                            </View>
                            {Array.isArray(group.questions) && group.questions.map((q, idx) => (
                                <QuestionCard
                                    key={q.id || `q-${idx}`}
                                    question={q}
                                    answerData={currentAnswers[getAnswerKey(q.id)]}
                                    onUpdate={(data) => updateAnswer(q.id, data)}
                                    isDraft={true}
                                />
                            ))}
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="information-circle-outline" size={60} color="#94a3b8" />
                        <Text style={styles.emptyText}>No questions available for this area.</Text>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity style={styles.submitBtn} onPress={goSummary}>
                <Text style={styles.submitText}>Review Inspection ({relevantAnswers.length})</Text>
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
    list: { padding: 15, paddingBottom: 150 }, // More padding for FAB
    submitBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#1e293b', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 8 },
    btnDisabled: { backgroundColor: '#cbd5e1' },
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
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
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5
    },
    fabText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 8
    },
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
    itemHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#334155', textTransform: 'uppercase' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyText: { marginTop: 15, color: '#64748b', fontSize: 16, fontWeight: '500' }
});

export default QuestionsScreen;
