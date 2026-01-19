
// import axios from 'axios';

// const API_BASE = "http://localhost:8000";

// export const loginUser = (credentials) => {
//     return axios.post(`${API_BASE}/login`, credentials);
// };

// export const getStudentStats = (token) => {
//     return axios.get(`${API_BASE}/student/stats`, {
//         params: { token: token }
//     });
// };

// export const getTeacherAnalytics = (token) => {
//     return axios.get(`${API_BASE}/teacher/analytics`, {
//         params: { token: token }
//     });
// };

import axios from 'axios';

const API_BASE = "http://localhost:8000";


export const loginUser = (credentials) => {
    return axios.post(`${API_BASE}/login`, credentials);
};

export const registerUser = (userData) => {
    return axios.post(`${API_BASE}/register`, userData);
};


export const getStudentStats = (token) => {
    return axios.get(`${API_BASE}/student/stats`, {
        params: { token: token }
    });
};

export const askAIDoubt = (questionData) => {
    return axios.post(`${API_BASE}/student/ask-ai-doubt`, questionData);
};


export const getTeacherAnalytics = (token) => {
    return axios.get(`${API_BASE}/teacher/analytics`, {
        params: { token: token }
    });
};