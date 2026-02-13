import axios from 'axios';
import { Platform } from 'react-native';

// For Android Emulator, use 10.0.2.2. For physical devices, use your computer's IP.
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

export const getTrains = async () => {
    const res = await api.get('/trains');
    return res.data;
};

export const getCoaches = async (trainId) => {
    const res = await api.get(`/coaches?train_id=${trainId}`);
    return res.data;
};

export const getCategories = async (coachId) => {
    const res = await api.get(`/categories?coach_id=${coachId}`);
    return res.data;
};

export const getQuestions = async (activityType) => {
    const res = await api.get(`/questions?activity_type=${activityType}`);
    return res.data;
};

export const submitInspection = async (payload) => {
    const res = await api.post('/submit', payload);
    return res.data;
};

export default api;
