import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { getReportDetails } from '../api/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import { COLORS, SPACING, RADIUS } from '../config/theme';

const ReportDetailScreen = ({ route, navigation }) => {
    const { submission_id, train_number, coach_number, date, user_name, user_id } = route.params;
    const [details, setDetails] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, []);

    const fetchDetails = async () => {
        try {
            const data = await getReportDetails({ submission_id, train_number, coach_number, date, user_id });
            setDetails(data.details || []);
            setStats(data.stats || null);
        } catch (err) {
            Alert.alert('Error', 'Failed to load details');
        } finally {
            setLoading(false);
        }
    };

    const handleHome = () => {
        navigation.navigate('Dashboard');
    };

    const categoryNameRaw = details.length > 0 && details[0]?.category_name
        ? details[0].category_name
        : 'Inspection Report';
    const categoryName = categoryNameRaw === 'Coach Commissionary' ? 'Coach Commissioning' : categoryNameRaw;

    const generateHtml = () => {
        const grouped = details.reduce((acc, item) => {
            let sectionKey = 'General';
            if (item.schedule_name) sectionKey = `Schedule: ${item.schedule_name}`;
            else if (item.subcategory_name) sectionKey = `Area: ${item.subcategory_name}`;
            else if (item.activity_type) sectionKey = `${item.activity_type} Activities`;

            if (!acc[sectionKey]) acc[sectionKey] = {};
            const itemKey = item.item_name || 'General';
            if (!acc[sectionKey][itemKey]) acc[sectionKey][itemKey] = [];
            acc[sectionKey][itemKey].push(item);
            return acc;
        }, {});

        const sectionsHtml = Object.keys(grouped).map(section => {
            const itemsByItem = grouped[section];
            const itemSectionsHtml = Object.keys(itemsByItem).map(itemName => {
                const rows = itemsByItem[itemName].map((item, index) => {
                    const status = item.status || item.answer;
                    const reasonsStr = item.reasons
                        ? (typeof item.reasons === 'string'
                            ? JSON.parse(item.reasons).join(', ')
                            : Array.isArray(item.reasons)
                                ? item.reasons.join(', ')
                                : '-')
                        : (item.reason || '-');

                    const isDeficiency = status === 'DEFICIENCY' || status === 'NO';
                    const isOk = status === 'OK' || status === 'YES';

                    return `
                        <tr>
                            <td style="text-align: center;">${index + 1}</td>
                            <td>
                                ${item.question_text_snapshot || item.Question?.text || 'N/A'}
                                ${item.Question?.specified_value ? `<br/><small style="color: #64748b;">(Spec: ${item.Question.specified_value})</small>` : ''}
                            </td>
                            <td style="text-align: center; color: ${isDeficiency ? '#ef4444' : (isOk ? '#10b981' : '#64748b')}; font-weight: bold;">
                                ${item.Question?.answer_type === 'VALUE' ? `<span style="color: #2563eb">${item.observed_value || '-'} ${item.Question?.unit || ''}</span>` : status}
                            </td>
                            <td>${reasonsStr}</td>
                            <td>${item.remarks || '-'}</td>
                        </tr>
                    `;
                }).join('');

                return `
                    <div style="margin-top: 15px;">
                        <div style="background-color: #f8fafc; padding: 6px 12px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 11px; text-transform: uppercase; color: #334155; border-left: 4px solid #334155;">ITEM: ${itemName}</div>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed;">
                            <thead>
                                <tr>
                                    <th style="width: 8%; border: 1px solid #94a3b8; padding: 10px; background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569;">Sr No</th>
                                    <th style="width: 45%; border: 1px solid #94a3b8; padding: 10px; background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569;">Question</th>
                                    <th style="width: 12%; border: 1px solid #94a3b8; padding: 10px; background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569;">Obs.</th>
                                    <th style="width: 15%; border: 1px solid #94a3b8; padding: 10px; background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569;">Reasons</th>
                                    <th style="width: 20%; border: 1px solid #94a3b8; padding: 10px; background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569;">Remarks</th>
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
                <div class="activity-section">
                    <h2 style="font-size: 14px; background-color: #e2e8f0; padding: 8px 12px; border-left: 6px solid #2563eb; margin: 30px 0 10px 0;">${section}</h2>
                    ${itemSectionsHtml}
                </div>
            `;
        }).join('');

        return `
            <html>
                <head>
                    <style>
                        @page { margin: 15mm; }
                        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 12px; }
                        .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 10px; margin-bottom: 25px; }
                        .header h1 { margin: 5px 0; font-size: 24px; text-transform: uppercase; color: #000; letter-spacing: 1px; }
                        .header p { margin: 2px 0; font-size: 14px; font-weight: bold; color: #475569; }
                        .meta-table { width: 100%; margin-bottom: 20px; border: none; }
                        .meta-table td { border: none; padding: 5px 0; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #94a3b8; padding: 10px; text-align: left; word-wrap: break-word; }
                        .footer { margin-top: 60px; border-top: 1px solid #94a3b8; padding-top: 20px; font-size: 10px; color: #64748b; }
                        .sig-table { width: 100%; margin-top: 40px; border: none; }
                        .sig-table td { border: none; width: 45%; padding-top: 50px; text-align: center; border-top: 1px solid #000; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Indian Railways</h1>
                        <p>Inspection Report - ${categoryName}</p>
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
                            <td><strong>Submission ID:</strong> #${submission_id}</td>
                            <td style="text-align: right; color: ${stats?.compliance < 80 ? '#ef4444' : '#10b981'}; font-weight: bold; font-size: 16px;">
                                Compliance Score: ${stats?.compliance || 0}%
                            </td>
                        </tr>
                    </table>
                    ${sectionsHtml}
                    <div class="footer">
                        <p>* This is an electronically generated report. Authenticity can be verified via the QR/Submission ID.</p>
                        <table class="sig-table" style="margin-top: 80px;">
                            <tr>
                                <td>Inspector Signature</td>
                                <td style="width: 10%; border-top: none;"></td>
                                <td>Supervisor Signature</td>
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
            const { uri } = await Print.printToFileAsync({ html });
            const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (!permissions.granted) {
                Alert.alert('Permission Denied', 'Unable to save to device storage without permission.');
                return;
            }
            const response = await fetch(uri);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
            });
            const base64data = reader.result.replace(/^data:.+;base64,/, '');
            const safeTrain = train_number.replace(/[^a-zA-Z0-9]/g, '_');
            const safeCoach = coach_number.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `Report_${safeTrain}_${safeCoach}_${submission_id.substring(0, 8)}.pdf`;
            const safUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, fileName, 'application/pdf');
            await StorageAccessFramework.writeAsStringAsync(safUri, base64data, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert('Download Complete', 'PDF saved successfully.');
        } catch (err) {
            Alert.alert('Error', 'Failed to download PDF.');
        } finally {
            setIsDownloading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

    const groupedData = details.reduce((acc, item) => {
        const sKey = item.schedule_name ? `Schedule: ${item.schedule_name}` :
            item.subcategory_name ? `Area: ${item.subcategory_name}` :
                `${item.activity_type || 'General'} Activities`;
        if (!acc[sKey]) acc[sKey] = {};
        const iKey = item.item_name || 'General';
        if (!acc[sKey][iKey]) acc[sKey][iKey] = [];
        acc[sKey][iKey].push(item);
        return acc;
    }, {});

    return (
        <View style={styles.container}>
            <AppHeader
                title="Report Details"
                onBack={() => navigation.goBack()}
                onHome={() => navigation.reset({
                    index: 0,
                    routes: [{ name: 'Dashboard' }],
                })}
            />

            <View style={styles.headerInfo}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{categoryName}</Text>
                    <Text style={styles.sub}>{train_number} - {coach_number}</Text>
                    <Text style={styles.sub}>{date} • {user_name}</Text>
                </View>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={[styles.actionBtn, styles.exportBtn]} onPress={handleExport} disabled={isExporting}>
                    {isExporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Export PDF</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.downloadBtn]} onPress={handleDownload} disabled={isDownloading}>
                    {isDownloading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Save to Device</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.officialHeader}>
                    <Text style={styles.headerOrg}>Indian Railways</Text>
                    <Text style={styles.railwayText}>Inspection Report</Text>
                    {stats && (
                        <View style={styles.statsSummary}>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryLabel}>COMPLIANCE</Text>
                                <Text style={[styles.summaryValue, { color: stats.compliance < 80 ? '#ef4444' : '#10b981' }]}>{stats.compliance}%</Text>
                            </View>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryLabel}>OK / DEF / NA</Text>
                                <Text style={styles.summaryValue}>{stats.yes_count} / {stats.no_count} / {stats.na_count}</Text>
                            </View>
                        </View>
                    )}
                    <View style={styles.thickDivider} />
                </View>

                {Object.keys(groupedData).map(sectionKey => (
                    <View key={sectionKey} style={styles.activityContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{sectionKey}</Text>
                        </View>
                        {Object.keys(groupedData[sectionKey]).map(itemName => (
                            <View key={itemName} style={styles.itemRefContainer}>
                                <View style={styles.itemRefHeader}>
                                    <Text style={styles.itemRefHeaderText}>ITEM: {itemName}</Text>
                                </View>
                                <View style={styles.table}>
                                    <View style={styles.tableHeaderRow}>
                                        <View style={[styles.cell, { flex: 0.1 }]}><Text style={styles.tableHeaderText}>#</Text></View>
                                        <View style={[styles.cell, { flex: 0.45 }]}><Text style={styles.tableHeaderText}>Question</Text></View>
                                        <View style={[styles.cell, { flex: 0.15 }]}><Text style={styles.tableHeaderText}>Obs.</Text></View>
                                        <View style={[styles.cell, { flex: 0.3 }]}><Text style={styles.tableHeaderText}>Remarks</Text></View>
                                    </View>
                                    {groupedData[sectionKey][itemName].map((item, idx) => (
                                        <View key={item.id} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                                            <View style={[styles.cell, { flex: 0.1 }]}><Text style={styles.cellTextCenter}>{idx + 1}</Text></View>
                                            <View style={[styles.cell, { flex: 0.45 }]}><Text style={styles.cellText}>{item.question_text_snapshot || item.Question?.text || 'N/A'}</Text></View>
                                            <View style={[styles.cell, { flex: 0.15 }]}><Text style={[
                                                styles.cellTextCenter,
                                                {
                                                    fontWeight: 'bold',
                                                    color: (item.status === 'DEFICIENCY' || item.answer === 'NO') ? '#ef4444' :
                                                        (item.status === 'OK' || item.answer === 'YES') ? '#10b981' : '#64748b'
                                                }
                                            ]}>
                                                {item.Question?.answer_type === 'VALUE' ? (
                                                    <Text style={{ color: '#2563eb' }}>{item.observed_value || '-'} {item.Question?.unit || ''}</Text>
                                                ) : (
                                                    item.status || item.answer
                                                )}
                                            </Text></View>
                                            <View style={[styles.cell, { flex: 0.3 }]}><Text style={styles.cellRemarkText}>{item.remarks || item.reasons || item.reason || '-'}</Text></View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    headerInfo: { flexDirection: 'row', padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary },
    sub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
    actionsContainer: { flexDirection: 'row', padding: 12, gap: 10 },
    actionBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', elevation: 2 },
    exportBtn: { backgroundColor: COLORS.primary },
    downloadBtn: { backgroundColor: COLORS.success },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    content: { padding: 16 },
    officialHeader: { alignItems: 'center', marginBottom: 20 },
    headerOrg: { fontSize: 12, color: COLORS.textSecondary, fontWeight: 'bold' },
    railwayText: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
    thickDivider: { height: 3, backgroundColor: COLORS.textPrimary, width: '100%', marginTop: 10 },
    activityContainer: { marginBottom: 25 },
    sectionHeader: { backgroundColor: '#F1F5F9', padding: 10, borderLeftWidth: 4, borderLeftColor: COLORS.primary, marginBottom: 5 },
    sectionHeaderText: { fontWeight: 'bold', color: COLORS.textPrimary, fontSize: 14 },
    itemRefContainer: { marginTop: 15, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
    itemRefHeader: { backgroundColor: '#334155', padding: 8, paddingHorizontal: 12 },
    itemRefHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    table: { backgroundColor: COLORS.surface },
    tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', minHeight: 45 },
    tableHeaderText: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary, textAlign: 'center' },
    cell: { padding: 10, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
    cellText: { fontSize: 11, color: COLORS.textPrimary, lineHeight: 16 },
    cellTextCenter: { fontSize: 11, color: COLORS.textPrimary, textAlign: 'center' },
    cellRemarkText: { fontSize: 10, color: COLORS.textSecondary },
    statsSummary: { flexDirection: 'row', gap: 16, marginTop: 15, width: '100%', justifyContent: 'center' },
    summaryBox: { alignItems: 'center', backgroundColor: COLORS.surface, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, minWidth: 110, elevation: 1 },
    summaryLabel: { fontSize: 9, fontWeight: 'bold', color: COLORS.textSecondary, marginBottom: 4 },
    summaryValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary }
});

export default ReportDetailScreen;
