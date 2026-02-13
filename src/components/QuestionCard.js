import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import ImagePickerField from './ImagePickerField';

/**
 * Modern Question Card Component
 * Handles Toggles, Reasons, and Media
 */
const QuestionCard = ({ question, answerData, onUpdate }) => {
    const isNo = answerData?.answer === 'NO';
    const REASONS = ['Dirty', 'Broken', 'Dented', 'Missing', 'Loose'];

    const setAnswer = (val) => {
        onUpdate({ ...answerData, answer: val });
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

            <View style={styles.toggleRow}>
                <TouchableOpacity
                    style={[styles.toggleBtn, answerData?.answer === 'YES' && styles.btnYes]}
                    onPress={() => setAnswer('YES')}
                >
                    <Text style={[styles.toggleText, answerData?.answer === 'YES' && styles.textActive]}>YES</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.toggleBtn, answerData?.answer === 'NO' && styles.btnNo]}
                    onPress={() => setAnswer('NO')}
                >
                    <Text style={[styles.toggleText, answerData?.answer === 'NO' && styles.textActive]}>NO</Text>
                </TouchableOpacity>
            </View>

            {isNo && (
                <View style={styles.noSection}>
                    <Text style={styles.label}>Select Reasons (Mandatory):</Text>
                    <View style={styles.reasonsRow}>
                        {REASONS.map(r => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.chip, answerData?.reasons?.includes(r) && styles.chipActive]}
                                onPress={() => toggleReason(r)}
                            >
                                <Text style={[styles.chipText, answerData?.reasons?.includes(r) && styles.textActive]}>{r}</Text>
                            </TouchableOpacity>
                        ))}
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
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
    btnYes: { backgroundColor: '#10b981' },
    btnNo: { backgroundColor: '#ef4444' },
    toggleText: { fontWeight: 'bold', color: '#64748b' },
    textActive: { color: '#fff' },
    noSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
    label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 10 },
    reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    chipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
    input: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', marginBottom: 15 }
});

export default QuestionCard;
