import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { getQuestionsByActivity, createQuestion, updateQuestion, deleteQuestion, getReasonsByQuestion, createReason, deleteReason } from '../api/api';
import { Ionicons } from '@expo/vector-icons'; // Assuming Expo, or use Text symbols if icons not available

const QuestionManagementScreen = ({ route, navigation }) => {
    const { activityId, activityType, categoryName, subcategoryId, scheduleId, coachId } = route.params;

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null); // null = adding new
    const [questionText, setQuestionText] = useState('');
    const [answerType, setAnswerType] = useState('BOOLEAN');
    const [unit, setUnit] = useState('');
    const [specifiedValue, setSpecifiedValue] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reason Management State (inside modal)
    const [questionReasons, setQuestionReasons] = useState([]);
    const [loadingReasons, setLoadingReasons] = useState(false);
    const [newReasonText, setNewReasonText] = useState('');
    const [addingReason, setAddingReason] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            let data = [];

            if (categoryName === 'Coach Commissionary') {
                if (!subcategoryId || !activityType) {
                    Alert.alert('Error', 'Missing subcategory_id or activity_type');
                    setLoading(false);
                    return;
                }
                const res = await api.get('/commissionary/questions', { params: { subcategory_id: subcategoryId, activity_type: activityType } });
                data = res.data.groups ? res.data.groups.flatMap(g => g.questions || []) : (Array.isArray(res.data) ? res.data : []);
            } else if (categoryName === 'Sick Line Examination') {
                if (!subcategoryId || !activityType) {
                    Alert.alert('Error', 'Missing subcategory_id or activity_type');
                    setLoading(false);
                    return;
                }
                const res = await api.get('/sickline/questions', { params: { subcategory_id: subcategoryId, activity_type: activityType } });
                data = res.data.groups ? res.data.groups.flatMap(g => g.questions || []) : (Array.isArray(res.data) ? res.data : []);
            } else if (categoryName === 'WSP Examination') {
                if (!scheduleId) {
                    Alert.alert('Error', 'schedule_id is missing. Cannot load WSP questions.');
                    setLoading(false);
                    return;
                }
                const res = await api.get('/wsp/questions', { params: { schedule_id: scheduleId, coach_id: coachId } });
                // WSP returns an array of groups [{item_name, questions}] - Flatten it
                data = Array.isArray(res.data) ? res.data.flatMap(g => g.questions || []) : [];
            } else {
                data = await getQuestionsByActivity(activityId);
            }

            setQuestions(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch questions');
        } finally {
            setLoading(false);
        }
    };

    const fetchReasons = async (questionId) => {
        try {
            setLoadingReasons(true);
            const data = await getReasonsByQuestion(questionId);
            // Handle both array response and { reasons: [] } object response
            const reasons = data?.reasons || data || [];
            setQuestionReasons(Array.isArray(reasons) ? reasons : []);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to fetch reasons');
        } finally {
            setLoadingReasons(false);
        }
    };

    const openAddModal = () => {
        setEditingQuestion(null);
        setQuestionText('');
        setAnswerType('BOOLEAN');
        setUnit('');
        setSpecifiedValue('');
        setQuestionReasons([]);
        setModalVisible(true);
    };

    const openEditModal = (question) => {
        setEditingQuestion(question);
        setQuestionText(question.text);
        setAnswerType(question.answer_type || 'BOOLEAN');
        setUnit(question.unit || '');
        setSpecifiedValue(question.specified_value || '');
        setQuestionReasons([]); // Clear prev
        setModalVisible(true);
        fetchReasons(question.id);
    };

    const handleSaveQuestion = async () => {
        if (!questionText.trim()) {
            Alert.alert('Validation Error', 'Question text cannot be empty');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                text: questionText.trim(),
                answer_type: answerType,
                unit: answerType === 'VALUE' ? unit.trim() : null,
                specified_value: specifiedValue.trim() || null
            };

            if (editingQuestion) {
                // Update
                const response = await updateQuestion(editingQuestion.id, payload);
                const updated = response.question;
                // Update local list
                setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
                Alert.alert('Success', 'Question updated successfully');
            } else {
                // Create
                const response = await createQuestion({
                    ...payload,
                    activity_id: activityId,
                });
                const created = response.question;
                setQuestions(prev => [...prev, created]);
                Alert.alert('Success', 'Question created. You can now edit it to add reasons.');
                setModalVisible(false); // Close on create
            }
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to save question');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddReason = async () => {
        if (!newReasonText.trim()) return;
        if (!editingQuestion) return; // Should not happen if UI is correct

        setAddingReason(true);
        try {
            const added = await createReason({
                question_id: editingQuestion.id,
                text: newReasonText.trim()
            });
            setQuestionReasons(prev => [...prev, added]);
            setNewReasonText('');
        } catch (err) {
            Alert.alert('Error', 'Failed to add reason');
        } finally {
            setAddingReason(false);
        }
    };

    const handleDeleteReason = async (reasonId) => {
        Alert.alert('Confirm Delete', 'Delete this reason?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteReason(reasonId);
                        setQuestionReasons(prev => prev.filter(r => r.id !== reasonId));
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete reason');
                    }
                }
            }
        ]);
    };

    const handleDeleteQuestion = (id) => {
        Alert.alert('Confirm Delete', 'Delete this question and all its reasons?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteQuestion(id);
                        setQuestions(prev => prev.filter(q => q.id !== id));
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete question');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item, index }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardNumber}>Q{index + 1}</Text>
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => openEditModal(item)}
                    >
                        <Text style={styles.editBtnText}>Edit / Reasons</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteQuestion(item.id)}
                    >
                        <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <Text style={styles.cardText}>{item.text}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.title}>{categoryName} - {activityType}</Text>
                    <Text style={styles.count}>{questions.length} Questions</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                    <Text style={styles.addBtnText}>+ Add Question</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={questions}
                    keyExtractor={(item, index) => (item?.id || index).toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No questions found</Text>
                            <Text style={styles.emptySub}>Tap "Add Question" to create one</Text>
                        </View>
                    }
                />
            )}

            {/* Edit/Add Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingQuestion ? 'Edit Question' : 'Add New Question'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Text style={styles.closeText}>Close</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Question Text:</Text>
                            <TextInput
                                style={styles.questionInput}
                                value={questionText}
                                onChangeText={setQuestionText}
                                multiline
                                placeholder="Enter question text..."
                            />

                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSaveQuestion}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingQuestion ? 'Update' : 'Save Question'}</Text>}
                            </TouchableOpacity>

                            <Text style={styles.label}>Answer Type:</Text>
                            <View style={styles.tabRow}>
                                <TouchableOpacity
                                    style={[styles.tab, answerType === 'BOOLEAN' && styles.activeTab]}
                                    onPress={() => setAnswerType('BOOLEAN')}
                                >
                                    <Text style={[styles.tabText, answerType === 'BOOLEAN' && styles.activeTabText]}>Toggle (OK/DEF)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, answerType === 'VALUE' && styles.activeTab]}
                                    onPress={() => setAnswerType('VALUE')}
                                >
                                    <Text style={[styles.tabText, answerType === 'VALUE' && styles.activeTabText]}>Value Input</Text>
                                </TouchableOpacity>
                            </View>

                            {answerType === 'VALUE' && (
                                <View>
                                    <Text style={styles.label}>Measurement Unit:</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={unit}
                                        onChangeText={setUnit}
                                        placeholder="e.g. mm, Volts, Amps"
                                    />
                                </View>
                            )}

                            <Text style={styles.label}>Specified Value (Optional Reference):</Text>
                            <TextInput
                                style={styles.input}
                                value={specifiedValue}
                                onChangeText={setSpecifiedValue}
                                placeholder="e.g. 5.5mm or 230V"
                            />

                            {/* Reasons Section - Only visible when editing existing question */}
                            {editingQuestion && (
                                <View style={styles.reasonsSection}>
                                    <View style={styles.divider} />
                                    <Text style={styles.sectionTitle}>Reasons (for "No" answer)</Text>

                                    {loadingReasons ? (
                                        <ActivityIndicator color="#2563eb" style={{ marginVertical: 10 }} />
                                    ) : (
                                        <View>
                                            {questionReasons.map((reason, idx) => (
                                                <View key={reason.id} style={styles.reasonItem}>
                                                    <Text style={styles.reasonText}>{idx + 1}. {reason.text}</Text>
                                                    <TouchableOpacity onPress={() => handleDeleteReason(reason.id)}>
                                                        <Text style={styles.removeText}>Remove</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                            {questionReasons.length === 0 && <Text style={styles.noReasonsText}>No reasons added yet.</Text>}
                                        </View>
                                    )}

                                    <View style={styles.addReasonContainer}>
                                        <TextInput
                                            style={styles.reasonInput}
                                            value={newReasonText}
                                            onChangeText={setNewReasonText}
                                            placeholder="New reason..."
                                        />
                                        <TouchableOpacity
                                            style={styles.addReasonBtn}
                                            onPress={handleAddReason}
                                            disabled={addingReason || !newReasonText.trim()}
                                        >
                                            {addingReason ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addReasonBtnText}>Add</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitleContainer: { flex: 1, marginRight: 10 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', flexWrap: 'wrap' },
    count: { fontSize: 13, color: '#64748b', marginTop: 2 },
    addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, minWidth: 100, alignItems: 'center' },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardNumber: { fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12 },
    cardActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
    editBtn: { backgroundColor: '#f0f9ff' },
    editBtnText: { color: '#0284c7', fontSize: 12, fontWeight: '600' },
    deleteBtn: { backgroundColor: '#fef2f2' },
    deleteBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
    cardText: { fontSize: 15, color: '#334155', lineHeight: 20 },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, fontWeight: 'bold', color: '#64748b' },
    emptySub: { color: '#94a3b8', marginTop: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    closeText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6 },
    questionInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
    saveBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

    // Reasons Section inside Modal
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },
    reasonsSection: { flex: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
    reasonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    reasonText: { flex: 1, color: '#334155', fontSize: 14 },
    removeText: { color: '#ef4444', fontSize: 12, fontWeight: '600', marginLeft: 10 },
    noReasonsText: { color: '#94a3b8', fontStyle: 'italic', marginVertical: 8 },
    addReasonContainer: { flexDirection: 'row', marginTop: 16, gap: 10 },
    reasonInput: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    addReasonBtn: { backgroundColor: '#10b981', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
    addReasonBtnText: { color: '#fff', fontWeight: 'bold' },
    tabRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 15 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: '#2563eb' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    activeTabText: { color: '#fff' },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15 }
});

export default QuestionManagementScreen;
