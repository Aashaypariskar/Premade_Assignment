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
        // Group details by Activity Type (Minor/Major)
        const grouped = details.reduce((acc, item) => {
            let key = 'General';
            if (item.LtrSchedule) key = `Schedule: ${item.LtrSchedule.name}`;
            else if (item.AmenitySubcategory) key = `Area: ${item.AmenitySubcategory.name}`;
            else if (item.Activity) key = `${item.Activity.type} Activities`;

            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        const sectionsHtml = Object.keys(grouped).map(type => {
            const items = grouped[type];
            const rows = items.map((item, index) => {
                const reasonsStr = item.reasons
                    ? (typeof item.reasons === 'string'
                        ? JSON.parse(item.reasons).join(', ')
                        : Array.isArray(item.reasons)
                            ? item.reasons.join(', ')
                            : '-')
                    : '-';

                return `
                    <tr>
                        <td style="text-align: center;">${index + 1}</td>
                        <td>
                            ${item.Question?.question_text || 'N/A'}
                            ${item.Question?.specified_value ? `<br/><small style="color: #64748b;">(Spec: ${item.Question.specified_value})</small>` : ''}
                        </td>
                        <td style="text-align: center; color: ${item.answer === 'NO' ? '#ef4444' : '#10b981'}; font-weight: bold;">${item.answer}</td>
                        <td>${reasonsStr}</td>
                        <td>${item.remarks || '-'}</td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="activity-section">
                    <h2 class="section-title">${type}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 8%;">Sr No</th>
                                <th style="width: 45%;">Description of Item</th>
                                <th style="width: 12%;">Observation</th>
                                <th style="width: 15%;">Reasons</th>
                                <th style="width: 20%;">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');

        return `
            <html>
            <head>
                <style>
                    @page { margin: 20mm; }
                    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 12px; }
                    .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px; }
                    .header h1 { margin: 5px 0; font-size: 22px; text-transform: uppercase; color: #000; }
                    .header p { margin: 2px 0; font-size: 14px; font-weight: bold; color: #475569; }

                    .meta-table { width: 100%; margin-bottom: 20px; border: none; }
                    .meta-table td { border: none; padding: 4px 0; font-size: 13px; }

                    .section-title { font-size: 14px; background-color: #f1f5f9; padding: 6px 10px; border-left: 4px solid #2563eb; margin: 20px 0 10px 0; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
                    th, td { border: 1px solid #94a3b8; padding: 8px; text-align: left; word-wrap: break-word; }
                    th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 11px; border-bottom: 2px solid #1e293b; }
                    tr:nth-child(even) { background-color: #fbfcfd; }
                    
                    .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                    .sig-table { width: 100%; margin-top: 30px; border: none; }
                    .sig-table td { border: none; width: 50%; padding-top: 40px; }
                    
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Indian Railways - Inspection Report</h1>
                    <p>Category: ${categoryName}</p>
                </div>

                <table class="meta-table">
                    <tr>
                        <td><strong>Train No:</strong> ${train_number}</td>
                        <td style="text-align: right;"><strong>Coach No:</strong> ${coach_number}</td>
                    </tr>
                    <tr>
                        <td><strong>Inspector:</strong> ${user_name}</td>
                        <td style="text-align: right;"><strong>Date:</strong> ${date}</td>
                    </tr>
                    <tr>
                        <td colspan="2"><strong>Submission ID:</strong> #${submission_id || 'N/A'}</td>
                    </tr>
                </table>

                ${sectionsHtml}

                <div class="footer">
                    <p style="font-style: italic; color: #64748b;">* This is an electronically generated report. Any discrepancies should be reported to the IT division.</p>
                    <table class="sig-table">
                        <tr>
                            <td style="border-top: 1px solid #000; text-align: center;">Inspector Signature</td>
                            <td style="width: 10%;"></td>
                            <td style="border-top: 1px solid #000; text-align: center;">Authorized Supervisor</td>
                        </tr>
                    </table>
                </div>
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
            const safeTrain = train_number.replace(/[^a-zA-Z0-9]/g, '_');
            const safeCoach = coach_number.replace(/[^a-zA-Z0-9]/g, '_');
            const formattedDate = date ? date.split(' ')[0] : 'Report';
            const fileName = `Inspection_Report_${safeTrain}_${safeCoach}_${formattedDate}.pdf`;
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

            <ScrollView contentContainerStyle={styles.content} horizontal={false}>
                {/* Official Format Header for Screen */}
                <View style={styles.officialHeader}>
                    <Text style={styles.headerOrg}>Indian Railways</Text>
                    <Text style={styles.railwayText}>Train Coach Inspection Report</Text>
                    <View style={styles.thickDivider} />
                </View>

                {/* Metadata Grid */}
                <View style={styles.metaGrid}>
                    <View style={styles.metaRow}>
                        <View style={styles.metaCol}><Text style={styles.metaLabel}>Category:</Text><Text style={styles.metaValue}>{categoryName}</Text></View>
                        <View style={styles.metaCol}><Text style={styles.metaLabel}>Train No:</Text><Text style={styles.metaValue}>{train_number}</Text></View>
                    </View>
                    <View style={styles.metaRow}>
                        <View style={styles.metaCol}><Text style={styles.metaLabel}>Coach No:</Text><Text style={styles.metaValue}>{coach_number}</Text></View>
                        <View style={styles.metaCol}><Text style={styles.metaLabel}>Date:</Text><Text style={styles.metaValue}>{date}</Text></View>
                    </View>
                    <View style={styles.metaRow}>
                        <View style={styles.metaCol}><Text style={styles.metaLabel}>Inspector Name/Role:</Text><Text style={styles.metaValue}>{user_name}</Text></View>
                    </View>
                </View>

                {Object.keys(details.reduce((acc, item) => {
                    const type = item.Activity?.type || 'General';
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(item);
                    return acc;
                }, {})).map(type => {
                    const items = details.filter(i => (i.Activity?.type || 'General') === type);
                    return (
                        <View key={type} style={styles.activityContainer}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionHeaderText}>Activity: {type}</Text>
                            </View>

                            {/* TABLE START */}
                            <View style={styles.table}>
                                {/* Table Header - 5 Columns */}
                                <View style={styles.tableHeaderRow}>
                                    <View style={[styles.cell, { flex: 0.1, justifyContent: 'center' }]}><Text style={styles.tableHeaderText}>Sr No</Text></View>
                                    <View style={[styles.cell, { flex: 0.35 }]}><Text style={styles.tableHeaderText}>Description of Item</Text></View>
                                    <View style={[styles.cell, { flex: 0.15, justifyContent: 'center' }]}><Text style={styles.tableHeaderText}>Obs.</Text></View>
                                    <View style={[styles.cell, { flex: 0.2 }]}><Text style={styles.tableHeaderText}>Reasons</Text></View>
                                    <View style={[styles.cell, { flex: 0.2, borderRightWidth: 0 }]}><Text style={styles.tableHeaderText}>Remarks</Text></View>
                                </View>

                                {/* Table Rows */}
                                {items.map((item, index) => {
                                    const reasonsStr = item.reasons
                                        ? (typeof item.reasons === 'string'
                                            ? JSON.parse(item.reasons).join(', ')
                                            : Array.isArray(item.reasons)
                                                ? item.reasons.join(', ')
                                                : '-')
                                        : '';

                                    return (
                                        <View key={item.id} style={[styles.tableRow, index % 2 === 1 && { backgroundColor: '#f8fafc' }]}>
                                            <View style={[styles.cell, { flex: 0.1, justifyContent: 'center' }]}><Text style={styles.cellTextCenter}>{index + 1}</Text></View>
                                            <View style={[styles.cell, { flex: 0.35 }]}><Text style={styles.cellText}>{item.Question?.question_text || 'N/A'}</Text></View>
                                            <View style={[styles.cell, { flex: 0.15, justifyContent: 'center' }]}>
                                                <Text style={[styles.cellTextCenter, { fontWeight: 'bold', color: item.answer === 'NO' ? '#ef4444' : '#10b981' }]}>{item.answer}</Text>
                                            </View>
                                            <View style={[styles.cell, { flex: 0.2 }]}>
                                                <Text style={styles.cellReasonText}>{reasonsStr || '-'}</Text>
                                            </View>
                                            <View style={[styles.cell, { flex: 0.2, borderRightWidth: 0 }]}>
                                                <Text style={styles.cellRemarkText}>{item.remarks || '-'}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}

                {/* Signature Placeholders Match PDF Footer */}
                <View style={styles.signatureSection}>
                    <View style={styles.sigLine}>
                        <View style={styles.line} />
                        <Text style={styles.sigLabel}>Inspector Signature</Text>
                        <Text style={styles.sigDate}>Date: __________</Text>
                    </View>
                    <View style={styles.sigLine}>
                        <View style={styles.line} />
                        <Text style={styles.sigLabel}>Supervisor Signature</Text>
                        <Text style={styles.sigDate}>Official Stamp</Text>
                    </View>
                </View>
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

    // Official Format Styles
    officialHeader: { alignItems: 'center', marginBottom: 20, paddingHorizontal: 10 },
    headerOrg: { fontSize: 14, color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' },
    railwayText: { fontSize: 22, fontWeight: 'bold', color: '#000', textAlign: 'center' },
    categoryBadge: { backgroundColor: '#2563eb', color: '#fff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, fontSize: 12, fontWeight: 'bold', marginTop: 10 },
    thickDivider: { height: 3, backgroundColor: '#1e293b', width: '100%', marginTop: 15 },

    metaGrid: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    metaCol: { flex: 1 },
    metaLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' },
    metaValue: { fontSize: 14, color: '#1e293b', fontWeight: '600' },

    activityContainer: { marginBottom: 30 },
    sectionHeader: { backgroundColor: '#f1f5f9', padding: 8, borderLeftWidth: 5, borderLeftColor: '#2563eb', marginBottom: 0 },
    sectionHeaderText: { fontWeight: 'bold', fontSize: 13, color: '#1e293b' },

    table: { borderWidth: 1, borderColor: '#94a3b8', backgroundColor: '#fff' },
    tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 2, borderBottomColor: '#1e293b' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', minHeight: 45 },
    tableHeaderText: { fontSize: 10, fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase', textAlign: 'center' },
    cell: { padding: 6, borderRightWidth: 1, borderRightColor: '#94a3b8', justifyContent: 'center' },
    cellText: { fontSize: 11, color: '#1e293b' },
    cellTextCenter: { fontSize: 11, color: '#1e293b', textAlign: 'center' },
    cellReasonText: { fontSize: 10, color: '#ef4444', fontStyle: 'italic' },
    cellRemarkText: { fontSize: 10, color: '#64748b' },

    signatureSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, paddingBottom: 60 },
    sigLine: { width: '45%', alignItems: 'center' },
    line: { height: 1.5, backgroundColor: '#000', width: '100%', marginBottom: 8 },
    sigLabel: { fontSize: 12, color: '#000', fontWeight: 'bold' },
    sigDate: { fontSize: 10, color: '#94a3b8', marginTop: 4 }
});

export default ReportDetailScreen;
