import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function StudentDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [question, setQuestion] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        // Fetching stats from backend
        // Use full URL or rely on proxy/CORS. Fixed in previous steps to allow 9010.
        axios.get(`http://localhost:9010/student/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => setData(res.data))
            .catch(err => {
                console.error("Error loading stats", err);
                if (err.response?.status === 401) {
                    localStorage.clear();
                    window.location.href = '/';
                }
            });
    }, []);

    const handleAskAI = async () => {
        if (!question.trim()) return;

        const userMsg = { role: 'user', text: question };
        setChatHistory(prev => [...prev, userMsg]);
        setLoadingAI(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:9010/student/ask-ai-doubt`,
                { question },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setChatHistory(prev => [...prev, { role: 'ai', text: res.data.answer }]);
            setQuestion("");
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'ai', text: "AI is offline. Please try again later." }]);
        } finally {
            setLoadingAI(false);
        }
    };

    if (!data) return (
        <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <h2 style={{ color: 'var(--accent-blue)' }}>Syncing AI Data...</h2>
        </div>
    );

    return (
        <div className="app-container">
            {/* Sidebar - Reusing styles from main Sidebar */}
            <nav className="sidebar">
                <h2 className="dashboard-nav-logo">CORE<span style={{ color: '#fff' }}>AI</span></h2>
                <ul style={{ listStyle: 'none', padding: 0, flex: 1 }}>
                    <li
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        Dashboard
                    </li>
                    <li
                        className="nav-item"
                        onClick={() => navigate('/chat')}
                    >
                        Ask Doubts
                    </li>
                    <li
                        className={`nav-item ${activeTab === 'quizzes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('quizzes')}
                    >
                        Quizzes
                    </li>
                    <li
                        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </li>
                </ul>
                <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="logout-btn">Logout</button>
            </nav>

            {/* Main Content */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1 style={{ color: '#fff', fontSize: '2rem' }}>
                        {activeTab === 'dashboard' && "Welcome back, "}
                        {activeTab === 'doubts' && "Instant "}
                        {activeTab === 'quizzes' && "Active "}
                        {activeTab === 'settings' && "Account "}
                        <span style={{ color: 'var(--accent-blue)' }}>
                            {activeTab === 'dashboard' ? data.student_name : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </span>
                    </h1>
                </header>

                {/* DASHBOARD VIEW */}
                {activeTab === 'dashboard' && (
                    <>
                        <div className="stat-card-row">
                            <div className="stat-card">
                                <h3 className="stat-label">ACCURACY</h3>
                                <p className="stat-value">{data.accuracy}%</p>
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${data.accuracy}%` }}></div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <h3 className="stat-label">CHAPTERS</h3>
                                <p className="stat-value">{data.chapters}</p>
                            </div>
                        </div>
                        <div className="dashboard-grid">
                            <div className="section-card">
                                <h3 style={{ marginBottom: '20px', color: 'var(--accent-blue)' }}>Subject Mastery</h3>
                                {data.subjects && data.subjects.map((sub, i) => (
                                    <div key={i} style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            <span>{sub.name}</span><span>{sub.progress}%</span>
                                        </div>
                                        <div className="progress-track" style={{ height: '6px', backgroundColor: '#0f172a' }}>
                                            <div className="progress-fill" style={{ width: `${sub.progress}%`, boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)' }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="section-card">
                                <h3 style={{ marginBottom: '20px', color: 'var(--accent-blue)' }}>Recent Logs</h3>
                                {data.recent_activity && data.recent_activity.length > 0 ? (
                                    data.recent_activity.map((act, i) => (
                                        <div key={i} className="activity-item">
                                            <p className="activity-task">{act.task}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)' }}>No recent activity found.</p>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/*DOUBT VIEW (Fallback/Mini if needed, though button goes to /chat now)*/}
                {activeTab === 'doubts' && (
                    <div className="section-card">
                        <h3 style={{ color: 'var(--accent-blue)', marginBottom: '15px' }}>Instant Chapter Help</h3>
                        {/* Reusing Styles similar to chat for consistency */}
                        <div style={{ height: '300px', overflowY: 'auto', backgroundColor: '#0f172a', borderRadius: '15px', padding: '20px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`message-row ${msg.role}`} style={{ marginBottom: '10px' }}>
                                    <div className="message-content" style={{
                                        backgroundColor: msg.role === 'user' ? 'var(--user-bubble)' : 'transparent',
                                        padding: msg.role === 'user' ? '10px 15px' : '0',
                                        borderRadius: '10px'
                                    }}>
                                        <strong>{msg.role === 'user' ? "You: " : "🤖 AI: "}</strong> {msg.text}
                                    </div>
                                </div>
                            ))}
                            {loadingAI && <div style={{ color: 'var(--text-secondary)' }}><strong>🤖 AI: </strong> Thinking...</div>}
                        </div>
                        <div className="input-container">
                            <input
                                className="chat-input"
                                placeholder="Ask a question..."
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                            />
                            <button className="send-btn" onClick={handleAskAI} disabled={loadingAI}>
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/*QUIZZES VIEW */}
                {activeTab === 'quizzes' && (
                    <div className="section-card">
                        <h3 style={{ color: 'var(--accent-blue)' }}>Available Quizzes</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Testing knowledge for Chapter {data.chapters + 1}</p>
                        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#0f172a', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
                            <h4 style={{ color: '#fff' }}>Mid-Term Assessment</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>15 Questions | 20 Minutes</p>
                            <button className="start-chat-btn" style={{ marginTop: '10px', fontSize: '14px', padding: '8px 16px' }}>Start Quiz</button>
                        </div>
                    </div>
                )}

                {/* SETTINGS VIEW */}
                {activeTab === 'settings' && (
                    <div className="section-card">
                        <h3 style={{ color: 'var(--accent-blue)', marginBottom: '20px' }}>Preferences</h3>
                        <div className="activity-item">
                            <p className="activity-task">Account Type</p>
                            <span className="activity-date">Student Profile</span>
                        </div>
                        <div className="activity-item">
                            <p className="activity-task">Dark Mode</p>
                            <span className="activity-date">Always On</span>
                        </div>
                        <button className="logout-btn" style={{ width: '200px', marginTop: '20px' }}>Reset AI Model</button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default StudentDashboard;