import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, FlatList, Pressable, Modal, Animated, Dimensions } from 'react-native';
import { getReports, getReportFilterOptions } from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SearchableInput = ({ label, placeholder, value, onChangeText, options = [], isOpen, onToggle }) => {
    const [filteredOptions, setFilteredOptions] = useState([]);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (value && options) {
            const filtered = options.filter(opt =>
                opt && opt.toString().toLowerCase().includes(value.toLowerCase())
            );
            setFilteredOptions(filtered);
        } else {
            setFilteredOptions(options || []);
        }
    }, [value, options]);

    return (
        <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>{label}</Text>
            <View style={[
                styles.inputWrapper,
                (isFocused || isOpen) && styles.inputWrapperFocused
            ]}>
                <TextInput
                    style={styles.filterInput}
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => {
                        setIsFocused(true);
                        onToggle(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                />
                <TouchableOpacity onPress={() => onToggle(!isOpen)}>
                    <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={(isFocused || isOpen) ? "#2563eb" : "#94a3b8"}
                    />
                </TouchableOpacity>
            </View>
            {isOpen && filteredOptions.length > 0 && (
                <View style={styles.dropdown}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                        {filteredOptions.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.dropdownItem}
                                onPress={() => {
                                    onChangeText(item.toString());
                                    onToggle(false);
                                }}
                            >
                                <Text style={styles.dropdownItemText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const ReportListScreen = ({ navigation }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filterOptions, setFilterOptions] = useState({
        trains: [],
        coaches: [],
        types: [],
        statuses: [],
        activityTypes: []
    });

    const [tempFilters, setTempFilters] = useState({
        train_no: '',
        coach_no: '',
        inspection_type: '',
        activity_type: '',
        start_date: '',
        end_date: ''
    });

    const [appliedFilters, setAppliedFilters] = useState({
        train_no: '',
        coach_no: '',
        inspection_type: '',
        activity_type: '',
        start_date: '',
        end_date: ''
    });

    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null); // 'train', 'coach', 'type', 'status'

    const loadReports = async (reset = false) => {
        try {
            setLoading(true);
            const currentPage = reset ? 1 : page;
            const response = await getReports({ ...appliedFilters, page: currentPage });

            if (reset) {
                setReports(response.data || []);
                setPage(1);
            } else {
                setReports(prev => [...prev, ...(response.data || [])]);
            }
            setTotalPages(response.pages || 1);
        } catch (err) {
            console.error('Load Reports Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadFilterOptions = async () => {
        try {
            const data = await getReportFilterOptions();
            setFilterOptions(data || { trains: [], coaches: [], types: [], statuses: [], activityTypes: [] });
        } catch (err) {
            console.error('Load Filter Options Error:', err);
        }
    };

    useEffect(() => {
        loadFilterOptions();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadReports(true);
        }, [appliedFilters])
    );

    const handleLoadMore = () => {
        if (page < totalPages && !loading) {
            setPage(prev => prev + 1);
            loadReports(false);
        }
    };

    const handleApplyFilters = () => {
        setAppliedFilters(tempFilters);
        setIsFilterModalVisible(false);
    };

    const handleResetFilters = () => {
        const empty = { train_no: '', coach_no: '', inspection_type: '', activity_type: '', status: '', start_date: '', end_date: '' };
        setTempFilters(empty);
        setAppliedFilters(empty);
        setIsFilterModalVisible(false);
    };

    const renderTableHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { width: 120 }]}>Report ID</Text>
            <Text style={[styles.headerCell, { width: 100 }]}>Train Number</Text>
            <Text style={[styles.headerCell, { width: 80 }]}>Coach</Text>
            <Text style={[styles.headerCell, { width: 140 }]}>Inspection Type</Text>
            <Text style={[styles.headerCell, { width: 120 }]}>Activity Type</Text>
            <Text style={[styles.headerCell, { width: 110 }]}>Date</Text>
            <Text style={[styles.headerCell, { width: 130 }]}>Inspector</Text>
            <Text style={[styles.headerCell, { width: 100 }]}>Action</Text>
        </View>
    );

    const renderTableRow = ({ item, index }) => {
        const displayId = item.submission_id ? item.submission_id.slice(-8) : 'LEGACY';
        const isAlternate = index % 2 === 1;

        return (
            <Pressable
                style={[styles.tableRow, isAlternate && styles.tableRowAlternate]}
                android_ripple={{ color: '#e2e8f0' }}
            >
                <Text style={[styles.cell, { width: 120 }]} numberOfLines={1}>{displayId}...</Text>
                <Text style={[styles.cell, { width: 100, fontWeight: '600' }]}>{item.train_number}</Text>
                <Text style={[styles.cell, { width: 80 }]}>{item.coach_number}</Text>
                <View style={[styles.cell, { width: 140 }]}>
                    <Text style={{ fontWeight: '600', color: '#1e293b' }} numberOfLines={1}>{item.category_name}</Text>
                    {(item.subcategory_name || item.schedule_name) && (
                        <Text style={{ fontSize: 10, color: '#64748b' }} numberOfLines={1}>
                            {item.subcategory_name || item.schedule_name}
                        </Text>
                    )}
                </View>
                <View style={[styles.typeContainer, { width: 120 }]}>
                    <Text style={[
                        styles.typeText,
                        item.severity === 'Major' ? styles.majorText : (item.severity === 'Minor' ? styles.minorText : { color: '#94a3b8' })
                    ]}>
                        {item.severity || 'N/A'}
                    </Text>
                </View>
                <Text style={[styles.cell, { width: 110 }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <Text style={[styles.cell, { width: 130 }]} numberOfLines={1}>{item.user_name}</Text>
                <View style={{ width: 100, alignItems: 'center' }}>
                    <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => {
                            if (item.submission_id?.startsWith('COMM-')) {
                                navigation.navigate('CommissionaryCombinedReport', {
                                    sessionId: item.submission_id.replace('COMM-', '')
                                });
                            } else {
                                navigation.navigate('ReportDetail', {
                                    submission_id: item.submission_id,
                                    train_number: item.train_number,
                                    coach_number: item.coach_number,
                                    date: new Date(item.createdAt).toISOString().split('T')[0],
                                    user_name: item.user_name,
                                    user_id: item.user_id
                                });
                            }
                        }}
                    >
                        <Text style={styles.viewBtnText}>View Report</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header with Filter Icon */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Inspection History</Text>
                        <Text style={styles.subtitle}>Review and audit past reports</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.filterIconBtn}
                        onPress={() => {
                            setTempFilters(appliedFilters);
                            setIsFilterModalVisible(true);
                        }}
                    >
                        <Ionicons name="funnel-outline" size={24} color="#2563eb" />
                        {Object.values(appliedFilters).some(v => v !== '') && (
                            <View style={styles.filterBadge} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Table Section */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                    {renderTableHeader()}
                    <FlatList
                        data={reports}
                        renderItem={renderTableRow}
                        keyExtractor={(item, index) => item.submission_id || `legacy-${index}`}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={loading ? <ActivityIndicator color="#2563eb" style={{ marginVertical: 30 }} /> : null}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            !loading && (
                                <View style={styles.empty}>
                                    <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                                    <Text style={styles.emptyText}>No matching reports found</Text>
                                </View>
                            )
                        }
                    />
                </View>
            </ScrollView>

            {/* Filter Overlay Modal */}
            <Modal
                visible={isFilterModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setIsFilterModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Reports</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#475569" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.filterGrid}>
                                <View style={styles.gridRow}>
                                    <SearchableInput
                                        label="Train Number"
                                        placeholder="Select or type..."
                                        value={tempFilters.train_no}
                                        onChangeText={(val) => setTempFilters(prev => ({ ...prev, train_no: val }))}
                                        options={filterOptions.trains}
                                        isOpen={activeDropdown === 'train'}
                                        onToggle={(open) => setActiveDropdown(open ? 'train' : null)}
                                    />
                                    <SearchableInput
                                        label="Coach Number"
                                        placeholder="Select or type..."
                                        value={tempFilters.coach_no}
                                        onChangeText={(val) => setTempFilters(prev => ({ ...prev, coach_no: val }))}
                                        options={filterOptions.coaches}
                                        isOpen={activeDropdown === 'coach'}
                                        onToggle={(open) => setActiveDropdown(open ? 'coach' : null)}
                                    />
                                </View>

                                <View style={styles.gridRow}>
                                    <SearchableInput
                                        label="Inspection Type"
                                        placeholder="All types..."
                                        value={tempFilters.inspection_type}
                                        onChangeText={(val) => setTempFilters(prev => ({ ...prev, inspection_type: val }))}
                                        options={filterOptions.types}
                                        isOpen={activeDropdown === 'type'}
                                        onToggle={(open) => setActiveDropdown(open ? 'type' : null)}
                                    />
                                    <SearchableInput
                                        label="Activity Type"
                                        placeholder="Major/Minor..."
                                        value={tempFilters.activity_type}
                                        onChangeText={(val) => setTempFilters(prev => ({ ...prev, activity_type: val }))}
                                        options={filterOptions.activityTypes}
                                        isOpen={activeDropdown === 'activity'}
                                        onToggle={(open) => setActiveDropdown(open ? 'activity' : null)}
                                    />
                                </View>

                                <View style={styles.gridRow}>
                                    <View style={styles.filterContainer}>
                                        <Text style={styles.filterLabel}>Start Date (YYYY-MM-DD)</Text>
                                        <TextInput
                                            style={styles.filterInputSimple}
                                            placeholder="2024-01-01"
                                            value={tempFilters.start_date}
                                            onChangeText={(val) => setTempFilters(prev => ({ ...prev, start_date: val }))}
                                        />
                                    </View>
                                    <View style={styles.filterContainer}>
                                        <Text style={styles.filterLabel}>End Date (YYYY-MM-DD)</Text>
                                        <TextInput
                                            style={styles.filterInputSimple}
                                            placeholder="2024-12-31"
                                            value={tempFilters.end_date}
                                            onChangeText={(val) => setTempFilters(prev => ({ ...prev, end_date: val }))}
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Modal Actions */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.resetModalBtn} onPress={handleResetFilters}>
                                <Text style={styles.resetModalBtnText}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyModalBtn} onPress={handleApplyFilters}>
                                <Text style={styles.applyModalBtnText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 40 },
    header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
    subtitle: { fontSize: 13, color: '#64748b' },
    filterIconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' },
    filterBadge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#fff' },

    // Table Design
    tableHeader: { flexDirection: 'row', backgroundColor: '#1e293b', paddingVertical: 14, paddingHorizontal: 16 },
    headerCell: { fontWeight: '700', color: '#cbd5e1', fontSize: 11, textAlign: 'center', textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
    tableRowAlternate: { backgroundColor: '#fcfdfe' },
    cell: { fontSize: 13, color: '#334155', textAlign: 'center', paddingHorizontal: 6 },

    // Type Column Styling
    typeContainer: { alignItems: 'center', justifyContent: 'center' },
    typeText: { fontSize: 13, fontWeight: '700' },
    majorText: { color: '#dc2626' },
    minorText: { color: '#d97706' },

    statusBadge: { backgroundColor: '#f0fdf4', paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
    statusBadgeText: { fontSize: 10, color: '#16a34a', fontWeight: '800', textTransform: 'uppercase' },
    viewBtn: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, width: 90, alignItems: 'center' },
    viewBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    empty: { width: 950, alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '600', marginTop: 12 },

    // Modal Design
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: SCREEN_HEIGHT * 0.8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    modalBody: { padding: 20 },
    modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },

    applyModalBtn: { flex: 2, backgroundColor: '#2563eb', height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    applyModalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    resetModalBtn: { flex: 1, backgroundColor: '#f1f5f9', height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    resetModalBtnText: { color: '#475569', fontSize: 14, fontWeight: '700' },

    // Filter Inputs (Inside Modal)
    filterGrid: { gap: 16 },
    gridRow: { flexDirection: 'row', gap: 12 },
    filterContainer: { flex: 1 },
    filterLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1.5, borderColor: '#e2e8f0', height: 48 },
    inputWrapperFocused: { borderColor: '#2563eb', backgroundColor: '#fff' },
    filterInput: { flex: 1, fontSize: 14, color: '#1e293b' },
    filterInputSimple: { backgroundColor: '#f8fafc', paddingHorizontal: 12, borderRadius: 10, fontSize: 14, borderWidth: 1.5, borderColor: '#e2e8f0', height: 48, color: '#1e293b' },
    dropdown: { marginTop: 4, backgroundColor: '#fff', borderRadius: 12, elevation: 5, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dropdownItemText: { fontSize: 14, color: '#1e293b' }
});

export default ReportListScreen;
