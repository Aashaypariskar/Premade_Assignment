import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useStore } from '../store/StoreContext';
import axios from 'axios'; // For admin specific calls or use api.js

const UserManagementScreen = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            // Placeholder: Admin API call to list users
            // In a real app we'd add this to api.js
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>User Management</Text>
            <Text style={styles.subtitle}>Admin Control Panel</Text>

            <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>This screen would host the "Create User" form and roles list as defined in the requirements.</Text>
                <TouchableOpacity style={styles.btn} onPress={() => Alert.alert('Requirement Noted', 'User creation panel logic is ready in backend API.')}>
                    <Text style={styles.btnText}>Add New User</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginBottom: 30 },
    placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    placeholderText: { textAlign: 'center', color: '#94a3b8', fontSize: 16, lineHeight: 24, marginBottom: 20 },
    btn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8 },
    btnText: { color: '#fff', fontWeight: 'bold' }
});

export default UserManagementScreen;
