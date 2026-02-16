import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReasonsByActivity, createReason, deleteReason } from '../api/api';

const ReasonManagementScreen = ({ route, navigation }) => {
    const { activityId, activityType, categoryName } = route.params;

    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newReasonText, setNewReasonText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchReasons();
    }, []);

    const fetchReasons = async () => {
        try {
            const data = await getReasonsByActivity(activityId);
            setReasons(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch reasons');
        } finally {
            setLoading(false);
        }
    };

    const handleAddReason = async () => {
        if (!newReasonText.trim()) {
            Alert.alert('Validation Error', 'Reason text cannot be empty');
            return;
        }

        setSubmitting(true);
        try {
            await createReason({
                activity_id: activityId,
                text: newReasonText.trim()
            });
            Alert.alert('Success', 'Reason added successfully');
            setNewReasonText('');
            setModalVisible(false);
            fetchReasons();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to create reason');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReason = (reasonId, reasonText) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete this reason?\n\n"${reasonText}"`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteReason(reasonId);
                            Alert.alert('Success', 'Reason deleted successfully');
                            fetchReasons();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete reason');
                        }
                    }
                }
            ]
        );
    };

    const renderReason = ({ item, index }) => (
        <View style={styles.reasonCard}>
            <View style={styles.reasonHeader}>
                <Text style={styles.reasonNumber}>R{index + 1}</Text>
                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteReason(item.id, item.text)}
                >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.reasonText}>{item.text}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading Reasons...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{categoryName} - {activityType}</Text>
                    <Text style={styles.count}>{reasons.length} Reasons</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setModalVisible(true)}
                >
                    <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={reasons}
                keyExtractor={item => item.id.toString()}
                renderItem={renderReason}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No reasons found</Text>
                        <Text style={styles.emptySub}>Tap "Add" to create one</Text>
                    </View>
                }
            />

            {/* Add Reason Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Reason</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter reason text..."
                            value={newReasonText}
                            onChangeText={setNewReasonText}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setNewReasonText('');
                                }}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.submitBtn]}
                                onPress={handleAddReason}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Add Reason</Text>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 0, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    count: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    list: { padding: 16 },
    reasonCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
    reasonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    reasonNumber: { fontSize: 12, fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fee2e2', borderRadius: 6 },
    deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
    reasonText: { fontSize: 15, color: '#334155', lineHeight: 22 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b', fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#64748b' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
    modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 16, color: '#1e293b' },
    modalActions: { flexDirection: 'row', marginTop: 20, gap: 12 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#f1f5f9' },
    cancelBtnText: { color: '#64748b', fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#2563eb' },
    submitBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default ReasonManagementScreen;
