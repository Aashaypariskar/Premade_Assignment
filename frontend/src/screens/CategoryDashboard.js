import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/StoreContext';
import { getUserCategories } from '../api/api';

const CategoryDashboard = ({ navigation }) => {
    const { user, logout, setDraft } = useStore();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await getUserCategories();
                setCategories(data);
            } catch (err) {
                console.error('Dash Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const handleSelectCategory = (categoryName) => {
        // Clear previous draft and start fresh focus
        setDraft({
            train: null,
            coach: null,
            category: categoryName,
            activity: null,
            answers: {}
        });
        navigation.navigate('TrainSelection', { categoryName });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Initializing Dashboard...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>{user?.name} 👋</Text>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('ReportList')}
                        style={styles.historyBtn}
                    >
                        <Text style={styles.btnText}>📜 History</Text>
                    </TouchableOpacity>
                    {user?.role === 'Admin' && (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('UserManagement')}
                            style={styles.adminBtn}
                        >
                            <Text style={styles.btnText}>Admin</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <Text style={styles.btnText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Inspection Focus</Text>
                <Text style={styles.sectionSubtitle}>Select an assigned category to begin</Text>

                <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => handleSelectCategory(item.name)}
                        >
                            <View style={styles.iconCircle}>
                                <Text style={styles.icon}>{item.name[0]}</Text>
                            </View>
                            <Text style={styles.cardText}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No categories assigned.</Text>
                            <Text style={styles.emptySub}>Please contact your administrator.</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 24, paddingBottom: 16 },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10,
        marginTop: 12,
        flexWrap: 'nowrap'
    },
    welcomeText: { fontSize: 14, color: '#64748b' },
    userName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
    historyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#4CAF50'
    },
    adminBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF'
    },
    logoutBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#EF4444'
    },
    btnText: {
        fontSize: 14,
        fontWeight: '600'
    },
    content: { flex: 1, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
    sectionSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b', fontWeight: '500' },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        margin: 8,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    icon: { fontSize: 22, fontWeight: 'bold', color: '#2563eb' },
    cardText: { fontSize: 15, fontWeight: 'bold', color: '#334155', textAlign: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#64748b' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 4 }
});

export default CategoryDashboard;
