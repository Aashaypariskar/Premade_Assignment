import axios from 'axios';

const BASE_URL = 'http://10.0.2.2:3000/api'; // Use 10.0.2.2 for Android Emulator

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
});

export const fetchTrains = async () => {
    const response = await api.get('/trains');
    return response.data;
};

export const fetchCoaches = async (trainId) => {
    const response = await api.get(`/coaches?train_id=${trainId}`);
    return response.data;
};

export const fetchQuestions = async (activityType) => {
    const response = await api.get(`/questions?activity_type=${activityType}`);
    return response.data;
};

export const submitInspection = async (payload) => {
    // payload: { train_id, coach_id, activity_id, answers: [...] }
    const response = await api.post('/submit', payload);
    return response.data;
};

export default api;
