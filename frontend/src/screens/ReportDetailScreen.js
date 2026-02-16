import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { getReportDetails } from '../api/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

const ReportDetailScreen = ({ route, navigation }) => {
    const { submission_id, train_number, coach_number, date, user_name, user_id } = route.params;
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

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

    const handleHome = () => {
        navigation.navigate('Dashboard');
    };

    // Extract Category Name from first item (assuming homogeneous report)
    const categoryName = details.length > 0 && details[0]?.Activity?.Category?.name
        ? details[0].Activity.Category.name
        : 'Inspection Report';

    const generateHtml = () => {
        const rows = details.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td style="width: 40%; font-size: 14px;"><strong>${item.Question?.question_text || 'Unknown Question'}</strong></td>
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
                    <h1>${categoryName}</h1>
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
                            <th>Question</th>
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
            setIsExporting(true);
            const html = generateHtml();
            const { uri } = await Print.printToFileAsync({ html });
            // Share/Export Intent
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (err) {
            Alert.alert('Error', 'Failed to export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const html = generateHtml();

            // 1. Generate PDF
            const { uri } = await Print.printToFileAsync({ html });

            // 2. Request Directory Permission (Storage Access Framework)
            const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();

            if (!permissions.granted) {
                Alert.alert('Permission Denied', 'Unable to save to device storage without permission.');
                return;
            }

            // 3. Read PDF Content as Base64 (Using fetch + FileReader to avoid deprecated API)
            const response = await fetch(uri);
            const blob = await response.blob();

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
            });
            const base64data = reader.result.replace(/^data:.+;base64,/, '');

            // 4. Create File in Selected Directory
            const safeCategory = categoryName.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `Inspection_Report_${safeCategory}_${Date.now()}.pdf`;
            const mimeType = 'application/pdf';

            const safUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, mimeType);

            // 5. Write Content to New File
            // Write base64 content to the SAF URI
            await StorageAccessFramework.writeAsStringAsync(safUri, base64data, { encoding: FileSystem.EncodingType.Base64 });

            Alert.alert('Download Complete', 'PDF saved successfully to selected folder.');

        } catch (err) {
            console.error('Download error:', err);
            Alert.alert('Error', 'Failed to download PDF to device storage.');
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) return <ActivityIndicator style={styles.center} color="#2563eb" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{categoryName}</Text>
                    <Text style={styles.sub}>{train_number} - {coach_number}</Text>
                    <Text style={styles.sub}>{date} • {user_name || 'Inspector'}</Text>
                </View>
                <TouchableOpacity style={styles.homeBtn} onPress={handleHome}>
                    <Ionicons name="home" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.exportBtn, isExporting && { opacity: 0.7 }]}
                    onPress={handleExport}
                    disabled={isExporting}
                >
                    {isExporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Export PDF</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, styles.downloadBtn, isDownloading && { opacity: 0.7 }]}
                    onPress={handleDownload}
                    disabled={isDownloading}
                >
                    {isDownloading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Download PDF (Save As)</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {details.map((item, index) => (
                    <View key={item.id} style={styles.row}>
                        <View style={styles.rowHeader}>
                            <Text style={styles.qNum}>Q{index + 1}</Text>
                            <Text style={[styles.badge, item.Activity?.type === 'Major' ? styles.major : styles.minor]}>{item.Activity?.type}</Text>
                        </View>

                        <Text style={styles.questionText}>{item.Question?.question_text || 'Loading question...'}</Text>

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
    title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    sub: { color: '#64748b', fontSize: 13 },

    actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
    actionBtn: { flex: 1, marginHorizontal: 5, borderRadius: 8, paddingVertical: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
    exportBtn: { backgroundColor: '#2563EB' },
    downloadBtn: { backgroundColor: '#16A34A' },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' }, // Center text for wrapping

    homeBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },

    content: { padding: 16 },
    row: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    qNum: { fontWeight: 'bold', color: '#94a3b8', fontSize: 12 },
    questionText: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 10 },
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
