import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { getReportDetails } from '../api/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const ReportDetailScreen = ({ route }) => {
    const { submission_id, train_number, coach_number, date, user_name, user_id } = route.params;
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetails();
    }, []);

    const fetchDetails = async () => {
        try {
            const data = await getReportDetails({ submission_id, train_number, coach_number, date, user_id });
            setDetails(data);
        } catch (err) {
            Alert.alert('Error', 'Failed to load details');
        } finally {
            setLoading(false);
        }
    };

    const generateHtml = () => {
        const rows = details.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.Activity?.type || '-'}</td>
                <td>${item.answer}</td>
                <td>${item.reasons
                ? (typeof item.reasons === 'string'
                    ? JSON.parse(item.reasons).join(', ')
                    : Array.isArray(item.reasons)
                        ? item.reasons.join(', ')
                        : JSON.stringify(item.reasons)
                )
                : '-'
            }</td>
                <td>${item.remarks || '-'}</td>
            </tr>
        `).join('');

        return `
            <html>
            <head>
                <style>
                    body { font-family: Helvetica, sans-serif; padding: 20px; }
                    h1 { color: #1e293b; }
                    .header { margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
                    th { background-color: #f1f5f9; }
                    .meta { display: flex; justify-content: space-between; color: #475569; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Inspection Report</h1>
                    <div class="meta">
                        <div><strong>Train:</strong> ${train_number}</div>
                        <div><strong>Coach:</strong> ${coach_number}</div>
                    </div>
                    <div class="meta">
                        <div><strong>Inspector:</strong> ${user_name}</div>
                        <div><strong>Date:</strong> ${date}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Type</th>
                            <th>Answer</th>
                            <th>Reasons</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </body>
            </html>
        `;
    };

    const handleExport = async () => {
        try {
            const html = generateHtml();
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (err) {
            Alert.alert('Error', 'Failed to export PDF');
        }
    };

    if (loading) return <ActivityIndicator style={styles.center} color="#2563eb" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{train_number} - {coach_number}</Text>
                    <Text style={styles.sub}>{date} • {user_name}</Text>
                </View>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                    <Text style={styles.exportText}>Export PDF</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {details.map((item, index) => (
                    <View key={item.id} style={styles.row}>
                        <View style={styles.rowHeader}>
                            <Text style={styles.qNum}>Q{index + 1}</Text>
                            <Text style={[styles.badge, item.Activity?.type === 'Major' ? styles.major : styles.minor]}>{item.Activity?.type}</Text>
                        </View>
                        <View style={styles.rowBody}>
                            <Text style={styles.answerLabel}>Status: <Text style={[styles.answer, item.answer === 'NO' ? styles.fail : styles.pass]}>{item.answer}</Text></Text>
                            {item.answer === 'NO' && (
                                <Text style={styles.reasons}>Reasons: {
                                    item.reasons
                                        ? (typeof item.reasons === 'string'
                                            ? JSON.parse(item.reasons).join(', ')
                                            : Array.isArray(item.reasons)
                                                ? item.reasons.join(', ')
                                                : JSON.stringify(item.reasons)
                                        )
                                        : 'None'
                                }</Text>
                            )}
                            {item.remarks && <Text style={styles.remarks}>Remarks: {item.remarks}</Text>}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    sub: { color: '#64748b' },
    exportBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    exportText: { color: '#fff', fontWeight: 'bold' },
    content: { padding: 16 },
    row: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    qNum: { fontWeight: 'bold', color: '#1e293b' },
    badge: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    major: { backgroundColor: '#fef2f2', color: '#ef4444' },
    minor: { backgroundColor: '#fff7ed', color: '#f97316' },
    rowBody: { gap: 4 },
    answerLabel: { fontSize: 14, color: '#475569' },
    answer: { fontWeight: 'bold' },
    pass: { color: '#10b981' },
    fail: { color: '#ef4444' },
    reasons: { color: '#ef4444', fontStyle: 'italic', fontSize: 13 },
    remarks: { color: '#64748b', fontSize: 13 },
});

export default ReportDetailScreen;
