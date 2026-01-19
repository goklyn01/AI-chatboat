import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loginUser } from '../api';

function Login() {
    // Controls which form is shown: 'login', 'register', or 'forgot'
    const [view, setView] = useState('login'); 
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('student');
    const [studentClass, setStudentClass] = useState('10'); 
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(''); // New state for success messages
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (view === 'login') {
                // --- LOGIN FLOW ---
                const response = await loginUser({ email, password });
                const { token, role: userRole } = response.data;
                
                localStorage.setItem('token', token);
                localStorage.setItem('role', userRole);

                if (userRole === 'student') navigate('/student-dashboard');
                else if (userRole === 'teacher') navigate('/teacher-dashboard');

            } else if (view === 'register') {
                // --- REGISTRATION FLOW ---
                const registrationData = { 
                    name, email, password, role, 
                    class: role === 'student' ? studentClass : null 
                };
                await axios.post("http://localhost:8000/register", registrationData);
                
                setSuccess("Account created successfully! Please login.");
                setView('login');
                setPassword('');

            } else if (view === 'forgot') {
                // --- FORGOT PASSWORD FLOW ---
                await axios.post("http://localhost:8000/forgot-password", { 
                    email: email, 
                    new_password: password 
                });
                
                setSuccess("Password reset successfully! You can now login.");
                setView('login');
                setPassword('');
            }
        } catch (err) {
            console.error("Auth Error:", err);
            const message = err.response?.data?.detail || 'Connection error';
            setError(message);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginCard}>
                <h2 style={styles.title}>CORE<span style={{color: '#fff'}}>AI</span></h2>
                
                {/* Tab Switcher (Hidden when in Forgot Password mode) */}
                {view !== 'forgot' && (
                    <div style={styles.tabContainer}>
                        <button 
                            style={view === 'login' ? styles.activeTab : styles.inactiveTab} 
                            onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                        >Login</button>
                        <button 
                            style={view === 'register' ? styles.activeTab : styles.inactiveTab} 
                            onClick={() => { setView('register'); setError(''); setSuccess(''); }}
                        >Register</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <p style={styles.subtitle}>
                        {view === 'login' ? "Welcome back" : 
                         view === 'register' ? "Create your account" : 
                         "Reset your password"}
                    </p>

                    {view === 'register' && (
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Full Name</label>
                            <input 
                                type="text" placeholder="John Doe" style={styles.input}
                                value={name} onChange={(e) => setName(e.target.value)} required 
                            />
                        </div>
                    )}

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input 
                            type="email" placeholder="name@school.com" style={styles.input}
                            value={email} onChange={(e) => setEmail(e.target.value)} required 
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            {view === 'forgot' ? "New Password" : "Password"}
                        </label>
                        <input 
                            type="password" placeholder="••••••••" style={styles.input}
                            value={password} onChange={(e) => setPassword(e.target.value)} required 
                        />
                    </div>

                    {view === 'register' && (
                        <>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Register as:</label>
                                <select 
                                    style={styles.input} 
                                    value={role} 
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                </select>
                            </div>

                            {role === 'student' && (
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Select Your Class</label>
                                    <select 
                                        style={styles.input} 
                                        value={studentClass} 
                                        onChange={(e) => setStudentClass(e.target.value)}
                                    >
                                        {[5,6,7,8,9,10,11,12].map(grade => (
                                            <option key={grade} value={grade}>Grade {grade}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {error && <p style={styles.errorText}>{error}</p>}
                    {success && <p style={styles.successText}>{success}</p>}

                    <button type="submit" style={styles.loginBtn}>
                        {view === 'login' ? "Sign In" : 
                         view === 'register' ? "Register Now" : 
                         "Update Password"}
                    </button>

                    {/* Footer Links */}
                    <div style={{marginTop: '20px', textAlign: 'center'}}>
                        {view === 'login' && (
                            <span 
                                style={styles.linkText} 
                                onClick={() => { setView('forgot'); setError(''); }}
                            >
                                Forgot Password?
                            </span>
                        )}
                        {view === 'forgot' && (
                            <span 
                                style={styles.linkText} 
                                onClick={() => { setView('login'); setError(''); }}
                            >
                                Back to Login
                            </span>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#020617', fontFamily: 'Inter, sans-serif' },
    loginCard: { width: '100%', maxWidth: '420px', padding: '40px', backgroundColor: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', textAlign: 'center' },
    title: { fontSize: '2rem', fontWeight: '800', color: '#38bdf8', letterSpacing: '2px', marginBottom: '10px' },
    subtitle: { color: '#94a3b8', fontSize: '0.9rem', marginBottom: '25px' },
    tabContainer: { display: 'flex', backgroundColor: '#020617', borderRadius: '12px', padding: '5px', marginBottom: '25px' },
    activeTab: { flex: 1, padding: '10px', backgroundColor: '#1e293b', color: '#38bdf8', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    inactiveTab: { flex: 1, padding: '10px', backgroundColor: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer' },
    form: { display: 'flex', flexDirection: 'column', textAlign: 'left' },
    inputGroup: { marginBottom: '15px' },
    label: { display: 'block', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '5px' },
    input: { width: '100%', padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '10px', color: '#fff', outline: 'none', boxSizing: 'border-box' },
    errorText: { color: '#f87171', fontSize: '0.85rem', marginBottom: '15px', textAlign: 'center' },
    successText: { color: '#10b981', fontSize: '0.85rem', marginBottom: '15px', textAlign: 'center' },
    loginBtn: { width: '100%', padding: '14px', backgroundColor: '#38bdf8', color: '#020617', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    linkText: { color: '#38bdf8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }
};

export default Login;