import React, { useEffect, useState } from 'react';
import axios from 'axios';

function StudentDashboard() {
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
        axios.get(`http://localhost:8000/student/stats?token=${token}`)
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
            // Updated to match main.py endpoint
            const res = await axios.post(`http://localhost:8000/student/ask-ai-doubt`, { question });
            setChatHistory(prev => [...prev, { role: 'ai', text: res.data.answer }]);
            setQuestion("");
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'ai', text: "AI is offline. Please try again later." }]);
        } finally {
            setLoadingAI(false);
        }
    };

    if (!data) return (
        <div style={{...styles.dashboard, justifyContent: 'center', alignItems: 'center'}}>
            <h2 style={{color: '#38bdf8'}}>Syncing AI Data...</h2>
        </div>
    );

    return (
        <div style={styles.dashboard}>
            {/* Sidebar */}
            <nav style={styles.sidebar}>
                <h2 style={styles.logo}>CORE<span style={{color: '#fff'}}>AI</span></h2>
                <ul style={styles.navList}>
                    <li style={activeTab === 'dashboard' ? styles.activeNavItem : styles.navItem} onClick={() => setActiveTab('dashboard')}>Dashboard</li>
                    <li style={activeTab === 'doubts' ? styles.activeNavItem : styles.navItem} onClick={() => setActiveTab('doubts')}>Ask Doubts</li>
                    <li style={activeTab === 'quizzes' ? styles.activeNavItem : styles.navItem} onClick={() => setActiveTab('quizzes')}>Quizzes</li>
                    <li style={activeTab === 'settings' ? styles.activeNavItem : styles.navItem} onClick={() => setActiveTab('settings')}>Settings</li>
                </ul>
                <button onClick={() => {localStorage.clear(); window.location.href='/';}} style={styles.logoutBtn}>Logout</button>
            </nav>

            {/* Main Content */}
            <main style={styles.mainContent}>
                <header style={styles.header}>
                    <h1 style={{color: '#fff', fontSize: '2rem'}}>
                        {activeTab === 'dashboard' && "Welcome back, "}
                        {activeTab === 'doubts' && "Instant "}
                        {activeTab === 'quizzes' && "Active "}
                        {activeTab === 'settings' && "Account "}
                        <span style={styles.nameHighlight}>
                            {activeTab === 'dashboard' ? data.student_name : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </span>
                    </h1>
                </header>

                {/* DASHBOARD VIEW */}
                {activeTab === 'dashboard' && (
                    <>
                        <div style={styles.topRow}>
                            <div style={styles.statCard}>
                                <h3 style={styles.cardTitle}>ACCURACY</h3>
                                <p style={styles.statValue}>{data.accuracy}%</p>
                                <div style={styles.miniBar}><div style={{...styles.miniFill, width: `${data.accuracy}%`}}></div></div>
                            </div>
                            <div style={styles.statCard}>
                                <h3 style={styles.cardTitle}>CHAPTERS</h3>
                                <p style={styles.statValue}>{data.chapters}</p>
                            </div>
                        </div>
                        <div style={styles.grid}>
                            <div style={styles.sectionCard}>
                                <h3 style={{marginBottom: '20px', color: '#38bdf8'}}>Subject Mastery</h3>
                                {data.subjects && data.subjects.map((sub, i) => (
                                    <div key={i} style={styles.subProgress}>
                                        <div style={styles.subLabel}><span>{sub.name}</span><span>{sub.progress}%</span></div>
                                        <div style={styles.progressContainer}><div style={{...styles.progressLine, width: `${sub.progress}%`}}></div></div>
                                    </div>
                                ))}
                            </div>
                            <div style={styles.sectionCard}>
                                <h3 style={{marginBottom: '20px', color: '#38bdf8'}}>Recent Logs</h3>
                                {data.recent_activity && data.recent_activity.length > 0 ? (
                                    data.recent_activity.map((act, i) => (
                                        <div key={i} style={styles.activityItem}><p style={styles.activityTask}>{act.task}</p></div>
                                    ))
                                ) : (
                                    <p style={{color: '#64748b'}}>No recent activity found.</p>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/*DOUBT VIEW*/}
                {activeTab === 'doubts' && (
                    <div style={styles.sectionCard}>
                        <h3 style={{color: '#38bdf8', marginBottom: '15px'}}>Instant Chapter Help</h3>
                        <div style={styles.chatWindow}>
                            {chatHistory.map((msg, i) => (
                                <div key={i} style={msg.role === 'user' ? styles.userMsg : styles.aiMsg}>
                                    <strong>{msg.role === 'user' ? "You: " : "🤖 AI: "}</strong> {msg.text}
                                </div>
                            ))}
                            {loadingAI && <div style={styles.aiMsg}><strong>🤖 AI: </strong> Thinking...</div>}
                        </div>
                        <div style={{display: 'flex', gap: '15px', marginTop: '20px'}}>
                            <input 
                                style={styles.input} 
                                placeholder="Ask a question..." 
                                value={question} 
                                onChange={(e) => setQuestion(e.target.value)} 
                                onKeyPress={(e) => e.key === 'Enter' && handleAskAI()} 
                            />
                            <button style={styles.aiBtnSmall} onClick={handleAskAI} disabled={loadingAI}>
                                {loadingAI ? "..." : "Ask Now"}
                            </button>
                        </div>
                    </div>
                )}

                {/*QUIZZES VIEW */}
                {activeTab === 'quizzes' && (
                    <div style={styles.sectionCard}>
                        <h3 style={{color: '#38bdf8'}}>Available Quizzes</h3>
                        <p style={{color: '#94a3b8'}}>Testing knowledge for Chapter {data.chapters + 1}</p>
                        <div style={{marginTop: '20px', padding: '20px', backgroundColor: '#0f172a', borderRadius: '15px', border: '1px solid #334155'}}>
                            <h4 style={{color: '#fff'}}>Mid-Term Assessment</h4>
                            <p style={{fontSize: '0.8rem', color: '#64748b'}}>15 Questions | 20 Minutes</p>
                            <button style={{...styles.aiBtnSmall, marginTop: '10px', height: '40px'}}>Start Quiz</button>
                        </div>
                    </div>
                )}

                {/* SETTINGS VIEW */}
                {activeTab === 'settings' && (
                    <div style={styles.sectionCard}>
                        <h3 style={{color: '#38bdf8', marginBottom: '20px'}}>Preferences</h3>
                        <div style={styles.activityItem}>
                            <p style={styles.activityTask}>Account Type</p>
                            <span style={styles.activityDate}>Student Profile</span>
                        </div>
                        <div style={styles.activityItem}>
                            <p style={styles.activityTask}>Dark Mode</p>
                            <span style={styles.activityDate}>Always On</span>
                        </div>
                        <button style={{...styles.logoutBtn, width: '200px', marginTop: '20px'}}>Reset AI Model</button>
                    </div>
                )}
            </main>
        </div>
    );
}


const styles = {
    dashboard: { display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' },
    sidebar: { width: '260px', backgroundColor: '#020617', padding: '30px 20px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e293b' },
    logo: { fontSize: '1.8rem', fontWeight: '800', marginBottom: '50px', color: '#38bdf8', letterSpacing: '2px' },
    navList: { listStyle: 'none', padding: 0, flex: 1 },
    navItem: { padding: '15px', cursor: 'pointer', borderRadius: '10px', marginBottom: '8px', color: '#94a3b8', transition: '0.3s' },
    activeNavItem: { padding: '15px', backgroundColor: '#1e293b', borderRadius: '10px', marginBottom: '8px', color: '#38bdf8', fontWeight: 'bold' },
    mainContent: { flex: 1, padding: '50px', overflowY: 'auto' },
    header: { marginBottom: '40px' },
    nameHighlight: { color: '#38bdf8' },
    topRow: { display: 'flex', gap: '25px', marginBottom: '35px' },
    statCard: { flex: 1, backgroundColor: '#1e293b', padding: '25px', borderRadius: '20px', border: '1px solid #334155' },
    cardTitle: { fontSize: '0.75rem', letterSpacing: '1.5px', color: '#94a3b8', margin: 0 },
    statValue: { fontSize: '2.5rem', fontWeight: '800', margin: '10px 0', color: '#fff' },
    miniBar: { height: '4px', backgroundColor: '#334155', borderRadius: '2px' },
    miniFill: { height: '100%', backgroundColor: '#38bdf8' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '35px' },
    sectionCard: { backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', border: '1px solid #334155' },
    subProgress: { marginBottom: '20px' },
    subLabel: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#cbd5e1', fontSize: '0.9rem' },
    progressContainer: { height: '6px', backgroundColor: '#0f172a', borderRadius: '3px' },
    progressLine: { height: '100%', backgroundColor: '#38bdf8', borderRadius: '3px', boxShadow: '0 0 10px #38bdf844' },
    activityItem: { borderLeft: '2px solid #38bdf8', paddingLeft: '20px', marginBottom: '20px' },
    activityTask: { margin: 0, fontWeight: '500', color: '#f1f5f9' },
    activityDate: { fontSize: '0.8rem', color: '#64748b' },
    aiBtnSmall: { backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
    logoutBtn: { backgroundColor: 'transparent', color: '#f87171', border: '1px solid #f87171', padding: '10px', borderRadius: '10px', cursor: 'pointer' },
    chatWindow: { height: '300px', overflowY: 'auto', backgroundColor: '#0f172a', borderRadius: '15px', padding: '20px', border: '1px solid #334155' },
    userMsg: { backgroundColor: '#1e293b', padding: '10px 15px', borderRadius: '10px', marginBottom: '10px', borderLeft: '3px solid #38bdf8' },
    aiMsg: { backgroundColor: '#020617', padding: '10px 15px', borderRadius: '10px', marginBottom: '10px', borderLeft: '3px solid #10b981' },
    input: { flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: '#fff', outline: 'none' }
};

export default StudentDashboard;