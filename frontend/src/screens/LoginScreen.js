import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useStore } from '../store/StoreContext';
import { login } from '../api/auth';
import { COLORS, SPACING, RADIUS } from '../config/theme';

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
                        style={[styles.input, { color: COLORS.textPrimary }]}
                        placeholder="admin@inspection.com"
                        placeholderTextColor={COLORS.placeholder}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={[styles.input, { color: COLORS.textPrimary }]}
                        placeholder="••••••••"
                        placeholderTextColor={COLORS.placeholder}
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
    container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: 20 },
    card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 32, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    header: { alignItems: 'center', marginBottom: 40 },
    logoText: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
    subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6 },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, marginLeft: 2 },
    inputContainer: { marginBottom: 20 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 15, fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
    button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 10, elevation: 2 },
    buttonDisabled: { backgroundColor: COLORS.disabled },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    errorText: { color: COLORS.danger, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, marginBottom: 24, textAlign: 'center', fontSize: 14, borderWidth: 1, borderColor: '#FECDD3' },
    footer: { marginTop: 40, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 24 },
    footerText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' }
});

export default LoginScreen;
