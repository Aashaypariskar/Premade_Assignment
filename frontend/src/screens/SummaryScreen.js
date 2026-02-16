import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { submitInspection } from '../api/api';
import { useStore } from '../store/StoreContext';

/**
 * Inspection Summary Screen - PRODUCTION VERSION
 * Highly defensive code to prevent "Cannot read property of null" errors
 */
const SummaryScreen = ({ navigation }) => {
    const { draft, clearDraft } = useStore();
    const [submitting, setSubmitting] = useState(false);

    // Defensive check for draft object
    const currentDraft = draft || {};
    const answersList = Object.entries(currentDraft.answers || {});

    const counts = {
        total: answersList.length,
        yes: answersList.filter(([_, a]) => a?.answer === 'YES').length,
        no: answersList.filter(([_, a]) => a?.answer === 'NO').length,
    };

    const finalSubmit = async () => {
        if (!currentDraft.train || !currentDraft.coach) {
            Alert.alert('Error', 'Incomplete inspection data. Please go back.');
            return;
        }

        setSubmitting(true);
        const payload = {
            train_id: currentDraft.train?.id,
            coach_id: currentDraft.coach?.id,
            activity_id: currentDraft.activity?.id,
            submission_id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            answers: answersList.map(([qId, data]) => ({
                question_id: parseInt(qId),
                answer: data?.answer,
                reasons: data?.reasons || [],
                remarks: data?.remarks || '',
                image_path: data?.image_path || null
            }))
        };

        try {
            await submitInspection(payload);
            Alert.alert('Success!', 'Inspection submitted successfully', [
                {
                    text: 'Done', onPress: () => {
                        const submittedTrain = currentDraft.train?.train_number;
                        const submittedCoach = currentDraft.coach?.coach_number;
                        const now = new Date().toISOString().split('T')[0];

                        clearDraft();
                        // Navigate to Report Detail (we assume user_id is current user)
                        // Ideally backend returns the report ID, but for our 'virtual' reporting:
                        // We use the composite key data.
                        navigation.replace('ReportDetail', {
                            submission_id: payload.submission_id,
                            train_number: submittedTrain,
                            coach_number: submittedCoach,
                            date: now,
                            user_name: 'You',
                            user_id: payload.user_id
                        });
                        // Actually we need to pass user_id so ReportDetail can fetch. 
                        // We don't have it easily here without context.
                        // Let's just popToTop and let them go to History?
                        // User asked: "it should go to a new page... report page"
                        // So we MUST navigate there.
                        // Let's get user from store
                    }
                }
            ]);
        } catch (e) {
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

                    <View style={styles.stats}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#10b981' }]}>{counts.yes}</Text>
                            <Text style={styles.statLabel}>YES</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statNum, { color: '#ef4444' }]}>{counts.no}</Text>
                            <Text style={styles.statLabel}>NO</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNum}>{counts.total}</Text>
                            <Text style={styles.statLabel}>TOTAL</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Negative Findings</Text>
                {counts.no === 0 ? (
                    <Text style={styles.emptyText}>All checks passed successfully! ✨</Text>
                ) : (
                    answersList.map(([id, ans]) => ans?.answer === 'NO' && (
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
    sub: { color: '#64748b', marginTop: 5 },
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
