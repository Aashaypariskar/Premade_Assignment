import axios from 'axios';

const BASE_URL = 'http://10.236.52.56:3000/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
});

export const getTrains = async () => {
    try {
        const res = await api.get('/train-list');
        console.log("Trains fetched:", res.data);
        return res.data;
    } catch (err) {
        console.log("API Error:", err);
        return [];
    }
};

export const getCoaches = async (trainId) => {
    const res = await api.get(`/coach-list?train_id=${trainId}`);
    return res.data;
};

export const getCategories = async (coachId) => {
    const res = await api.get(`/areas?coach_id=${coachId}`);
    return res.data;
};

export const getActivities = async (categoryId) => {
    const res = await api.get(`/activity-types?category_id=${categoryId}`);
    return res.data;
};

// Getting questions based on Minor/Major and category
export const getQuestions = async (activityType, categoryId) => {
    const res = await api.get(`/checklist?activity_type=${activityType}&category_id=${categoryId}`);
    return res.data;
};

export const submitInspection = async (payload) => {
    const res = await api.post('/save-inspection', payload);
    return res.data;
};

export default api;
