import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useStore } from '../store/StoreContext';
import { Ionicons } from '@expo/vector-icons';
import { getReports } from '../api/api';

const CompartmentSelectionScreen = ({ route, navigation }) => {
    const params = route.params;
    const { setDraft } = useStore();
    const [existingReports, setExistingReports] = useState({ major: 0, minor: 0 });
    const [loading, setLoading] = useState(true);

    // Logic to determine compartments based on subcategory name
    const isLavatory = params.subcategoryName?.toLowerCase().includes('lavatory');
    const compartments = isLavatory
        ? ['L1', 'L2', 'L3', 'L4']
        : ['D1', 'D2', 'D3', 'D4'];

    useEffect(() => {
        checkExistingReports();
    }, []);

    const checkExistingReports = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const result = await getReports({
                coach_no: params.coachNumber,
                start_date: today,
                end_date: today
            });

            // Filter for reports matching current subcategory and activity types (case-insensitive)
            const currentSubBase = params.subcategoryName?.split(' [')[0].toLowerCase();

            const reports = result?.data || [];

            const matches = reports.filter(r => {
                const rSubBase = r.subcategory_name?.split(' [')[0].toLowerCase();
                return rSubBase === currentSubBase && r.subcategory_name?.includes('[');
            });

            const majorCount = matches.filter(r => r.severity === 'Major').length;
            const minorCount = matches.filter(r => r.severity === 'Minor').length;

            setExistingReports({ major: majorCount, minor: minorCount });
        } catch (err) {
            console.error('Error checking existing reports:', err);
        } finally {
            setLoading(false);
        }
    };

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    style={{ marginRight: 15, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                    onPress={() => navigation.navigate('CombinedSummary', { ...params })}
                >
                    <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 12 }}>Summary</Text>
                </TouchableOpacity>
            )
        });
    }, [navigation, params]);

    const handleSelect = (comp) => {
        setDraft(prev => ({
            ...prev,
            compartment: comp
        }));

        navigation.navigate('ActivitySelection', {
            ...params,
            compartment: comp
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.pills}>
                <View style={styles.pill}><Text style={styles.pillText}>COACH: {params.coachNumber}</Text></View>
                <View style={[styles.pill, styles.activePill]}><Text style={[styles.pillText, { color: '#fff' }]}>{params.categoryName}</Text></View>
                <View style={[styles.pill, { backgroundColor: '#eff6ff' }]}><Text style={[styles.pillText, { color: '#2563eb' }]}>{params.subcategoryName}</Text></View>
            </View>

            <Text style={styles.title}>Select Compartment</Text>
            <Text style={styles.subtitle}>Choose specific {isLavatory ? 'Lavatory' : 'Door'} for inspection</Text>

            <FlatList
                data={compartments}
                keyExtractor={(item) => item}
                numColumns={2}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSelect(item)}
                    >
                        <View style={styles.iconBox}>
                            <Ionicons
                                name={isLavatory ? "water-outline" : "exit-outline"}
                                size={24}
                                color="#2563eb"
                            />
                        </View>
                        <Text style={styles.compName}>{item}</Text>
                        <Text style={styles.compSub}>Tap to start inspection</Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.list}
                ListFooterComponent={() => (
                    <View style={styles.summarySection}>
                        <View style={styles.divider} />
                        <Text style={styles.summaryTitle}>Area Summary</Text>
                        <Text style={styles.summarySubtitle}>Combined reporting for all compartments</Text>

                        {loading ? (
                            <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
                        ) : (
                            <View style={styles.summaryActions}>
                                {existingReports.major >= 2 ? (
                                    <TouchableOpacity
                                        style={[styles.combinedBtn, { backgroundColor: '#ef4444' }]}
                                        onPress={() => navigation.navigate('CombinedReport', {
                                            coach_id: params.coachId,
                                            subcategory_id: params.subcategoryId,
                                            activity_type: 'Major',
                                            date: new Date().toISOString().split('T')[0]
                                        })}
                                    >
                                        <Ionicons name="grid-outline" size={18} color="#fff" />
                                        <Text style={styles.combinedBtnText}>
                                            View Combined Major Report {existingReports.major < 4 ? '(Partial)' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}

                                {existingReports.minor >= 2 ? (
                                    <TouchableOpacity
                                        style={[styles.combinedBtn, { backgroundColor: '#f59e0b' }]}
                                        onPress={() => navigation.navigate('CombinedReport', {
                                            coach_id: params.coachId,
                                            subcategory_id: params.subcategoryId,
                                            activity_type: 'Minor',
                                            date: new Date().toISOString().split('T')[0]
                                        })}
                                    >
                                        <Ionicons name="grid-outline" size={18} color="#fff" />
                                        <Text style={styles.combinedBtnText}>
                                            View Combined Minor Report {existingReports.minor < 4 ? '(Partial)' : ''}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}

                                {existingReports.major < 2 && existingReports.minor < 2 && (
                                    <View style={styles.infoBox}>
                                        <Ionicons name="information-circle-outline" size={20} color="#64748b" />
                                        <Text style={styles.infoText}>
                                            Complete at least 2 compartments to view combined report
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    pills: { flexDirection: 'row', marginBottom: 20, flexWrap: 'wrap', gap: 6 },
    pill: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    activePill: { backgroundColor: '#2563eb' },
    pillText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginBottom: 30 },
    list: { paddingBottom: 20 },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 6,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        minHeight: 140
    },
    iconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    compName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    compSub: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summarySection: { marginTop: 20, paddingBottom: 40 },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 20 },
    summaryTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    summarySubtitle: { fontSize: 12, color: '#64748b', marginBottom: 20 },
    summaryActions: { gap: 12 },
    combinedBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    combinedBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 10 },
    infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    infoText: { fontSize: 12, color: '#64748b', marginLeft: 10, flex: 1 }
});

export default CompartmentSelectionScreen;
