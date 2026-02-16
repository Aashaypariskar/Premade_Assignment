import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, RefreshControl } from 'react-native';
import { useStore } from '../store/StoreContext';
import { getAdminUsers, deleteAdminUser } from '../api/api';
import { useFocusEffect } from '@react-navigation/native';

const UserManagementScreen = ({ navigation }) => {
    const { user: currentUser } = useStore();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUsers = async () => {
        try {
            const data = await getAdminUsers();
            setUsers(data);
        } catch (err) {
            console.error('Fetch Users Error:', err);
            Alert.alert('Error', 'Failed to fetch users');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchUsers();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const handleDelete = (userId, userName) => {
        if (userId === currentUser.id) {
            Alert.alert('Invalid Action', 'You cannot delete your own admin account.');
            return;
        }

        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete ${userName}? This action is permanent.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAdminUser(userId);
                            fetchUsers();
                            Alert.alert('Success', 'User deleted successfully');
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    }
                }
            ]
        );
    };

    const renderUser = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: item.Role?.role_name === 'Admin' ? '#fee2e2' : '#f1f5f9' }]}>
                    <Text style={[styles.roleText, { color: item.Role?.role_name === 'Admin' ? '#ef4444' : '#64748b' }]}>
                        {item.Role?.role_name || 'No Role'}
                    </Text>
                </View>
            </View>

            <View style={styles.categoriesContainer}>
                <Text style={styles.label}>Assigned Focus Areas:</Text>
                <View style={styles.chips}>
                    {item.CategoryMasters?.length > 0 ? (
                        item.CategoryMasters.map(cat => (
                            <View key={cat.id} style={styles.chip}>
                                <Text style={styles.chipText}>{cat.name}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyChips}>No categories assigned</Text>
                    )}
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('CreateUser', { editUser: item })}
                >
                    <Text style={styles.editBtnText}>Edit Permissions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id, item.name)}
                >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Syncing User Directory...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>System Users</Text>
                    <Text style={styles.count}>{users.length} Active Accounts</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('CreateUser')}
                >
                    <Text style={styles.addBtnText}>+ Create User</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={users}
                keyExtractor={item => item.id.toString()}
                renderItem={renderUser}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No users found in system.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    count: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    addBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    userInfo: { flex: 1 },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
    userEmail: { fontSize: 14, color: '#64748b', marginTop: 2 },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
    roleText: { fontSize: 11, fontWeight: 'bold' },
    categoriesContainer: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, marginBottom: 15 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' },
    chips: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8, marginBottom: 8 },
    chipText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
    emptyChips: { fontSize: 13, color: '#cbd5e1', fontStyle: 'italic' },
    actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    editBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
    editBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
    deleteBtn: { flex: 0.5, alignItems: 'center', paddingVertical: 8 },
    deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b', fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#94a3b8', fontSize: 16 }
});

export default UserManagementScreen;
