import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../api/api';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import HorizontalRake from '../components/rake/HorizontalRake';
import RakeStatusLegend from '../components/rake/RakeStatusLegend';
import CoachHeaderCard from '../components/coach/CoachHeaderCard';
import CoachActionPanel from '../components/coach/CoachActionPanel';
import { useStore } from '../store/StoreContext';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const PitLineTrainDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { user } = useStore();
    const { train_id, train_number } = route.params;
    const trainId = train_id;
    const trainNumber = train_number;

    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCoachId, setActiveCoachId] = useState(null);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newCoachNumber, setNewCoachNumber] = useState('');

    // ─── Existing API call — UNCHANGED ──────────────────────────────────────
    const fetchCoaches = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(`/pitline/coaches?train_id=${trainId}`);
            const list = response.data || [];
            setCoaches(list);
            // Auto-select first coach if none selected
            if (list.length > 0 && !activeCoachId) {
                setActiveCoachId(list[0].id);
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to fetch coaches');
        } finally {
            setLoading(false);
        }
    }, [trainId]);

    useFocusEffect(
        useCallback(() => {
            fetchCoaches();
        }, [trainId])
    );

    // ─── Add / delete coach — UNCHANGED ─────────────────────────────────────
    const handleAddCoach = () => {
        setNewCoachNumber('');
        setAddModalVisible(true);
    };

    const confirmAddCoach = async () => {
        if (!newCoachNumber.trim()) {
            Alert.alert('Error', 'Please enter a coach number');
            return;
        }
        if (!/^[0-9]{6}$/.test(newCoachNumber.trim())) {
            Alert.alert('Invalid', 'Coach number must be exactly 6 digits (e.g. 123456)');
            return;
        }
        try {
            await api.post('/pitline/coaches/add', { train_id: trainId, coach_number: newCoachNumber.trim() });
            setAddModalVisible(false);
            setNewCoachNumber('');
            fetchCoaches();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to add coach');
        }
    };

    const handleDeleteCoach = (id) => {
        Alert.alert('Delete', 'Delete this coach?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/pitline/coaches/${id}`);
                        if (activeCoachId === id) setActiveCoachId(null);
                        fetchCoaches();
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                }
            }
        ]);
    };

    // ─── Update coach number — NEW ───────────────────────────────────────
    const handleUpdateCoach = async (coachId, payload) => {
        // May throw — CoachHeaderCard catches and shows error inline
        const response = await api.put(`/pitline/coaches/${coachId}`, payload);
        const updated = response.data;
        // Update only the changed coach in local state — no full reload
        setCoaches(prev => prev.map(c => c.id === coachId ? { ...c, ...updated } : c));
    };

    // ─── Navigation — UNCHANGED ─────────────────────────────────────────────
    const activeCoach = coaches.find(c => c.id === activeCoachId) || null;
    const activePosition = activeCoach ? coaches.indexOf(activeCoach) : null;

    const handleStartInspection = () => {
        if (!activeCoach) return;
        navigation.navigate('PitLineSelectArea', {
            train_id: trainId,
            train_number: trainNumber,
            coach_id: activeCoach.id,
            coach_number: activeCoach.coach_number,
        });
    };

    const handleViewDefects = () => {
        if (!activeCoach) return;
        navigation.navigate('PitLineSelectArea', {
            train_id: trainId,
            train_number: trainNumber,
            coach_id: activeCoach.id,
            coach_number: activeCoach.coach_number,
        });
    };

    const handleEditQuestions = () => {
        // Admin-only flow — no-op here; edit questions available from select area screen
        if (!activeCoach) return;
        navigation.navigate('PitLineSelectArea', {
            train_id: trainId,
            train_number: trainNumber,
            coach_id: activeCoach.id,
            coach_number: activeCoach.coach_number,
        });
    };

    return (
        <View style={styles.container}>
            {/* ── Header ───────────────────────────────────────────────────── */}
            <AppHeader
                title={`Train ${trainNumber}`}
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] })}
                rightComponent={
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddCoach}>
                        <MaterialCommunityIcons name="plus" size={16} color={COLORS.surface} />
                        <Text style={styles.addText}>Add Coach</Text>
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
                <>
                    {/* ── STICKY Horizontal Rake ────────────────────────────── */}
                    {coaches.length > 0 ? (
                        <>
                            <HorizontalRake
                                coaches={coaches}
                                activeCoachId={activeCoachId}
                                completionMap={{}}
                                defectMap={{}}
                                onCoachSelect={(c) => setActiveCoachId(c.id)}
                                onCoachDelete={handleDeleteCoach}
                            />
                            <RakeStatusLegend />
                        </>
                    ) : (
                        <View style={styles.emptyRake}>
                            <MaterialCommunityIcons name="train" size={48} color={COLORS.placeholder} />
                            <Text style={styles.emptyText}>No coaches yet — tap Add Coach</Text>
                        </View>
                    )}

                    {/* ── Scrollable Coach Detail Panel ─────────────────────── */}
                    <ScrollView
                        style={styles.detailScroll}
                        contentContainerStyle={styles.detailContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <CoachHeaderCard
                            coach={activeCoach}
                            completion={0}
                            defectCount={0}
                            position={activePosition != null ? activePosition + 1 : null}
                            onUpdateCoach={handleUpdateCoach}
                        />

                        <CoachActionPanel
                            coach={activeCoach}
                            defectCount={0}
                            onStartInspection={handleStartInspection}
                            onViewDefects={handleViewDefects}
                        />

                        {/* Info banner */}
                        {coaches.length > 0 && (
                            <View style={styles.infoBanner}>
                                <MaterialCommunityIcons name="information-outline" size={20} color="#3B82F6" />
                                <Text style={styles.infoText}>
                                    Tap any coach above to view its details and start inspection.
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </>
            )}

            {/* ── Add Coach Modal — UNCHANGED ─────────────────────────────── */}
            <Modal
                visible={addModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <View style={styles.modalBox}>
                            <Text style={styles.modalTitle}>Add Coach</Text>
                            <Text style={styles.modalSubtitle}>Enter a unique 6-digit number (e.g. 123456)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={newCoachNumber}
                                onChangeText={t => setNewCoachNumber(t.replace(/[^0-9]/g, ''))}
                                placeholder="e.g. 123456"
                                placeholderTextColor={COLORS.placeholder}
                                keyboardType="numeric"
                                maxLength={6}
                                autoFocus
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnCancel]}
                                    onPress={() => setAddModalVisible(false)}
                                >
                                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnConfirm]}
                                    onPress={confirmAddCoach}
                                >
                                    <Text style={styles.modalBtnConfirmText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
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
        gap: 6,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addText: { color: COLORS.surface, fontWeight: '600', fontSize: 14 },
    emptyRake: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    emptyText: {
        color: COLORS.placeholder,
        fontSize: 14,
        fontStyle: 'italic',
    },
    detailScroll: { flex: 1 },
    detailContent: { paddingBottom: SPACING.xl * 2 + 16 },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: '#EFF6FF',
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    infoText: {
        color: '#1E40AF',
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    // Modal styles — UNCHANGED
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    modalBox: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        width: '100%',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
    modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
    modalInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: 16,
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalBtn: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
    modalBtnCancel: { backgroundColor: COLORS.disabled },
    modalBtnCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
    modalBtnConfirm: { backgroundColor: COLORS.primary },
    modalBtnConfirmText: { color: COLORS.surface, fontWeight: '600' },
});

export default PitLineTrainDetailScreen;
