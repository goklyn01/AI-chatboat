import React, { useEffect, useState } from 'react';
import axios from 'axios';

function TeacherDashboard() {
    const [data, setData] = useState(null);
    const [view, setView] = useState('overview');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClass, setSelectedClass] = useState("All");

    useEffect(() => {
        const token = localStorage.getItem('token');
        axios.get(`http://localhost:8000/teacher/analytics?token=${token}`)
            .then(res => setData(res.data))
            .catch(err => console.error("Error loading analytics", err));
    }, []);

    if (!data) return (
        <div style={{...styles.dashboard, justifyContent: 'center', alignItems: 'center'}}>
            <h2 style={{color: '#38bdf8'}}>Loading Teacher Analytics...</h2>
        </div>
    );

    const handleStudentClick = (student) => {
        setSelectedStudent(student);
        setView('performance');
    };

    // Filter Logic: Search by Name and Filter by Class
    const filteredStudents = data.students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = selectedClass === "All" || s.class === selectedClass;
        return matchesSearch && matchesClass;
    });

    // Get unique classes for the dropdown filter
    const classes = ["All", ...new Set(data.students.map(s => s.class).filter(Boolean))];

    return (
        <div style={styles.dashboard}>
            {/* Sidebar */}
            <nav style={styles.sidebar}>
                <h2 style={styles.logo}>CORE<span style={{color: '#fff'}}>AI</span></h2>
                <ul style={styles.navList}>
                    <li style={view === 'overview' ? styles.activeNavItem : styles.navItem} onClick={() => setView('overview')}>📊 Class Overview</li>
                    <li style={view === 'list' ? styles.activeNavItem : styles.navItem} onClick={() => setView('list')}>👥 Student List</li>
                </ul>
                <button onClick={() => {localStorage.clear(); window.location.href='/';}} style={styles.logoutBtn}>Logout</button>
            </nav>

            {/* Main Content */}
            <main style={styles.mainContent}>
                <header style={styles.header}>
                    <h1 style={{color: '#fff'}}>Teacher Analytics <span style={{color: '#38bdf8'}}>Control Panel</span></h1>
                </header>

                {/* OVERVIEW */}
                {view === 'overview' && (
                    <>
                        <div style={styles.topRow}>
                            <div style={styles.statCard}>
                                <h3 style={styles.cardTitle}>TOTAL STUDENTS</h3>
                                <p style={styles.statValue}>{data.total_students}</p>
                            </div>
                            <div style={styles.statCard}>
                                <h3 style={styles.cardTitle}>CLASS AVG ACCURACY</h3>
                                <p style={styles.statValue}>{data.average_accuracy}%</p>
                                <div style={styles.miniBar}><div style={{...styles.miniFill, width: `${data.average_accuracy}%`}}></div></div>
                            </div>
                        </div>

                        <div style={styles.sectionCard}>
                            <div style={styles.filterBar}>
                                <h3 style={{color: '#38bdf8'}}>Performance Roster</h3>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <input 
                                        style={styles.input} 
                                        placeholder="Search name..." 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                    />
                                    <select 
                                        style={styles.select} 
                                        value={selectedClass} 
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                    >
                                        {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.tableHeader}>
                                        <th style={styles.th}>Name</th>
                                        <th style={styles.th}>Class</th>
                                        <th style={styles.th}>Accuracy</th>
                                        <th style={styles.th}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} style={styles.tr}>
                                            <td style={{...styles.td, color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => handleStudentClick(student)}>
                                                {student.name}
                                            </td>
                                            <td style={styles.td}>{student.class || "N/A"}</td>
                                            <td style={styles.td}>{student.accuracy}%</td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    ...styles.statusBadge, 
                                                    backgroundColor: student.accuracy < 50 ? '#7f1d1d' : '#064e3b',
                                                    color: student.accuracy < 50 ? '#f87171' : '#34d399'
                                                }}>
                                                    {student.accuracy < 50 ? 'Low' : 'On Track'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* VIEW 2: LIST  */}
                {view === 'list' && (
                    <div style={styles.sectionCard}>
                        <h3 style={{marginBottom: '20px', color: '#38bdf8'}}>Student Directory</h3>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeader}>
                                    <th style={styles.th}>Name</th>
                                    <th style={styles.th}>Email</th>
                                    <th style={styles.th}>Class Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.students.map((student) => (
                                    <tr key={student.id} style={styles.tr}>
                                        <td style={styles.td}>{student.name}</td>
                                        <td style={styles.td}>{student.email}</td>
                                        <td style={styles.td}>Grade {student.class || "Not Set"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/*PERFORMANCE */}
                {view === 'performance' && selectedStudent && (
                    <div style={styles.sectionCard}>
                        <button onClick={() => setView('overview')} style={styles.backBtn}>← Back</button>
                        <h2 style={{color: '#fff'}}>Report: <span style={{color: '#38bdf8'}}>{selectedStudent.name}</span></h2>
                        <div style={styles.topRow}>
                            <div style={styles.statCard}><h3 style={styles.cardTitle}>ACCURACY</h3><p style={styles.statValue}>{selectedStudent.accuracy}%</p></div>
                            <div style={styles.statCard}><h3 style={styles.cardTitle}>PROGRESS</h3><p style={styles.statValue}>{selectedStudent.chapters} Ch.</p></div>
                        </div>
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
    navItem: { padding: '15px', cursor: 'pointer', borderRadius: '10px', marginBottom: '8px', color: '#94a3b8' },
    activeNavItem: { padding: '15px', backgroundColor: '#1e293b', borderRadius: '10px', marginBottom: '8px', color: '#38bdf8', fontWeight: 'bold' },
    mainContent: { flex: 1, padding: '50px', overflowY: 'auto' },
    header: { marginBottom: '40px' },
    topRow: { display: 'flex', gap: '25px', marginBottom: '35px' },
    statCard: { flex: 1, backgroundColor: '#1e293b', padding: '25px', borderRadius: '20px', border: '1px solid #334155' },
    cardTitle: { fontSize: '0.75rem', color: '#94a3b8', margin: 0 },
    statValue: { fontSize: '2.5rem', fontWeight: '800', margin: '10px 0', color: '#fff' },
    miniBar: { height: '4px', backgroundColor: '#334155', borderRadius: '2px' },
    miniFill: { height: '100%', backgroundColor: '#38bdf8' },
    sectionCard: { backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', border: '1px solid #334155' },
    filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    input: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#fff' },
    select: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px', color: '#fff' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeader: { textAlign: 'left', borderBottom: '1px solid #334155' },
    th: { padding: '15px', color: '#94a3b8', fontSize: '0.85rem' },
    tr: { borderBottom: '1px solid #0f172a' },
    td: { padding: '15px', color: '#f1f5f9' },
    statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
    logoutBtn: { backgroundColor: 'transparent', color: '#f87171', border: '1px solid #f87171', padding: '10px', borderRadius: '10px', cursor: 'pointer' },
    backBtn: { backgroundColor: 'transparent', color: '#38bdf8', border: 'none', cursor: 'pointer', marginBottom: '10px' }
};

export default TeacherDashboard;