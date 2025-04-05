import axios from 'axios';
import useUserStore from '../store/userStore';

const api = axios.create({
    baseURL: `${import.meta.env.VITE_BASE_URL}/auth`,
    withCredentials: true, // Include credentials (cookies) in requests
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        const { accessToken } = useUserStore.getState();
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;