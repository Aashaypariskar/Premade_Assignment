import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://192.168.1.7:3000/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
});

// Inject JWT Token into requests
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('user_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor for handling 401 globally
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.warn('Session expired or unauthorized. Logging out...');
            await SecureStore.deleteItemAsync('user_token');
            await SecureStore.deleteItemAsync('user_data');
            // Root cause of 401 is usually expired session
        }
        return Promise.reject(error);
    }
);

export const getUserCategories = async () => {
    const res = await api.get('/user-categories');
    return res.data;
};

export const getTrains = async (categoryName) => {
    const res = await api.get(`/train-list?category_name=${encodeURIComponent(categoryName)}`);
    return res.data;
};

export const getCoaches = async (trainId, categoryName) => {
    const res = await api.get(`/coach-list?train_id=${trainId}&category_name=${encodeURIComponent(categoryName)}`);
    return res.data;
};

export const getActivities = async (coachId, categoryName) => {
    const res = await api.get(`/activity-types?coach_id=${coachId}&category_name=${encodeURIComponent(categoryName)}`);
    return res.data;
};

export const getQuestions = async (activityId) => {
    const res = await api.get(`/checklist?activity_id=${activityId}`);
    return res.data;
};

export const submitInspection = async (payload) => {
    const res = await api.post('/save-inspection', payload);
    return res.data;
};

// --- Admin APIs ---

export const getAdminUsers = async () => {
    const res = await api.get('/admin/users');
    return res.data;
};

export const createAdminUser = async (userData) => {
    const res = await api.post('/admin/create-user', userData);
    return res.data;
};

export const updateAdminUser = async (userId, userData) => {
    const res = await api.put(`/admin/user/${userId}`, userData);
    return res.data;
};

export const updateAdminUserCategories = async (userId, categoryIds) => {
    const res = await api.put(`/admin/user-categories/${userId}`, { category_ids: categoryIds });
    return res.data;
};

export const deleteAdminUser = async (userId) => {
    const res = await api.delete(`/admin/user/${userId}`);
    return res.data;
};

export const getAdminMetadata = async () => {
    const res = await api.get('/admin/metadata');
    return res.data;
};

// Question Management APIs
export const getQuestionsByActivity = async (activityId) => {
    const res = await api.get(`/questions?activity_id=${activityId}`);
    return res.data;
};

export const createQuestion = async (questionData) => {
    const res = await api.post('/admin/question', questionData);
    return res.data;
};

export const updateQuestion = async (questionId, questionData) => {
    const res = await api.put(`/admin/question/${questionId}`, questionData);
    return res.data;
};

export const deleteQuestion = async (questionId) => {
    const res = await api.delete(`/admin/question/${questionId}`);
    return res.data;
};

// Reason Management APIs
export const getReasonsByQuestion = async (questionId) => {
    const res = await api.get(`/reasons?question_id=${questionId}`);
    return res.data;
};

export const createReason = async (reasonData) => {
    // reasonData should contain { question_id, text }
    const res = await api.post('/admin/reason', reasonData);
    return res.data;
};

export const updateReason = async (reasonId, reasonData) => {
    const res = await api.put(`/admin/reason/${reasonId}`, reasonData);
    return res.data;
};

export const deleteReason = async (reasonId) => {
    const res = await api.delete(`/admin/reason/${reasonId}`);
    return res.data;
};

// Report APIs
export const getReports = async () => {
    const res = await api.get('/reports');
    return res.data;
};

export const getReportDetails = async (params) => {
    // params: { train_number, coach_number, date, user_id }
    const res = await api.get('/report-details', { params });
    return res.data;
};

export default api;
