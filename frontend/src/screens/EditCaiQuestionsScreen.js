import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCaiQuestions, addCaiQuestion, updateCaiQuestion } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const EditCaiQuestionsScreen = ({ navigation }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);

    // Form state
    const [caiCode, setCaiCode] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const data = await getCaiQuestions();
            setQuestions(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch CAI questions');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchQuestions();
        }, [])
    );

    const handleOpenModal = (q = null) => {
        if (q) {
            setEditingQuestion(q);
            setCaiCode(q.cai_code);
            setQuestionText(q.question_text);
            setIsActive(q.is_active);
        } else {
            setEditingQuestion(null);
            setCaiCode('');
            setQuestionText('');
            setIsActive(true);
        }
        setIsModalVisible(true);
    };

    const handleSubmit = async () => {
        if (!caiCode.trim() || !questionText.trim()) {
            return Alert.alert('Error', 'All fields are required');
        }

        try {
            setSubmitting(true);
            if (editingQuestion) {
                await updateCaiQuestion({
                    id: editingQuestion.id,
                    cai_code: caiCode.trim(),
                    question_text: questionText.trim(),
                    is_active: isActive
                });
            } else {
                await addCaiQuestion({
                    cai_code: caiCode.trim(),
                    question_text: questionText.trim()
                });
            }
            setIsModalVisible(false);
            fetchQuestions();
            Alert.alert('Success', `Question ${editingQuestion ? 'updated' : 'added'} successfully`);
        } catch (err) {
            Alert.alert('Error', 'Failed to save question');
        } finally {
            setSubmitting(false);
        }
    };

    const renderQuestion = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.caiCode}>{item.cai_code}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#ecfdf5' : '#fff1f2' }]}>
                    <Text style={[styles.statusText, { color: item.is_active ? '#10b981' : '#f43f5e' }]}>
                        {item.is_active ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>
            <Text style={styles.questionText}>{item.question_text}</Text>
            <TouchableOpacity
                style={styles.editBtn}
                onPress={() => handleOpenModal(item)}
            >
                <Ionicons name="create-outline" size={18} color="#8b5cf6" />
                <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={26} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>CAI Question Manager</Text>
                <TouchableOpacity onPress={() => handleOpenModal()}>
                    <Ionicons name="add-circle" size={30} color="#8b5cf6" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={questions}
                keyExtractor={item => item.id.toString()}
                renderItem={renderQuestion}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>No CAI questions found.</Text>}
            />

            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingQuestion ? 'Edit Question' : 'Add New Question'}</Text>

                        <Text style={styles.label}>CAI Code</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. CAI-001"
                            value={caiCode}
                            onChangeText={setCaiCode}
                        />

                        <Text style={styles.label}>Question Text</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe the modification check..."
                            value={questionText}
                            onChangeText={setQuestionText}
                            multiline
                        />

                        <View style={styles.switchRow}>
                            <Text style={styles.label}>Is Active</Text>
                            <TouchableOpacity onPress={() => setIsActive(!isActive)}>
                                <Ionicons
                                    name={isActive ? "checkbox" : "square-outline"}
                                    size={24}
                                    color={isActive ? "#8b5cf6" : "#cbd5e1"}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            <Text style={styles.submitBtnText}>{editingQuestion ? 'Update' : 'Add'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    caiCode: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    questionText: { fontSize: 14, color: '#64748b', marginBottom: 15 },
    editBtn: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
    editBtnText: { color: '#8b5cf6', fontWeight: 'bold', marginLeft: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#64748b', marginBottom: 8 },
    input: { backgroundColor: '#f8fafc', borderWidh: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 15 },
    textArea: { height: 100, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    submitBtn: { backgroundColor: '#8b5cf6', padding: 15, borderRadius: 12, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontWeight: 'bold' },
    cancelBtn: { padding: 15, alignItems: 'center' },
    cancelBtnText: { color: '#64748b' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});

export default EditCaiQuestionsScreen;
