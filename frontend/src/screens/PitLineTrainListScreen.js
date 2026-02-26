import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../api/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const PitLineTrainListScreen = () => {
    const navigation = useNavigation();
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [trainNumber, setTrainNumber] = useState('');

    const fetchTrains = async () => {
        try {
            setLoading(true);
            const response = await api.get('/pitline/trains');
            setTrains(response.data);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to fetch trains');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchTrains();
        }, [])
    );

    const handleAddTrain = async () => {
        if (!trainNumber.trim()) return;
        try {
            await api.post('/pitline/trains/add', { train_number: trainNumber.trim() });
            setTrainNumber('');
            setModalVisible(false);
            fetchTrains();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to add train');
        }
    };

    const handleDeleteTrain = (id) => {
        Alert.alert('Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/pitline/trains/${id}`);
                        fetchTrains();
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="train" size={24} color="#1E3A8A" />
                <Text style={styles.trainNum}>{item.train_number}</Text>
            </View>
            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.openBtn} onPress={() => navigation.navigate('PitLineTrainDetail', { train_id: item.id, train_number: item.train_number })}>
                    <Text style={styles.btnText}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteTrain(item.id)}>
                    <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <AppHeader
                title="Pit Line Trains"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
                rightComponent={
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                        <MaterialCommunityIcons name="plus" size={20} color={COLORS.surface} />
                        <Text style={styles.addText}>Add</Text>
                    </TouchableOpacity>
                }
            />

            {loading ? <ActivityIndicator size="large" color="#1E3A8A" /> : (
                <FlatList
                    data={trains}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No trains found. Add one to start.</Text>}
                />
            )}

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Train</Text>
                        <TextInput
                            style={[styles.input, { color: COLORS.textPrimary }]}
                            placeholder="Enter Train Number (e.g. 12137)"
                            placeholderTextColor={COLORS.placeholder}
                            value={trainNumber}
                            onChangeText={setTrainNumber}
                            autoFocus
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleAddTrain}>
                                <Text style={styles.saveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.md
    },
    addText: { color: COLORS.surface, marginLeft: 4, fontWeight: 'bold', fontSize: 13 },
    list: { padding: SPACING.lg },
    card: {
        backgroundColor: COLORS.surface,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.md,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
    trainNum: { fontSize: 18, fontWeight: 'bold', marginLeft: SPACING.sm, color: COLORS.primary },
    btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    openBtn: {
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: RADIUS.sm
    },
    btnText: { color: COLORS.secondary, fontWeight: 'bold' },
    delBtn: { padding: 8 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.xl },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.lg, color: COLORS.textPrimary },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: 12,
        fontSize: 16,
        marginBottom: SPACING.xl,
        color: COLORS.textPrimary
    },
    modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 8 },
    cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
    saveBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: RADIUS.sm
    },
    saveText: { color: COLORS.surface, fontWeight: 'bold' },
    empty: { textAlign: 'center', marginTop: 40, color: COLORS.placeholder }
});

export default PitLineTrainListScreen;
