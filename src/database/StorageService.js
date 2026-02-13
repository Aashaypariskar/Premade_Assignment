// This is a simple wrapper for storage simulation
// In a real app, this would use @react-native-async-storage/async-storage

const STORAGE_KEY = '@inspection_app_data';

// Using a mock storage object for simulation purposes if needed
const mockStorage = {};

export const saveItem = async (key, value) => {
    try {
        // simulation
        const existingData = JSON.parse(mockStorage[STORAGE_KEY] || '{}');
        existingData[key] = value;
        mockStorage[STORAGE_KEY] = JSON.stringify(existingData);
        return true;
    } catch (error) {
        console.error('Error saving to storage', error);
        return false;
    }
};

export const getItem = async (key) => {
    try {
        const data = JSON.parse(mockStorage[STORAGE_KEY] || '{}');
        return data[key] || null;
    } catch (error) {
        console.error('Error reading from storage', error);
        return null;
    }
};

export const clearStorage = async () => {
    delete mockStorage[STORAGE_KEY];
};
