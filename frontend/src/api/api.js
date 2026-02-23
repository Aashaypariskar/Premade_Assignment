import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL, ENV_NAME } from '../config/environment';


const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
});

// Inject JWT Token into requests
api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('user_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // DEBUG: Log outgoing request details
    console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.data instanceof FormData) {
        console.log(' - Body: FormData');
    } else if (config.data) {
        console.log(' - Body Keys:', Object.keys(config.data));
    }

    return config;
}, (error) => {
    console.error('[API REQUEST ERROR]', error);
    return Promise.reject(error);
});

// Response Interceptor for handling errors globally
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const errorDetails = {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method?.toUpperCase()
        };

        console.error('[API ERROR DETAILS]', JSON.stringify(errorDetails, null, 2));

        if (error.response?.status === 401) {
            console.warn('Session expired or unauthorized. Logging out...');
            await SecureStore.deleteItemAsync('user_token');
            await SecureStore.deleteItemAsync('user_data');
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

export const getActivities = async (coachId, categoryName, subcategoryId = null) => {
    let url = `/activity-types?coach_id=${coachId}&category_name=${encodeURIComponent(categoryName)}`;
    if (subcategoryId) url += `&subcategory_id=${subcategoryId}`;
    const res = await api.get(url);
    return res.data;
};

export const getAmenitySubcategories = async (categoryName, coachId) => {
    const res = await api.get(`/amenity-subcategories`, { params: { category_name: categoryName, coach_id: coachId } });
    return res.data;
};

// --- WSP (New Architecture) ---
export const getWspSession = (coach_number) => api.get(`/wsp/session?coach_number=${coach_number}`).then(res => res.data);
export const getWspSchedules = () => api.get('/wsp/schedules').then(res => res.data);
export const getWspQuestions = (scheduleId) => api.get(`/wsp/questions?schedule_id=${scheduleId}`).then(res => res.data);
export const saveWspAnswers = (data) => api.post('/wsp/save', data).then(res => res.data);
export const getWspProgress = (coachNumber, mode = 'INDEPENDENT') =>
    api.get('/wsp/progress', { params: { coach_number: coachNumber, mode } }).then(res => res.data);

// --- COMMON ENDPOINTS ---
export const getSubcategoryMetadata = (subId) =>
    api.get('/common/subcategory-metadata', { params: { subcategory_id: subId } }).then(res => res.data);

// --- COMMISSIONARY ENDPOINTS ---
export const getCommissionarySession = (coach_number) => api.get(`/commissionary/session?coach_number=${coach_number}`).then(res => res.data);
export const getCommissionaryCoaches = () => api.get('/commissionary/coaches').then(res => res.data);
export const createCommissionaryCoach = (data) => api.post('/commissionary/coaches', data).then(res => res.data);

export const getCommissionaryQuestions = (subId, actType) =>
    api.get('/commissionary/questions', { params: { subcategory_id: subId, activity_type: actType } }).then(r => r.data);

export const saveCommissionaryAnswers = async (data) => {
    try {
        const isFormData = data instanceof FormData;

        const response = await api.post(
            '/commissionary/save',
            data,
            isFormData
                ? {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    transformRequest: (formData) => formData,
                }
                : {}
        );

        return response.data;
    } catch (error) {
        console.log("SAVE API ERROR:", error.response?.data || error.message);
        throw error;
    }
};

export const getCommissionaryProgress = (coachNumber) =>
    api.get('/commissionary/progress', { params: { coach_number: coachNumber } }).then(r => r.data);

export const completeCommissionarySession = (coach_number) => api.post('/commissionary/complete', { coach_number }).then(res => res.data);

export const getCommissionaryCombinedReport = (sessionId) =>
    api.get('/commissionary/combined-report', { params: { session_id: sessionId } }).then(r => r.data);

// --- SICK LINE ENDPOINTS (Isolated) ---
export const getSickLineSession = (coach_number) => api.get(`/sickline/session?coach_number=${coach_number}`).then(res => res.data);
export const getSickLineQuestions = (subId, actType) =>
    api.get('/sickline/questions', { params: { subcategory_id: subId, activity_type: actType } }).then(r => r.data);

export const saveSickLineAnswers = async (data) => {
    try {
        const isFormData = data instanceof FormData;
        const response = await api.post(
            '/sickline/save',
            data,
            isFormData
                ? {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    transformRequest: (formData) => formData,
                }
                : {}
        );
        return response.data;
    } catch (error) {
        console.log("SICKLINE SAVE API ERROR:", error.response?.data || error.message);
        throw error;
    }
};

export const getSickLineProgress = (coachNumber) =>
    api.get('/sickline/progress', { params: { coach_number: coachNumber } }).then(r => r.data);

export const completeSickLineSession = (coach_number) => api.post('/sickline/complete', { coach_number }).then(res => res.data);

export const getSickLineCombinedReport = (sessionId) =>
    api.get('/sickline/combined-report', { params: { session_id: sessionId } }).then(r => r.data);

export const getQuestions = async (activityId, scheduleId = null, subcategoryId = null) => {
    let url = `/checklist?`;
    if (scheduleId) {
        url += `schedule_id=${scheduleId}`;
    } else if (activityId) {
        url += `activity_id=${activityId}`;
    }
    if (subcategoryId) url += `&subcategory_id=${subcategoryId}`;
    const res = await api.get(url);
    return res.data;
};

export const submitInspection = async (payload) => {
    const res = await api.post('/save-inspection', payload);
    return res.data;
};

export const getCombinedSummary = async (scheduleId, area) => {
    const res = await api.get(`/summary?schedule_id=${scheduleId}&area=${encodeURIComponent(area)}`);
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
export const getReports = async (filters = {}) => {
    const res = await api.get('/reports', { params: filters });
    return res.data;
};

export const getReportFilterOptions = async () => {
    const res = await api.get('/report-filters');
    return res.data;
};

export const getReportDetails = async (params) => {
    // params: { train_number, coach_number, date, user_id }
    const res = await api.get('/report-details', { params });
    return res.data;
};

export const getCombinedReport = async (params) => {
    // params: { coach_id, subcategory_id, activity_type, date }
    const res = await api.get('/reports/combined', { params });
    return res.data;
};

export default api;
