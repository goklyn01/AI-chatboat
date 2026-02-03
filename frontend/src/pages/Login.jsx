import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loginUser } from '../api';

function Login() {
    const [activeTab, setActiveTab] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [standard, setStandard] = useState('9');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (activeTab === 'login') {
                // --- LOGIN FLOW ---
                const response = await loginUser({ email, password });
                const { token, role: userRole } = response.data;

                localStorage.setItem('token', token);
                localStorage.setItem('role', userRole);

                if (userRole === 'student') navigate('/student-dashboard');
                else if (userRole === 'teacher') navigate('/teacher-dashboard');

            } else {
                // --- SIGNUP FLOW ---
                const registrationData = {
                    email,
                    password,
                    role,
                    standard: role === 'student' ? standard : null
                };

                // Using axios directly or import registerUser from api.js
                // Assuming port 9010 is set in api.js, let's use full URL to be safe or imported api
                await axios.post("http://localhost:9010/signup", registrationData);

                // Switch to login after signup
                setActiveTab('login');
                setPassword('');
                alert("Account created! Please login.");
            }
        } catch (err) {
            console.error("Auth Error:", err);
            const message = err.response?.data?.detail || 'Connection error';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setError('');
        // Optional: clear fields or keep them
    };

    return (
        <div id="loginScreen" className="login-container">
            <div className="login-card">
                <h2>CORE AI</h2>
                <div className="tab-buttons">
                    <button
                        className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
                        onClick={() => switchTab('login')}
                    >
                        Login
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'signup' ? 'active' : ''}`}
                        onClick={() => switchTab('signup')}
                    >
                        Sign Up
                    </button>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label>
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>

                    {activeTab === 'signup' && (
                        <>
                            <label>
                                Role
                                <select value={role} onChange={(e) => setRole(e.target.value)}>
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                </select>
                            </label>

                            {role === 'student' && (
                                <label>
                                    Class / Standard
                                    <select value={standard} onChange={(e) => setStandard(e.target.value)}>
                                        <option value="8">Class 8</option>
                                        <option value="9">Class 9</option>
                                        <option value="10">Class 10</option>
                                        <option value="11">Class 11</option>
                                        <option value="12">Class 12</option>
                                    </select>
                                </label>
                            )}
                        </>
                    )}

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" disabled={loading}>
                        {loading ? (activeTab === 'login' ? 'Logging in...' : 'Signing up...') : (activeTab === 'login' ? 'Login' : 'Sign Up')}
                    </button>
                </form>

                <p className="test-credentials">
                    Welcome to the upgraded experience.
                </p>
            </div>
        </div>
    );
}

export default Login;