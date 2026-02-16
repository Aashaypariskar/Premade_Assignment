import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// This modal opens up when student/engineer selects "NO" as an answer
const NoReasonModal = ({ question, onDone, onCancel }) => {
    const [selectedReasons, setSelectedReasons] = useState([]);
    const [remarks, setRemarks] = useState('');
    const [image, setImage] = useState(null);
    const [error, setError] = useState('');

    const REASONS = ['Dirty', 'Broken', 'Dented', 'Missing', 'Loose'];

    const toggleReason = (reason) => {
        if (selectedReasons.includes(reason)) {
            setSelectedReasons(selectedReasons.filter(r => r !== reason));
        } else {
            setSelectedReasons([...selectedReasons, reason]);
            setError(''); // clear error if user picked something
        }
    };

    const pickImage = async () => {
        // Checking for camera permission first
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('No Access', 'We need camera permission to attach photo!');
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
        // Simple validation
        if (selectedReasons.length === 0) {
            setError('Select at least one reason boss');
            return;
        }
        if (!image) {
            setError('Photo is mandatory for NO answers');
            return;
        }

        onDone({
            reasons: selectedReasons,
            remarks,
            image_path: image
        });
    };

    return (
        <Modal transparent visible animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.box}>
                    <Text style={styles.qText}>{question.text}</Text>

                    {error ? <Text style={styles.redText}>{error}</Text> : null}

                    <Text style={styles.label}>Select Reasons:</Text>
                    <View style={styles.row}>
                        {REASONS.map(r => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.tag, selectedReasons.includes(r) && styles.tagActive]}
                                onPress={() => toggleReason(r)}
                            >
                                <Text style={{ color: selectedReasons.includes(r) ? '#fff' : '#000' }}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.textArea}
                        placeholder="Write remarks here..."
                        value={remarks}
                        onChangeText={setRemarks}
                        multiline
                    />

                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <TouchableOpacity style={styles.camBtn} onPress={pickImage}>
                            <Text>{image ? 'Change Photo' : 'Take Photo'}</Text>
                        </TouchableOpacity>
                        {image && (
                            <Image source={{ uri: image }} style={styles.img} />
                        )}
                    </View>

                    <View style={styles.btns}>
                        <TouchableOpacity style={styles.btn1} onPress={onCancel}>
                            <Text>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btn2} onPress={handleDone}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
    box: { backgroundColor: '#fff', borderRadius: 10, padding: 20 },
    qText: { fontSize: 17, marginBottom: 20 },
    label: { fontWeight: 'bold', marginBottom: 10 },
    redText: { color: 'red', marginBottom: 10, fontSize: 13 },
    row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
    tag: { padding: 8, backgroundColor: '#eee', marginRight: 8, marginBottom: 8, borderRadius: 5 },
    tagActive: { backgroundColor: '#2563eb' },
    textArea: { height: 60, backgroundColor: '#f9f9f9', padding: 10, borderRadius: 5, marginBottom: 15, textAlignVertical: 'top' },
    camBtn: { padding: 10, backgroundColor: '#e2e8f0', borderRadius: 5, width: '100%', alignItems: 'center' },
    img: { width: 80, height: 80, marginTop: 10, borderRadius: 5 },
    btns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    btn1: { padding: 12, marginRight: 10 },
    btn2: { backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 5 }
});

export default NoReasonModal;
