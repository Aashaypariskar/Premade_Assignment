import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import ImagePickerField from './ImagePickerField';
import { getReasonsByQuestion } from '../api/api';

/**
 * Modern Question Card Component
 * Handles Toggles, Reasons, and Media
 */
const QuestionCard = ({ question, answerData, onUpdate }) => {
    const isDeficiency = answerData?.status === 'DEFICIENCY';
    const [reasonsList, setReasonsList] = useState([]);
    const [loadingReasons, setLoadingReasons] = useState(false);

    useEffect(() => {
        if (isDeficiency && reasonsList.length === 0) {
            fetchReasons();
        }
    }, [isDeficiency]);

    const fetchReasons = async () => {
        try {
            setLoadingReasons(true);
            const response = await getReasonsByQuestion(question.id);
            const data = response.reasons || response || [];
            if (Array.isArray(data)) {
                setReasonsList(data);
            } else {
                setReasonsList([]);
            }
        } catch (err) {
            console.log('Error fetching reasons:', err);
        } finally {
            setLoadingReasons(false);
        }
    };

    const setStatus = (val) => {
        const current = answerData?.status;
        const next = current === val ? null : val;

        // Clear reasons/photo if switching away from DEFICIENCY
        const newData = { ...answerData, status: next };
        if (next !== 'DEFICIENCY') {
            newData.reasons = [];
            // We keep remarks and image for now as per user request to "preselect saved status" in edit mode, 
            // but requirements say "Clear reason" if switching DEFICIENCY -> OK/NA
        }
        onUpdate(newData);
    };

    const toggleReason = (reason) => {
        const current = answerData?.reasons || [];
        const next = current.includes(reason)
            ? current.filter(r => r !== reason)
            : [...current, reason];
        onUpdate({ ...answerData, reasons: next });
    };

    return (
        <View style={styles.card}>
            <Text style={styles.qText}>{question.text}</Text>

            {question.specified_value && (
                <View style={styles.specBox}>
                    <Text style={styles.specLabel}>Specified Value:</Text>
                    <Text style={styles.specValue}>{question.specified_value}</Text>
                </View>
            )}

            {question.answer_type === 'VALUE' ? (
                <View>
                    <TextInput
                        style={styles.input}
                        placeholder={`Enter value ${question.unit ? `(${question.unit})` : ''}`}
                        value={answerData?.observed_value || ''}
                        onChangeText={(val) => onUpdate({ ...answerData, observed_value: val, answer: null })}
                        keyboardType="numeric"
                    />
                </View>
            ) : (
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, answerData?.status === 'OK' && styles.btnOk]}
                        onPress={() => setStatus('OK')}
                    >
                        <Text style={[styles.toggleText, answerData?.status === 'OK' && styles.textActive]}>OK</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggleBtn, answerData?.status === 'DEFICIENCY' && styles.btnDeficiency]}
                        onPress={() => setStatus('DEFICIENCY')}
                    >
                        <Text style={[styles.toggleText, answerData?.status === 'DEFICIENCY' && styles.textActive]}>DEFICIENCY</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggleBtn, answerData?.status === 'NA' && styles.btnNa]}
                        onPress={() => setStatus('NA')}
                    >
                        <Text style={[styles.toggleText, answerData?.status === 'NA' && styles.textActive]}>NA</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isDeficiency && (
                <View style={styles.noSection}>
                    <Text style={styles.label}>Select Reasons (Mandatory):</Text>
                    <View style={styles.reasonsRow}>
                        {loadingReasons ? (
                            <ActivityIndicator size="small" color="#64748b" />
                        ) : (
                            reasonsList.map(r => (
                                <TouchableOpacity
                                    key={r.id}
                                    style={[styles.chip, answerData?.reasons?.includes(r.text) && styles.chipActive]}
                                    onPress={() => toggleReason(r.text)}
                                >
                                    <Text style={[styles.chipText, answerData?.reasons?.includes(r.text) && styles.textActive]}>{r.text}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                        {!loadingReasons && reasonsList.length === 0 && (
                            <View style={styles.emptyReasonBox}>
                                <Text style={styles.noReasonsText}>⚠️ No reasons configured. Contact Admin.</Text>
                            </View>
                        )}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Additional remarks..."
                        value={answerData?.remarks || ''}
                        onChangeText={(t) => onUpdate({ ...answerData, remarks: t })}
                        multiline
                    />

                    <Text style={styles.label}>Attach Photo (Mandatory):</Text>
                    <ImagePickerField
                        image={answerData?.image_path}
                        onImagePicked={(uri) => onUpdate({ ...answerData, image_path: uri })}
                        onRemove={() => onUpdate({ ...answerData, image_path: null })}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    qText: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 15, lineHeight: 22 },
    toggleRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4 },
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, marginHorizontal: 2 },
    btnOk: { backgroundColor: '#10b981' },
    btnDeficiency: { backgroundColor: '#ef4444' },
    btnNa: { backgroundColor: '#64748b' },
    toggleText: { fontWeight: 'bold', color: '#64748b', fontSize: 10 },
    textActive: { color: '#fff' },
    noSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
    label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 10 },
    reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    chipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
    noReasonsText: { fontSize: 12, color: '#ef4444', fontStyle: 'italic', fontWeight: 'bold' },
    emptyReasonBox: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
    input: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', marginBottom: 15 },
    specBox: {
        backgroundColor: '#f1f5f9',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#2563eb',
        marginBottom: 15
    },
    specLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    specValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b'
    }
});

export default QuestionCard;
