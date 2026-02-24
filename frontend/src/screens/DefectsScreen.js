import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDefects, resolveDefect } from '../api/api';
import QuestionCard from '../components/QuestionCard';
import ImagePickerField from '../components/ImagePickerField';
import { BASE_URL } from '../config/environment';

const normalizeUrl = (uri) => {
    if (!uri) return null;
    if (uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://')) {
        return uri;
    }
    const cleanBase = BASE_URL.replace('/api/', '');
    const cleanUri = uri.startsWith('/') ? uri : `/${uri}`;
    return `${cleanBase}${cleanUri}`;
};
const DefectsScreen = ({ route, navigation }) => {
    const params = route?.params || {};
    const [defects, setDefects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState(null);

    // State for the active resolution being worked on
    const [resolutionData, setResolutionData] = useState({
        remark: '',
        photo: null
    });

    useEffect(() => {
        fetchDefects();
    }, []);

    const fetchDefects = async () => {
        try {
            setLoading(true);
            const type = params.mode === 'WSP' ? 'WSP' : (params.categoryName === 'Coach Commissionary' ? 'COMMISSIONARY' : (params.categoryName === 'Sick Line Examination' ? 'SICKLINE' : 'GENERIC'));

            const response = await getDefects({
                session_id: params.sessionId || params.session_id,
                subcategory_id: params.subcategoryId || params.subcategory_id,
                schedule_id: params.scheduleId || params.schedule_id,
                compartment_id: params.compartmentId || params.compartment,
                mode: params.mode,
                type
            });

            if (response.success) {
                setDefects(response.defects || []);
                if (response.defects?.length === 0) {
                    navigation.goBack();
                }
            }
        } catch (error) {
            console.error('Fetch Defects Error:', error);
            Alert.alert('Error', 'Failed to fetch pending defects');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (defectId) => {
        if (!resolutionData.photo) {
            Alert.alert('Missing Info', 'Please attach an After Photo.');
            return;
        }

        try {
            setResolvingId(defectId);
            const type = params.mode === 'WSP' ? 'WSP' : (params.categoryName === 'Coach Commissionary' ? 'COMMISSIONARY' : (params.categoryName === 'Sick Line Examination' ? 'SICKLINE' : 'GENERIC'));

            const formData = new FormData();
            formData.append('answer_id', defectId);
            formData.append('type', type);
            formData.append('resolution_remark', resolutionData.remark || '');

            if (resolutionData.photo) {
                const uri = resolutionData.photo;
                formData.append('photo', {
                    uri: uri.startsWith('file://') ? uri : `file://${uri}`,
                    name: uri.split('/').pop() || `resolution_${Date.now()}.jpg`,
                    type: 'image/jpeg'
                });
            }

            const response = await resolveDefect(formData);

            if (response.success) {
                // Clear local resolution state
                setResolutionData({ remark: '', photo: null });
                // Refresh list
                const remaining = defects.filter(d => d.id !== defectId);
                setDefects(remaining);

                if (remaining.length === 0) {
                    Alert.alert('Success', 'All defects resolved!', [
                        { text: 'OK', onPress: () => navigation.goBack() }
                    ]);
                }
            }
        } catch (error) {
            console.error('Resolve Error:', error);
            Alert.alert('Error', 'Failed to resolve defect');
        } finally {
            setResolvingId(null);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pending Defects ({defects.length})</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {defects.length > 0 ? (
                    defects.map((defect) => (
                        <View key={defect.id} style={styles.defectCard}>
                            <View style={styles.questionSection}>
                                <Text style={styles.qText}>{defect.question_text_snapshot || 'Question'}</Text>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Reason: </Text>
                                    <Text style={styles.infoValue}>
                                        {Array.isArray(defect.reasons) ? defect.reasons.join(', ') : defect.reasons}
                                    </Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Remark: </Text>
                                    <Text style={styles.infoValue}>{defect.remarks}</Text>
                                </View>

                                <Text style={styles.label}>Before Photo:</Text>
                                <ImagePickerField
                                    image={normalizeUrl(defect.photo_url || defect.image_path)}
                                    disabled={true}
                                />
                            </View>

                            <View style={styles.resolutionForm}>
                                <Text style={styles.resHeader}>Resolution Information</Text>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter resolution remark..."
                                    value={defect.id === resolvingId ? resolutionData.remark : (resolvingId ? '' : resolutionData.remark)}
                                    onChangeText={(t) => setResolutionData(prev => ({ ...prev, remark: t }))}
                                    multiline
                                />

                                <Text style={styles.label}>After Photo (Mandatory):</Text>
                                <ImagePickerField
                                    image={defect.id === resolvingId ? resolutionData.photo : (resolvingId ? null : resolutionData.photo)}
                                    onImagePicked={(uri) => setResolutionData(prev => ({ ...prev, photo: uri }))}
                                    onRemove={() => setResolutionData(prev => ({ ...prev, photo: null }))}
                                />

                                <TouchableOpacity
                                    style={[styles.resolveBtn, resolvingId === defect.id && styles.disabledBtn]}
                                    onPress={() => handleResolve(defect.id)}
                                    disabled={resolvingId !== null && resolvingId !== defect.id}
                                >
                                    {resolvingId === defect.id ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.resolveBtnText}>RESOLVE DEFECT</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-circle-outline" size={60} color="#10b981" />
                        <Text style={styles.emptyText}>No pending defects found.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginLeft: 15 },
    backBtn: { padding: 4 },
    list: { padding: 15, paddingBottom: 50 },
    defectCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, overflow: 'hidden', elevation: 4 },
    questionSection: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    qText: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 10 },
    infoRow: { flexDirection: 'row', marginBottom: 5 },
    infoLabel: { fontWeight: 'bold', color: '#64748b', fontSize: 12 },
    infoValue: { color: '#444', fontSize: 12 },
    label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginTop: 10, marginBottom: 10 },
    resolutionForm: { padding: 15, backgroundColor: '#f8fafc' },
    resHeader: { fontSize: 14, fontWeight: 'bold', color: '#2563eb', marginBottom: 15, textTransform: 'uppercase' },
    input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', marginBottom: 15 },
    resolveBtn: { backgroundColor: '#10b981', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    disabledBtn: { opacity: 0.6 },
    resolveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyText: { marginTop: 15, color: '#64748b', fontSize: 16, fontWeight: '500' }
});

export default DefectsScreen;
