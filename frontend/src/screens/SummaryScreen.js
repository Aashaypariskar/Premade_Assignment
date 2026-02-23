import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { submitInspection, saveWspAnswers } from '../api/api';
import { useStore } from '../store/StoreContext';
import { calculateCompliance } from '../utils/compliance';

/**
 * Inspection Summary Screen - PRODUCTION VERSION
 * Highly defensive code to prevent "Cannot read property of null" errors
 */
const SummaryScreen = ({ route, navigation }) => {
    const { draft, clearDraft, user } = useStore();
    const [submitting, setSubmitting] = useState(false);

    // Defensive check for draft object
    const currentDraft = draft || {};
    const params = route?.params || {};

    // Filter answers to ONLY show the current compartment's results
    const answersList = Object.entries(currentDraft.answers || {}).filter(([key]) => {
        const parts = key.split('_');
        const comp = parts.length > 1 ? parts[0] : null;
        return comp === (params.compartment || null);
    });

    const complianceScore = calculateCompliance(answersList);

    const counts = {
        total: answersList.length,
        ok: answersList.filter(([_, a]) => a?.status === 'OK').length,
        deficiency: answersList.filter(([_, a]) => a?.status === 'DEFICIENCY').length,
        na: answersList.filter(([_, a]) => a?.status === 'NA').length,
        value: answersList.filter(([_, a]) => a?.observed_value).length,
    };

    const finalSubmit = async () => {
        if ((params.categoryName !== 'WSP Examination' && !currentDraft.train) || !currentDraft.coach) {
            Alert.alert('Error', 'Incomplete inspection data. Please go back.');
            return;
        }

        setSubmitting(true);
        const payload = {
            train_id: currentDraft.train?.id,
            coach_id: currentDraft.coach?.id,
            activity_id: currentDraft.activity?.id,
            schedule_id: currentDraft.schedule_id,
            subcategory_id: currentDraft.subcategory_id,
            compartment: params.compartment, // Pass compartment to backend
            mode: params.mode || 'INDEPENDENT',
            submission_id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            answers: answersList.map(([key, data]) => {
                const parts = key.split('_');
                const qId = parts.length > 1 ? parts[1] : parts[0];
                return {
                    question_id: parseInt(qId),
                    status: data?.status,
                    observed_value: data?.observed_value,
                    reasons: data?.reasons || [],
                    remarks: data?.remarks || '',
                    image_path: data?.image_path || null
                };
            })
        };

        try {
            if (params.categoryName === 'WSP Examination') {
                const wspPayload = {
                    session_id: params.sessionId,
                    mode: params.mode || 'INDEPENDENT',
                    coach_id: currentDraft.coach?.id,
                    schedule_id: currentDraft.schedule_id,
                    answers: payload.answers
                };
                await saveWspAnswers(wspPayload);
            } else {
                await submitInspection(payload);
            }

            Alert.alert('Success!', 'Inspection submitted successfully', [
                {
                    text: 'Done', onPress: () => {
                        const submittedTrain = currentDraft.train?.train_number || 'Audit';
                        const submittedCoach = currentDraft.coach?.coach_number;
                        const now = new Date().toISOString().split('T')[0];
                        const userId = user?.id;

                        clearDraft();
                        navigation.replace('ReportSuccess', {
                            submission_id: payload.submission_id,
                            train_id: currentDraft.train?.id,
                            train_number: submittedTrain,
                            coach_id: currentDraft.coach?.id,
                            coach_number: submittedCoach,
                            category_name: currentDraft.category,
                            subcategory_id: currentDraft.subcategory_id,
                            subcategory_name: currentDraft.subcategory_name,
                            activity_type: currentDraft.activity?.type || 'Standard',
                            compartment: params.compartment
                        });
                    }
                }
            ]);
        } catch (e) {
            console.error('Submission Error:', e.response?.data || e.message);
            Alert.alert('Error', 'Failed to synchronize with backend. Check connection.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.headerCard}>
                    <Text style={styles.title}>Inspection Review</Text>
                    <Text style={styles.sub}>
                        {currentDraft.train?.name || 'Unknown Train'} - Coach {currentDraft.coach?.coach_number || 'N/A'}
                    </Text>
                    <Text style={styles.frameworkSub}>
                        {currentDraft.category} › {params.compartment ? `${currentDraft.subcategory_name} (${params.compartment})` : (currentDraft.schedule_name || currentDraft.subcategory_name || currentDraft.activity?.type)}
                    </Text>

                    <View style={styles.stats}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#10b981' }]}>{counts.ok}</Text>
                            <Text style={styles.statLabel}>OK</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#ef4444' }]}>{counts.deficiency}</Text>
                            <Text style={styles.statLabel}>DEFICIENCY</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#64748b' }]}>{counts.na}</Text>
                            <Text style={styles.statLabel}>NA</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#3b82f6' }]}>{counts.value}</Text>
                            <Text style={styles.statLabel}>MEASURED</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: complianceScore < 80 ? '#ef4444' : '#10b981' }]}>{complianceScore}%</Text>
                            <Text style={styles.statLabel}>SCORE</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNum}>{counts.total}</Text>
                            <Text style={styles.statLabel}>TOTAL</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Deficiencies Found</Text>
                {counts.deficiency === 0 ? (
                    <Text style={styles.emptyText}>All checks passed successfully! ✨</Text>
                ) : (
                    answersList.map(([id, ans]) => ans?.status === 'DEFICIENCY' && (
                        <View key={id} style={styles.findingCard}>
                            <Text style={styles.remarks}>{ans.remarks || 'No remarks provided'}</Text>
                            <View style={styles.chips}>
                                {ans.reasons?.map(r => (
                                    <View key={r} style={styles.chip}>
                                        <Text style={styles.chipText}>{r}</Text>
                                    </View>
                                ))}
                            </View>
                            {ans.image_path && <Image source={{ uri: ans.image_path }} style={styles.thumb} />}
                        </View>
                    ))
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={finalSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitText}>Submit Inspection</Text>
                    )
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scroll: { padding: 20 },
    headerCard: { backgroundColor: '#fff', borderRadius: 24, padding: 25, elevation: 4 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    sub: { color: '#64748b', marginTop: 5, fontSize: 13 },
    frameworkSub: { color: '#2563eb', fontWeight: 'bold', fontSize: 12, marginTop: 2 },
    stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 20 },
    statBox: { alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: 'bold' },
    statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 30, marginBottom: 15 },
    emptyText: { textAlign: 'center', color: '#64748b', fontStyle: 'italic', marginTop: 20 },
    findingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
    remarks: { fontSize: 14, color: '#334155', fontWeight: '500' },
    chips: { flexDirection: 'row', marginTop: 8 },
    chip: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 5 },
    chipText: { fontSize: 10, color: '#ef4444', fontWeight: 'bold' },
    thumb: { width: 60, height: 60, borderRadius: 8, marginTop: 10 },
    footer: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', elevation: 10 },
    editBtn: { flex: 1, paddingVertical: 16, alignItems: 'center' },
    editText: { color: '#64748b', fontWeight: 'bold' },
    submitBtn: { flex: 2, backgroundColor: '#10b981', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default SummaryScreen;
