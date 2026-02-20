import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAdminMetadata, createAdminUser, updateAdminUser, updateAdminUserCategories } from '../api/api';

const CreateUserScreen = ({ route, navigation }) => {
    const editUser = route.params?.editUser;

    const [name, setName] = useState(editUser?.name || '');
    const [email, setEmail] = useState(editUser?.email || '');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState(editUser?.Role?.id || null);
    const [selectedCategories, setSelectedCategories] = useState(
        editUser?.CategoryMasters?.map(c => c.id) || []
    );

    const [roles, setRoles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const data = await getAdminMetadata();
                // Enforce single-admin policy: Filter out 'Admin' role on frontend
                const allowedRoles = data.roles.filter(r =>
                    r.role_name.toLowerCase() !== 'admin'
                );
                setRoles(allowedRoles);
                setCategories(data.categories);
            } catch (err) {
                Alert.alert('Error', 'Failed to load roles and categories');
            } finally {
                setLoading(false);
            }
        };
        fetchMeta();
    }, []);

    const toggleCategory = (id) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (!editUser && (!name || !email || !password || !selectedRole)) {
            Alert.alert('Validation Error', 'Please fill all required fields');
            return;
        }

        setSubmitting(true);
        try {
            if (editUser) {
                // Update Name & Role
                await updateAdminUser(editUser.id, {
                    name,
                    role_id: selectedRole
                });

                // Update Categories
                await updateAdminUserCategories(editUser.id, selectedCategories);

                Alert.alert('Success', 'User profile and permissions updated');
            } else {
                // Create New User
                await createAdminUser({
                    name,
                    email,
                    password,
                    role_id: selectedRole,
                    category_ids: selectedCategories
                });
                Alert.alert('Success', 'New user account created');
            }
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to process request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>{editUser ? 'Edit User' : 'Create System User'}</Text>
                <Text style={styles.subtitle}>
                    {editUser ? `Modifying profile for ${editUser.name}` : 'Provision a new account with specific role access'}
                </Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. John Doe"
                    />
                </View>

                {!editUser && (
                    <>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="user@inspection.com"
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                secureTextEntry
                            />
                        </View>
                    </>
                )}

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Select Role</Text>
                    <View style={styles.roleGrid}>
                        {roles.map(role => (
                            <TouchableOpacity
                                key={role.id}
                                style={[
                                    styles.roleCard,
                                    selectedRole === role.id && styles.roleCardActive
                                ]}
                                onPress={() => setSelectedRole(role.id)}
                            >
                                <Text style={[styles.roleName, selectedRole === role.id && styles.roleTextActive]}>
                                    {role.role_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Assign Focus Areas (Categories)</Text>
                    <View style={styles.catGrid}>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.catCard, selectedCategories.includes(cat.id) && styles.catCardActive]}
                                onPress={() => toggleCategory(cat.id)}
                            >
                                <Text style={[styles.catText, selectedCategories.includes(cat.id) && styles.catTextActive]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitText}>{editUser ? 'Update User' : 'Create Account'}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scroll: { padding: 24, paddingBottom: 100 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 30 },
    formGroup: { marginBottom: 24 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 16, color: '#1e293b' },
    roleGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    roleCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 10, marginBottom: 10 },
    roleCardActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
    roleName: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    roleTextActive: { color: '#fff' },
    catGrid: { marginTop: 5 },
    catCard: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12, backgroundColor: '#f8fafc' },
    catCardActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
    catText: { fontSize: 15, color: '#334155', fontWeight: '500' },
    catTextActive: { color: '#2563eb', fontWeight: 'bold' },
    submitBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CreateUserScreen;
