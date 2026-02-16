import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Reusable Image Picker Component
 * Supports Camera & Gallery with Preview
 */
const ImagePickerField = ({ image, onImagePicked, onRemove }) => {

    const requestPermissions = async () => {
        const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return camStatus === 'granted' && libStatus === 'granted';
    };

    const takePhoto = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert('Permission denied', 'We need access to camera and photos');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            onImagePicked(result.assets[0].uri);
        }
    };

    const pickImage = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert('Permission denied', 'We need access to photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            onImagePicked(result.assets[0].uri);
        }
    };

    return (
        <View style={styles.container}>
            {image ? (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: image }} style={styles.preview} />
                    <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
                        <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.btn} onPress={takePhoto}>
                        <Text style={styles.btnText}>📷 Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.secondaryBtn]} onPress={pickImage}>
                        <Text style={styles.btnText}>📁 Upload</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginVertical: 10 },
    btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
    btn: { flex: 1, backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    secondaryBtn: { backgroundColor: '#64748b' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    previewContainer: { alignItems: 'center' },
    preview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#eee' },
    removeBtn: { marginTop: 8, padding: 5 },
    removeText: { color: '#ef4444', fontWeight: 'bold' }
});

export default ImagePickerField;
