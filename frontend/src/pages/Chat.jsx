import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import {
    getSessions,
    createSession,
    getSession,
    sendMessageToSession,
    getSubjects
} from '../api';
import Sidebar from './Sidebar';
import ChatConfig from './ChatConfig';

export default function ChatScreen() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // Data State
    const [subjects, setSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    // Chat State
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);

    // UI State
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingSession, setLoadingSession] = useState(false);
    const [error, setError] = useState('');

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Initial Load
    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }
        loadData();
    }, [token]);

    const loadData = async () => {
        setLoadingSubjects(true);
        try {
            // Load Subjects
            const subs = await getSubjects(token);
            setSubjects(subs);

            // Load History
            const hist = await getSessions(token);
            setSessions(hist);
        } catch (err) {
            console.error("Failed to load data", err);
            if (err.response && err.response.status === 401) {
                navigate('/');
            }
        } finally {
            setLoadingSubjects(false);
        }
    };

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // reset
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [input]);

    const handleSelectSession = async (id) => {
        if (!token) return;
        setCurrentSessionId(id);
        setLoadingSession(true);
        setError('');
        try {
            const sessionData = await getSession(token, id);
            setMessages(sessionData.messages || []);
        } catch (err) {
            console.error(err);
            setError("Failed to load chat session.");
        } finally {
            setLoadingSession(false);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setInput('');
        setError('');
    };

    const handleStartChat = async (subject, chapter, language) => {
        if (!token) return;
        setLoadingSession(true);
        try {
            const newSession = await createSession(token, subject, chapter, language);
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
            setMessages([]); // New session, empty messages
        } catch (err) {
            console.error(err);
            setError("Failed to create new session.");
        } finally {
            setLoadingSession(false);
        }
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || !currentSessionId || !token || sending) return;

        const originalInput = input;
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setError('');

        // Optimistic update
        const tempMsg = {
            id: Date.now(),
            role: 'user',
            content: originalInput,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);
        setSending(true);

        try {
            const response = await sendMessageToSession(token, currentSessionId, originalInput);

            const aiMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.answer,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            console.error(err);
            setError("Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="app-container">
            <Sidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                onLogout={handleLogout}
            />

            <div className="chat-main">
                <button
                    onClick={() => navigate('/student-dashboard')}
                    className="back-dashboard-btn"
                >
                    Back to Dashboard
                </button>

                {!currentSessionId ? (
                    <ChatConfig
                        subjects={subjects}
                        loading={loadingSubjects || loadingSession}
                        onStartChat={handleStartChat}
                    />
                ) : (
                    <>
                        <div className="chat-scroll-area">
                            <div className="chat-content-width">
                                {loadingSession && <p style={{ textAlign: 'center', color: '#888' }}>Loading conversation...</p>}

                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`message-row ${msg.role}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="avatar">
                                                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ padding: '6px' }}>
                                                    <path d="M12 4L14.4 9.6L20 12L14.4 14.4L12 20L9.6 14.4L4 12L9.6 9.6L12 4Z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="message-content markdown-body">
                                            {msg.role === 'assistant' ? (
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {sending && (
                                    <div className="message-row assistant">
                                        <div className="avatar">
                                            <div className="sparkle-anim" />
                                        </div>
                                        <div className="message-content">
                                            <span style={{ fontStyle: 'italic', color: '#888' }}>Generates...</span>
                                        </div>
                                    </div>
                                )}

                                {error && <div className="error-message">{error}</div>}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <div className="input-area-wrapper">
                            <div className="input-container">
                                <textarea
                                    ref={textareaRef}
                                    className="chat-input"
                                    placeholder="Enter a prompt here"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={sending}
                                />
                                <button
                                    className="send-btn"
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || sending}
                                >
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
