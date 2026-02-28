import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getSummary = () => api.get("/monitoring/summary");

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

export const getSessions = (page = 1, limit = 25, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return api.get(`/monitoring/sessions?${params.toString()}`);
};

export const getDefects = (page = 1, limit = 25, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return api.get(`/monitoring/defects?${params.toString()}`);
};

export const getInspectors = () => api.get("/admin/users");

export default api;
