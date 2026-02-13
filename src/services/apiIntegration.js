import axios from 'axios';

const BASE_URL = 'http://192.168.31.188:3000/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
});

export const getTrains = async () => {
    try {
        const res = await api.get('/trains');
        console.log("Trains:", res.data);
        return res.data;
    } catch (err) {
        console.log("API Error:", err);
        return [];
    }
};

export const getCoaches = async (trainId) => {
    const res = await api.get(`/coaches?train_id=${trainId}`);
    return res.data;
};

export const getCategories = async (coachId) => {
    const res = await api.get(`/categories?coach_id=${coachId}`);
    return res.data;
};

export const getActivities = async (categoryId) => {
    const res = await api.get(`/activities?category_id=${categoryId}`);
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
