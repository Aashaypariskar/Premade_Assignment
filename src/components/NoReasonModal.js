import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const NoReasonModal = ({ question, onDone, onCancel }) => {
    const [selectedReasons, setSelectedReasons] = useState([]);
    const [remarks, setRemarks] = useState('');
    const [image, setImage] = useState(null);
    const [error, setError] = useState('');

    const REASONS = ['Dirty', 'Broken', 'Dented', 'Missing', 'Loose'];

    const toggleReason = (reason) => {
        const isSelected = selectedReasons.includes(reason);
        const next = isSelected
            ? selectedReasons.filter(r => r !== reason)
            : [...selectedReasons, reason];
        setSelectedReasons(next);
        if (next.length > 0) setError('');
    };

    const pickImage = async () => {
        // request permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setError('');
        }
    };

    const handleDone = () => {
        if (selectedReasons.length === 0) {
            setError('Please select at least one reason');
            return;
        }
        if (!image) {
            setError('Image is mandatory for "NO" answers');
            return;
        }
        onDone({ selectedReasons, remarks, image_uri: image });
    };

    return (
        <Modal transparent visible animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <Text style={styles.title}>Audit: {question.text}</Text>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Text style={styles.label}>Select Reasons:</Text>
                    <View style={styles.reasonsGrid}>
                        {REASONS.map(reason => (
                            <TouchableOpacity
                                key={reason}
                                style={[styles.chip, selectedReasons.includes(reason) && styles.chipActive]}
                                onPress={() => toggleReason(reason)}
                            >
                                <Text style={[styles.chipText, selectedReasons.includes(reason) && styles.chipTextActive]}>
                                    {reason}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter remarks (optional)..."
                        value={remarks}
                        onChangeText={setRemarks}
                        multiline
                    />

                    <View style={styles.imageSection}>
                        <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                            <Text style={styles.imgBtnText}>{image ? 'Change Image' : 'Capture Image'}</Text>
                        </TouchableOpacity>
                        {image && (
                            <Image source={{ uri: image }} style={styles.preview} />
                        )}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                            <Text style={styles.doneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    content: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: '#64748b' },
    errorText: { color: '#ef4444', marginBottom: 10, fontSize: 13 },
    reasonsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    chipText: { fontSize: 12, color: '#475569' },
    chipTextActive: { color: '#fff' },
    input: { height: 80, backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
    imageSection: { marginBottom: 20, alignItems: 'center' },
    imgBtn: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
    imgBtnText: { color: '#475569', fontWeight: '500' },
    preview: { width: 100, height: 100, borderRadius: 8, marginTop: 10 },
    footer: { flexDirection: 'row', justifyContent: 'flex-end' },
    cancelBtn: { padding: 12, marginRight: 10 },
    cancelBtnText: { color: '#64748b', fontWeight: '500' },
    doneBtn: { backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    doneBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default NoReasonModal;
