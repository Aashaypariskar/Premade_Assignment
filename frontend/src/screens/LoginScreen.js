import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useStore } from '../store/StoreContext';
import { login } from '../api/auth';

const LoginScreen = () => {
    const { setUser } = useStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const data = await login(email, password);
            setUser(data.user);
        } catch (err) {
            setError(err.error || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.logoText}>🚀 AuditMaster</Text>
                    <Text style={styles.subtitle}>Enterprise Inspection Portal</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="admin@inspection.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Secure Login Protected by RBAC</Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    header: { alignItems: 'center', marginBottom: 30 },
    logoText: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
    label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
    inputContainer: { marginBottom: 20 },
    input: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
    button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
    buttonDisabled: { backgroundColor: '#94a3b8' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    errorText: { color: '#ef4444', backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 20, textAlign: 'center', fontSize: 13 },
    footer: { marginTop: 30, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 20 },
    footerText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' }
});

export default LoginScreen;
