import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { getAmenitySubcategories, getCommissionaryProgress, completeCommissionarySession } from '../api/api';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const AmenitySubcategoryScreen = ({ route, navigation }) => {
    const params = route.params;
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { setDraft } = useStore();

    useFocusEffect(
        useCallback(() => {
            loadSubcategories();
        }, [])
    );

    const loadSubcategories = async () => {
        try {
            const category_name = params.category_name || params.categoryName;
            const catForApi = category_name === 'Coach Commissionary' ? 'Amenity' : category_name;
            const data = await getAmenitySubcategories(catForApi, params.coach_id);
            setSubcategories(data);

            if (category_name === 'Coach Commissionary') {
                const prog = await getCommissionaryProgress(params.coach_number || params.coachNumber);
                setProgress(prog);
            }
        } catch (err) {
            Alert.alert('Error', 'Could not fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSubmit = async () => {
        if (!progress?.fully_complete) {
            Alert.alert('Incomplete', 'Please complete all areas and compartments (Major & Minor) before subitting.');
            return;
        }

        Alert.alert('Final Submission', 'Are you sure you want to complete this coach inspection? This will lock all records.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Submit',
                onPress: async () => {
                    try {
                        setSubmitting(true);
                        await completeCommissionarySession(params.coach_number || params.coachNumber);
                        Alert.alert('Success', 'Coach Commissioning Inspection COMPLETED!', [
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

        const navParams = {
            ...params,
            category_name: params.category_name || params.categoryName,
            subcategory_id: sub.id,
            subcategory_name: sub.name
        };

        if (sub.requires_compartment) {
            navigation.navigate('CompartmentSelection', navParams);
        } else {
            navigation.navigate('ActivitySelection', navParams);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={styles.container}>
            <AppHeader
                title="Select Area"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.content}>
                <View style={styles.pills}>
                    <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coach_number || params.coachNumber}</Text></View>
                    <View style={[styles.pill, styles.activePill]}>
                        <Text style={[styles.pillText, { color: '#fff' }]}>
                            {(() => {
                                const cat_name = params.category_name || params.categoryName;
                                return cat_name === 'Coach Commissionary' ? 'Coach Commissioning' : cat_name;
                            })()}
                        </Text>
                    </View>
                </View>

                <Text style={styles.title}>Select Area</Text>
                <Text style={styles.subtitle}>Choose an amenity area to inspect</Text>

                <FlatList
                    data={subcategories}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    renderItem={({ item }) => {
                        const status = progress?.perAreaStatus?.find(s => s.subcategory_id === item.id);
                        const isMajorDone = status?.majorTotal > 0 && status?.majorAnswered === status?.majorTotal;
                        const isMinorDone = status?.minorTotal > 0 && status?.minorAnswered === status?.minorTotal;

                        let badgeText = "Pending";
                        let badgeColor = COLORS.placeholder;
                        if (isMajorDone && isMinorDone) {
                            badgeText = "Completed";
                            badgeColor = COLORS.success;
                        } else if (isMajorDone || isMinorDone || (status?.majorAnswered > 0) || (status?.minorAnswered > 0)) {
                            badgeText = "Partial";
                            badgeColor = COLORS.warning;
                        }

                        return (
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => handleSelect(item)}
                            >
                                <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
                                    <Text style={styles.statusText}>{badgeText}</Text>
                                </View>
                                <View style={styles.iconBg}>
                                    <Ionicons name="apps-outline" size={24} color={COLORS.primary} />
                                </View>
                                <Text style={styles.subName}>{item.name}</Text>
                            </TouchableOpacity>
                        );
                    }}
                    contentContainerStyle={styles.list}
                    columnWrapperStyle={styles.gridRow}
                    ListFooterComponent={() => (
                        (params.category_name === 'Coach Commissionary' || params.categoryName === 'Coach Commissionary') && progress ? (
                            <View style={styles.footer}>
                                <View style={styles.progressCard}>
                                    <Text style={styles.progressTitle}>Global Progress</Text>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${progress.overall_compliance * 100}%` }]} />
                                    </View>
                                    <Text style={styles.progressText}>
                                        {progress.completed_count} / {progress.total_expected} Activity Blocks Completed
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.submitBtn,
                                        (!progress.fully_complete || submitting) && { backgroundColor: COLORS.disabled }
                                    ]}
                                    onPress={handleFinalSubmit}
                                    disabled={!progress.fully_complete || submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color={COLORS.surface} />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Ionicons name="checkmark-done-circle-outline" size={24} color={COLORS.surface} />
                                            <Text style={styles.submitText}>Final Session Submit</Text>
                                            <Text style={styles.submitSub}>This will lock all records</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : null
                    )}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, padding: SPACING.xl },
    pills: { flexDirection: 'row', marginBottom: SPACING.lg, gap: SPACING.sm },
    pill: { backgroundColor: COLORS.disabled, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.md },
    activePill: { backgroundColor: COLORS.secondary },
    pillText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textSecondary },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.md },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xxl },
    list: { paddingBottom: 100 },
    gridRow: { justifyContent: 'space-between', marginBottom: SPACING.md },
    card: {
        width: '48%',
        aspectRatio: 1.1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    iconBg: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm
    },
    subName: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
    statusBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: COLORS.success,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8
    },
    statusText: { color: COLORS.surface, fontSize: 8, fontWeight: 'bold' },
    footer: { marginTop: SPACING.xl, paddingBottom: SPACING.xxl },
    progressCard: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.md, elevation: 2 },
    progressTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.sm },
    progressBar: { height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.sm, overflow: 'hidden', marginBottom: SPACING.xs },
    progressFill: { height: '100%', backgroundColor: COLORS.success },
    progressText: { fontSize: 12, color: COLORS.textSecondary },
    submitBtn: {
        backgroundColor: COLORS.primary,
        margin: SPACING.xl,
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        elevation: 4
    },
    submitText: { color: COLORS.surface, fontWeight: 'bold', fontSize: 16 },
    submitSub: { color: COLORS.surface, fontSize: 10, opacity: 0.8, marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default AmenitySubcategoryScreen;
