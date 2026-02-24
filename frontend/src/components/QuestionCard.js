import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import ImagePickerField from './ImagePickerField';
import { getReasonsByQuestion } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config/environment';

const normalizeUrl = (uri) => {
    if (!uri) return null;
    if (uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://')) {
        return uri;
    }
    const cleanBase = BASE_URL.replace('/api/', '');
    const cleanUri = uri.startsWith('/') ? uri : `/${uri}`;
    return `${cleanBase}${cleanUri}`;
};
/**
 * Modern Question Card Component
 * Handles Toggles, Reasons, and Media
 */
const QuestionCard = ({ question, answerData, onUpdate, readOnly = false }) => {
    const isDeficiency = answerData?.status === 'DEFICIENCY';
    const isResolved = answerData?.resolved === 1 || answerData?.resolved === true;
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

        const newData = { ...answerData, status: next };

        // Requirement: When switching away from DEFICIENCY, clear reasons, remarks, and photo
        if (current === 'DEFICIENCY' && next !== 'DEFICIENCY') {
            newData.reasons = [];
            newData.remarks = '';
            newData.photo_url = null;
            newData.image_path = null; // Clear both just in case
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
            {isResolved ? (
                <View style={styles.resolvedLabel}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.resolvedLabelText}>RESOLVED ✓</Text>
                </View>
            ) : null}
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
                        style={[styles.input, (readOnly || isResolved) && styles.disabledInput]}
                        placeholder={`Enter value ${question.unit ? `(${question.unit})` : ''}`}
                        value={answerData?.observed_value || ''}
                        onChangeText={(val) => onUpdate({ ...answerData, observed_value: val, answer: null })}
                        keyboardType="numeric"
                        editable={!readOnly && !isResolved}
                    />
                </View>
            ) : (
                <View style={styles.toggleRow}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, answerData?.status === 'OK' && styles.btnOk, (readOnly || isResolved) && styles.disabledBtn]}
                        onPress={() => setStatus('OK')}
                        disabled={readOnly || isResolved}
                    >
                        <Text style={[styles.toggleText, answerData?.status === 'OK' && styles.textActive]}>OK</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggleBtn, answerData?.status === 'DEFICIENCY' && styles.btnDeficiency, (readOnly || isResolved) && styles.disabledBtn]}
                        onPress={() => setStatus('DEFICIENCY')}
                        disabled={readOnly || isResolved}
                    >
                        <Text style={[styles.toggleText, answerData?.status === 'DEFICIENCY' && styles.textActive]}>DEFICIENCY</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggleBtn, answerData?.status === 'NA' && styles.btnNa, (readOnly || isResolved) && styles.disabledBtn]}
                        onPress={() => setStatus('NA')}
                        disabled={readOnly || isResolved}
                    >
                        <Text style={[styles.toggleText, answerData?.status === 'NA' && styles.textActive]}>NA</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isDeficiency && (
                <View style={styles.noSection}>
                    <Text style={styles.label}>Reasons:</Text>
                    <View style={styles.reasonsRow}>
                        {loadingReasons ? (
                            <ActivityIndicator size="small" color="#64748b" />
                        ) : (
                            reasonsList.map(r => (
                                <TouchableOpacity
                                    key={r.id}
                                    style={[styles.chip, answerData?.reasons?.includes(r.text) && styles.chipActive, (readOnly || isResolved) && styles.disabledBtn]}
                                    onPress={() => toggleReason(r.text)}
                                    disabled={readOnly || isResolved}
                                >
                                    <Text style={[styles.chipText, answerData?.reasons?.includes(r.text) && styles.textActive]}>{r.text}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                        {!loadingReasons && reasonsList.length === 0 && (
                            <View style={styles.emptyReasonBox}>
                                <Text style={styles.noReasonsText}>⚠️ No reasons configured.</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.label}>Remarks:</Text>
                    <TextInput
                        style={[styles.input, (readOnly || isResolved) && styles.disabledInput]}
                        placeholder="Additional remarks..."
                        value={answerData?.remarks || ''}
                        onChangeText={(t) => onUpdate({ ...answerData, remarks: t })}
                        multiline
                        editable={!readOnly && !isResolved}
                    />

                    <View style={styles.photoContainer}>
                        <View style={styles.photoBox}>
                            <Text style={styles.label}>Before Photo:</Text>
                            {(() => {
                                const beforeUri = normalizeUrl(answerData?.photo_url || answerData?.image_path);
                                return (
                                    <ImagePickerField
                                        image={beforeUri}
                                        onImagePicked={(uri) => {
                                            onUpdate({ ...answerData, photo_url: uri, image_path: uri });
                                        }}
                                        onRemove={() => onUpdate({ ...answerData, photo_url: null, image_path: null })}
                                        disabled={readOnly || isResolved}
                                    />
                                );
                            })()}
                        </View>

                        {isResolved && (
                            <View style={styles.photoBox}>
                                <Text style={styles.label}>After Photo:</Text>
                                <ImagePickerField
                                    image={normalizeUrl(answerData?.after_photo_url)}
                                    disabled={true}
                                />
                            </View>
                        )}
                    </View>

                    {isResolved && (
                        <View style={styles.resolutionSection}>
                            <Text style={[styles.label, { color: '#059669' }]}>Resolution Remark:</Text>
                            <View style={styles.resolutionRemarkBox}>
                                <Text style={styles.resolutionRemarkText}>{answerData?.resolution_remark || 'No resolution remark provided.'}</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    disabledBtn: { opacity: 0.6 },
    disabledInput: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
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
    },
    resolvedLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#10b981'
    },
    resolvedLabelText: {
        color: '#059669',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4
    },
    photoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    photoBox: {
        flex: 1,
        marginHorizontal: 2
    },
    resolutionSection: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        borderStyle: 'dashed'
    },
    resolutionRemarkBox: {
        backgroundColor: '#f0fdf4',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bbf7d0'
    },
    resolutionRemarkText: { fontSize: 13, color: '#166534', fontStyle: 'italic' }
});

export default QuestionCard;
