import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getAmenitySubcategories, getSickLineProgress, completeSickLineSession } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const SickLineDashboardScreen = ({ route, navigation }) => {
    const params = route.params;
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { setDraft } = useStore();

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const [data, prog] = await Promise.all([
                getAmenitySubcategories('Amenity', 1),
                getSickLineProgress(params.coachNumber)
            ]);
            setSubcategories(data);
            setProgress(prog);
        } catch (err) {
            Alert.alert('Error', 'Could not fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSubmit = async () => {
        if (!progress?.fully_complete) {
            Alert.alert('Incomplete', 'Please complete all areas (Major & Minor) before submitting.');
            return;
        }

        Alert.alert('Final Submission', 'Are you sure you want to complete this Sick Line inspection? This will lock all records.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Submit',
                onPress: async () => {
                    try {
                        setSubmitting(true);
                        await completeSickLineSession(params.coachNumber);
                        Alert.alert('Success', 'Sick Line Inspection COMPLETED!', [
                            { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
                        ]);
                    } catch (err) {
                        Alert.alert('Error', 'Submission failed');
                    } finally {
                        setSubmitting(false);
                    }
                }
            }
        ]);
    };

    const handleSelect = (sub) => {
        setDraft(prev => ({
            ...prev,
            subcategory_id: sub.id,
            subcategory_name: sub.name
        }));

        navigation.navigate('SickLineActivitySelection', {
            ...params,
            subcategoryId: sub.id,
            subcategoryName: sub.name
        });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
                    <Ionicons name="home-outline" size={26} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.pills}>
                    <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coachNumber}</Text></View>
                    <View style={[styles.pill, styles.activePill]}><Text style={[styles.pillText, { color: '#fff' }]}>{params.categoryName}</Text></View>
                </View>
                <View style={{ width: 26 }} />
            </View>

            <Text style={styles.title}>Select Area</Text>
            <Text style={styles.subtitle}>Choose an area for Sick Line inspection</Text>

            <FlatList
                data={subcategories}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                renderItem={({ item }) => {
                    const status = progress?.perAreaStatus?.find(s => s.subcategory_id === item.id);
                    const hasMajor = status?.hasMajor || false;
                    const hasMinor = status?.hasMinor || false;

                    let badgeText = "Pending";
                    let badgeColor = "#94a3b8"; // grey
                    if (hasMajor && hasMinor) {
                        badgeText = "Completed";
                        badgeColor = "#10b981"; // green
                    } else if (hasMajor || hasMinor) {
                        badgeText = "Partial";
                        badgeColor = "#f59e0b"; // orange
                    }

                    return (
                        <TouchableOpacity
                            style={styles.subCard}
                            onPress={() => handleSelect(item)}
                        >
                            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                                <Text style={styles.badgeText}>{badgeText}</Text>
                            </View>
                            <View style={styles.iconBox}>
                                <Ionicons name="build-outline" size={24} color="#f59e0b" />
                            </View>
                            <Text style={styles.subName}>{item.name}</Text>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={styles.list}
                ListFooterComponent={() => (
                    progress ? (
                        <View style={styles.footer}>
                            <View style={styles.progressCard}>
                                <Text style={styles.progressTitle}>Global Progress</Text>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${progress.progress_percentage || 0}%` }]} />
                                </View>
                                <Text style={styles.progressText}>
                                    {progress.completed_count} / {progress.total_expected} Areas Fully Completed
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    (!progress.fully_complete || submitting) && { backgroundColor: '#94a3b8' }
                                ]}
                                onPress={handleFinalSubmit}
                                disabled={!progress.fully_complete || submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-done-circle-outline" size={24} color="#fff" />
                                        <Text style={styles.submitBtnText}>Final Session Submit</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : null
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    pills: { flexDirection: 'row', marginBottom: 20 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8 },
    activePill: { backgroundColor: '#f59e0b' },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginBottom: 30 },
    list: { paddingBottom: 20 },
    subCard: { flex: 1, backgroundColor: '#fff', margin: 6, padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, minHeight: 140 },
    iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    subName: { fontSize: 13, fontWeight: 'bold', color: '#334155', textAlign: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    footer: { marginTop: 20, paddingBottom: 40 },
    progressCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 2 },
    progressTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
    progressBar: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: '#10b981' },
    progressText: { fontSize: 12, color: '#64748b' },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', padding: 18, borderRadius: 16, elevation: 4 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    badge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});

export default SickLineDashboardScreen;
