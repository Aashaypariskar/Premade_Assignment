import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert, Modal, Animated } from 'react-native';
import { getAmenitySubcategories, getCommissionaryProgress, completeCommissionarySession } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const CommissionaryDashboardScreen = ({ route, navigation }) => {
    const { sessionId, coachNumber, compartmentId, status } = route.params;
    const [progressStats, setProgressStats] = useState({ completed_count: 0, total_expected: 112, status: 'IN_PROGRESS' });
    const [breakdown, setBreakdown] = useState({});
    const [loading, setLoading] = useState(true);
    const [finalizing, setFinalizing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const progressAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        const percentage = progressStats.total_expected > 0
            ? progressStats.completed_count / progressStats.total_expected
            : 0;
        console.log(`[DEBUG] Dashboard Progress Update: ${progressStats.completed_count}/${progressStats.total_expected} (${(percentage * 100).toFixed(2)}%)`);
        Animated.timing(progressAnim, {
            toValue: percentage,
            duration: 800,
            useNativeDriver: false
        }).start();
    }, [progressStats.completed_count, progressStats.total_expected]);

    const loadData = async () => {
        try {
            const [subs, progData] = await Promise.all([
                getAmenitySubcategories('Amenity', 1),
                getCommissionaryProgress(coachNumber)
            ]);
            console.log('[DEBUG] Dashboard loadData success:', progData.completed_count, '/', progData.total_expected);
            setSubcategories(subs);
            setProgressStats({
                completed_count: progData.completed_count || 0,
                total_expected: progData.total_expected || 112,
                status: progData.status || 'IN_PROGRESS'
            });
            setBreakdown(progData.breakdown || {});
        } catch (err) {
            console.error('[DEBUG] Dashboard loadData error:', err);
            Alert.alert('Error', 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        try {
            setFinalizing(true);
            await completeCommissionarySession(coachNumber);
            setShowModal(false);
            Alert.alert('Success', 'Inspection Finalized Successfully', [
                { text: 'OK', onPress: () => navigation.navigate('History') }
            ]);
        } catch (err) {
            Alert.alert('Error', 'Failed to finalize session');
        } finally {
            setFinalizing(false);
        }
    };

    const handleSelect = (sub, index) => {
        navigation.navigate('CommissionaryQuestions', {
            sessionId: progressStats.session_id || sessionId,
            coachNumber,
            compartmentId,
            subcategoryId: sub.id,
            subcategoryName: sub.name,
            status: progressStats.status,
            subcategories,
            currentIndex: index
        });
    };

    const renderItem = ({ item, index }) => {
        const areaProgress = (progressStats.progress || []).find(p => p.subcategory_id === item.id);
        const compStatus = areaProgress?.compartmentStatus?.[compartmentId] || { major: false, minor: false, isComplete: false };

        const isMajorDone = compStatus.major;
        const isMinorDone = compStatus.minor;
        const bothDone = compStatus.isComplete;

        let badgeText = "Pending";
        let badgeColor = "#94a3b8"; // grey
        if (bothDone) {
            badgeText = "Completed";
            badgeColor = "#10b981"; // green
        } else if (isMajorDone || isMinorDone) {
            badgeText = "Partial";
            badgeColor = "#f59e0b"; // yellow
        }

        return (
            <TouchableOpacity
                style={[styles.card, bothDone && styles.cardComplete]}
                onPress={() => handleSelect(item, index)}
            >
                <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.badgeText}>{badgeText}</Text>
                </View>

                <View style={[styles.iconBox, bothDone && styles.iconBoxComplete]}>
                    <Ionicons
                        name={item.name.toLowerCase().includes('undergear') ? 'settings-outline' : 'cube-outline'}
                        size={24}
                        color={bothDone ? "#fff" : "#2563eb"}
                    />
                </View>
                <Text style={styles.subName} numberOfLines={2}>{item.name}</Text>

                <View style={styles.indicators}>
                    <View style={[styles.miniBadge, isMinorDone && styles.miniBadgeDone]}>
                        <Ionicons name={isMinorDone ? "checkmark-circle" : "close-circle"} size={10} color={isMinorDone ? "#fff" : "#94a3b8"} />
                        <Text style={[styles.miniBadgeText, isMinorDone && styles.miniBadgeTextDone]}>Minor</Text>
                    </View>
                    <View style={[styles.miniBadge, isMajorDone && styles.miniBadgeDone]}>
                        <Ionicons name={isMajorDone ? "checkmark-circle" : "close-circle"} size={10} color={isMajorDone ? "#fff" : "#94a3b8"} />
                        <Text style={[styles.miniBadgeText, isMajorDone && styles.miniBadgeTextDone]}>Major</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    const progressPercent = Math.round((progressStats.completed_count / progressStats.total_expected) * 100) || 0;
    const isLocked = progressStats.status === 'COMPLETED';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                {isLocked && (
                    <View style={styles.lockedBadge}>
                        <Ionicons name="lock-closed" size={14} color="#fff" />
                        <Text style={styles.lockedText}>Locked</Text>
                    </View>
                )}
                <View style={styles.pills}>
                    <View style={styles.pill}><Text style={styles.pillText}>{coachNumber}</Text></View>
                    <View style={[styles.pill, { backgroundColor: '#2563eb' }]}><Text style={[styles.pillText, { color: '#fff' }]}>{compartmentId}</Text></View>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Phase-wise Progress</Text>
                    <Text style={styles.progressValue}>{progressPercent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <Animated.View
                        style={[
                            styles.progressBarFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressMeta}>
                    {progressStats.completed_count} / {progressStats.total_expected} Activity Blocks Completed
                </Text>
            </View>

            <Text style={styles.title}>Areas to Inspect</Text>
            <Text style={styles.subtitle}>Complete both Major and Minor for each area</Text>

            <FlatList
                data={subcategories}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.finalizeBtn, progressPercent < 100 && styles.finalizeBtnDisabled, isLocked && { backgroundColor: '#10b981' }]}
                    onPress={() => isLocked ? null : setShowModal(true)}
                    disabled={progressPercent < 100 || isLocked}
                >
                    <Ionicons name={isLocked ? "checkmark-done-circle" : "cloud-upload-outline"} size={20} color="#fff" />
                    <Text style={styles.finalizeBtnText}>
                        {isLocked ? "Inspection Completed" : "Finalize Inspection"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backBtnInline}
                    onPress={() => navigation.navigate('CommissionaryCompartment', { sessionId, coachNumber, status: progressStats.status })}
                >
                    <Text style={styles.backBtnTextInline}>Change Compartment</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={showModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconBox}>
                            <Ionicons name="alert-circle" size={40} color="#2563eb" />
                        </View>
                        <Text style={styles.modalTitle}>Confirm Final Submission</Text>
                        <Text style={styles.modalMsg}>
                            You have completed all inspection areas. After submission, this session will be locked and cannot be edited.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleFinalize} disabled={finalizing}>
                                {finalizing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirm & Submit</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, marginBottom: 10 },
    pills: { flexDirection: 'row', gap: 6 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },

    progressSection: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 20, elevation: 2 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    progressTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
    progressValue: { fontSize: 16, fontWeight: '900', color: '#2563eb' },
    progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#2563eb' },
    progressMeta: { fontSize: 10, color: '#94a3b8', marginTop: 8, textAlign: 'right', fontWeight: 'bold' },

    title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 12, color: '#64748b', marginBottom: 15 },
    list: { paddingBottom: 120 },

    card: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 6,
        padding: 12,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        position: 'relative',
        overflow: 'hidden'
    },
    cardComplete: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7', borderWidth: 1 },

    badge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 8, paddingVertical: 2, borderBottomLeftRadius: 10 },
    badgeText: { fontSize: 8, fontWeight: 'bold', color: '#fff' },

    iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    iconBoxComplete: { backgroundColor: '#10b981' },
    subName: { fontSize: 11, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', height: 32 },

    indicators: { flexDirection: 'row', gap: 4, marginTop: 8 },
    miniBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f1f5f9' },
    miniBadgeDone: { backgroundColor: '#10b981' },
    miniBadgeText: { fontSize: 8, fontWeight: 'bold', color: '#94a3b8' },
    miniBadgeTextDone: { color: '#fff' },

    footer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
    finalizeBtn: { backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 10, elevation: 4 },
    finalizeBtnDisabled: { backgroundColor: '#94a3b8', elevation: 0 },
    finalizeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    backBtnInline: { marginTop: 15, alignSelf: 'center' },
    backBtnTextInline: { fontSize: 12, color: '#64748b', fontWeight: 'bold', textDecorationLine: 'underline' },

    lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    lockedText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 25, alignItems: 'center', width: '100%' },
    modalIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
    modalMsg: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 25 },
    modalActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: '#f1f5f9' },
    cancelBtnText: { color: '#64748b', fontWeight: 'bold' },
    confirmBtn: { flex: 2, padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: '#2563eb' },
    confirmBtnText: { color: '#fff', fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CommissionaryDashboardScreen;
