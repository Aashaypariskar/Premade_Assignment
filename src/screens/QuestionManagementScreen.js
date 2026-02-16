import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getQuestionsByActivity, createQuestion, deleteQuestion } from '../api/api';

const QuestionManagementScreen = ({ route, navigation }) => {
    const { activityId, activityType, categoryName } = route.params;

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const data = await getQuestionsByActivity(activityId);
            setQuestions(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch questions');
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = async () => {
        if (!newQuestionText.trim()) {
            Alert.alert('Validation Error', 'Question text cannot be empty');
            return;
        }

        setSubmitting(true);
        try {
            await createQuestion({
                activity_id: activityId,
                text: newQuestionText.trim()
            });
            Alert.alert('Success', 'Question added successfully');
            setNewQuestionText('');
            setModalVisible(false);
            fetchQuestions();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to create question');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteQuestion = (questionId, questionText) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete this question?\n\n"${questionText}"`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteQuestion(questionId);
                            Alert.alert('Success', 'Question deleted successfully');
                            fetchQuestions();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete question');
                        }
                    }
                }
            ]
        );
    };

    const renderQuestion = ({ item, index }) => (
        <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>Q{index + 1}</Text>
                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteQuestion(item.id, item.text)}
                >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.questionText}>{item.text}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading Questions...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Question Management</Text>
                    <Text style={styles.subtitle}>{categoryName} - {activityType} Activity</Text>
                    <Text style={styles.count}>{questions.length} Questions</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setModalVisible(true)}
                >
                    <Text style={styles.addBtnText}>+ Add Question</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={questions}
                keyExtractor={item => item.id.toString()}
                renderItem={renderQuestion}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No questions found</Text>
                        <Text style={styles.emptySub}>Tap "Add Question" to create one</Text>
                    </View>
                }
            />

            {/* Add Question Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Question</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter question text..."
                            value={newQuestionText}
                            onChangeText={setNewQuestionText}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setNewQuestionText('');
                                }}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.submitBtn]}
                                onPress={handleAddQuestion}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Add Question</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
    count: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    list: { padding: 16 },
    questionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
    questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    questionNumber: { fontSize: 12, fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fee2e2', borderRadius: 6 },
    deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
    questionText: { fontSize: 15, color: '#334155', lineHeight: 22 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b', fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#64748b' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
    modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 16, color: '#1e293b', minHeight: 100, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', marginTop: 20, gap: 12 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#f1f5f9' },
    cancelBtnText: { color: '#64748b', fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#2563eb' },
    submitBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default QuestionManagementScreen;
