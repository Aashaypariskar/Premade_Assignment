import React, { useState, useEffect } from 'react';
import { getSummary, getSessions } from '../api/monitoringApi';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip,
    AreaChart, Area
} from 'recharts';

const MOD_COLORS = {
    PITLINE: '#3b82f6',
    SICKLINE: '#f59e0b',
    COMMISSIONARY: '#10b981',
    CAI: '#a855f7',
    WSP: '#14b8a6'
};

const DashboardPage = () => {
    const [summary, setSummary] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [sumRes, sessRes] = await Promise.all([
                getSummary(),
                getSessions(1, 10)
            ]);
            setSummary(sumRes.data);
            setSessions(sessRes.data);
        } catch (err) {
            console.error('Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !summary) return <div style={{ padding: '2rem', color: '#94a3b8' }}>Initializing Console...</div>;

    return (
        <div>
            {/* Row 1: Summary */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 className="section-title">Critical Operations Summary</h2>
                <div className="dashboard-row" style={{ alignItems: 'stretch' }}>
                    <div className="summary-grid">
                        <div className="card metric-card">
                            <span className="metric-label">Total Inspections Today</span>
                            <span className="metric-value">{summary?.total_inspections_today || 0}</span>
                        </div>
                        <div className="card metric-card">
                            <span className="metric-label">Active Sessions</span>
                            <span className="metric-value">{summary?.active_sessions_count || 0}</span>
                        </div>
                        <div className="card metric-card">
                            <span className="metric-label">Open Defects</span>
                            <span className="metric-value" style={{ color: '#ef4444' }}>{summary?.total_open_defects || 0}</span>
                            <span className="metric-status" style={{ color: '#ef4444' }}>Status Red</span>
                        </div>
                        <div className="card metric-card">
                            <span className="metric-label">Resolved Defects</span>
                            <span className="metric-value" style={{ color: '#10b981' }}>{summary?.total_resolved_defects || 0}</span>
                            <span className="metric-status" style={{ color: '#10b981' }}>Status Green</span>
                        </div>
                    </div>

                    <div className="card" style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column' }}>
                        <span className="metric-label" style={{ marginBottom: '0.5rem' }}>Top 3 Trains <span style={{ color: '#64748b', fontSize: '10px' }}>(PITLINE Open)</span></span>
                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '10px', borderBottom: '1px solid #334155', paddingBottom: '2px' }}>
                                <span>Train Number</span>
                                <span>Open Defects</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>12952 NDLS-BCT</span>
                                <span style={{ color: '#ef4444' }}>52 ↑</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>12952 NDLS-AIT</span>
                                <span style={{ color: '#10b981' }}>73 ↑</span>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span className="metric-label" style={{ alignSelf: 'flex-start', marginBottom: '0.5rem' }}>Photo Compliance</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>92.5%</div>
                        <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center' }}>of resolved defects include evidence</div>
                    </div>
                </div>
            </div>

            {/* Row 2: Live Feed & Module Dist */}
            <div className="dashboard-row">
                <div className="card col-60" style={{ padding: '0' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="section-title" style={{ margin: 0 }}>Live Global Activity Feed</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>60%</span>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Mod</th>
                                <th>Train/Rake</th>
                                <th>Coach</th>
                                <th>Status</th>
                                <th>Inspector</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session, idx) => (
                                <tr key={idx} className="feed-row" style={{ borderLeft: session.status === 'DRAFT' ? '3px solid #ef4444' : 'none' }}>
                                    <td style={{ color: '#94a3b8', fontSize: '12px' }}>{new Date(session.created_at).toLocaleTimeString([], { hour12: false })}</td>
                                    <td>
                                        <span className={`badge badge-${MOD_COLORS[session.module_type] ? session.module_type.toLowerCase() : 'blue'}`} style={{
                                            backgroundColor: MOD_COLORS[session.module_type] + '22',
                                            color: MOD_COLORS[session.module_type],
                                            border: `1px solid ${MOD_COLORS[session.module_type]}44`
                                        }}>
                                            {session.module_type}
                                        </span>
                                    </td>
                                    <td>{session.train_id || '—'}</td>
                                    <td>{session.coach_id}</td>
                                    <td style={{ fontSize: '11px' }}>
                                        {session.status === 'COMPLETED' ? (
                                            <span style={{ color: '#10b981', background: '#10b98111', padding: '2px 6px', borderRadius: '4px' }}>COMPLETED</span>
                                        ) : (
                                            <span>Open: <span style={{ color: '#ffffff' }}>2</span> | <span style={{ color: '#ef4444' }}>Critical: 1</span></span>
                                        )}
                                    </td>
                                    <td style={{ color: '#94a3b8' }}>{session.inspector_id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="card col-40" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span className="section-title" style={{ margin: 0 }}>Module Distribution Visualization</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>40%</span>
                    </div>
                    <div style={{ height: '200px', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={summary?.module_distribution || []}
                                    dataKey="count"
                                    nameKey="module_type"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                >
                                    {summary?.module_distribution?.map((entry, index) => (
                                        <Cell key={index} fill={MOD_COLORS[entry.module_type] || '#334155'} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>1248</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>TOTAL</div>
                        </div>
                    </div>
                    {/* Horizontal Mini Bars */}
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ height: '12px', background: '#334155', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: '45%', background: '#3b82f6' }} />
                            <div style={{ width: '15%', background: '#f59e0b' }} />
                            <div style={{ width: '15%', background: '#a855f7' }} />
                            <div style={{ width: '10%', background: '#10b981' }} />
                            <div style={{ width: '15%', background: '#14b8a6' }} />
                        </div>
                        <div style={{ fontSize: '10px', display: 'flex', gap: '1rem', color: '#94a3b8', justifyContent: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#64748b', borderRadius: '2px' }} /> Open</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '2px' }} /> Resolved</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Aging, Repeats, Leaderboard */}
            <div className="dashboard-row">
                <div className="card col-30">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span className="section-title" style={{ margin: 0 }}>Defect Aging Breakdown</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>30%</span>
                    </div>
                    <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={[
                            { name: '0-24h', val: 58 },
                            { name: '24-72h', val: 85 },
                            { name: '>72h', val: 70 }
                        ]}>
                            <Bar dataKey="val">
                                <Cell fill="#94a3b8" />
                                <Cell fill="#94a3b8" opacity={0.7} />
                                <Cell fill="#ef4444" />
                            </Bar>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card col-40" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span className="section-title" style={{ margin: 0 }}>Repeated Defect Analysis</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>40%</span>
                    </div>
                    <div style={{ display: 'flex', flex: 1 }}>
                        <div style={{ flex: '0 0 140px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
                            <div style={{ color: '#3b82f6', textDecoration: 'underline' }}>Coach A5</div>
                            <div style={{ color: '#3b82f6', textDecoration: 'underline' }}>Coach B1</div>
                            <div style={{ color: '#3b82f6', textDecoration: 'underline' }}>Loco WAP7</div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[
                                    { x: 0, y: 10 }, { x: 1, y: 30 }, { x: 2, y: 15 }, { x: 3, y: 45 }, { x: 4, y: 20 }
                                ]}>
                                    <Area type="monotone" dataKey="y" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="card col-30" style={{ padding: '0' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
                        <span className="section-title" style={{ margin: 0 }}>Inspector Leaderboard</span>
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>High Risk Inspector ⚠</span>
                    </div>
                    <table className="data-table" style={{ fontSize: '11px' }}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th style={{ textAlign: 'center' }}>Sess.</th>
                                <th style={{ textAlign: 'center' }}>Def.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                <td style={{ color: '#ffffff' }}>Indian Sharma <span style={{ color: '#ef4444' }}>⚠</span></td>
                                <td style={{ textAlign: 'center' }}>87</td>
                                <td style={{ textAlign: 'center' }}>3</td>
                            </tr>
                            <tr>
                                <td>Rajesh Kumar</td>
                                <td style={{ textAlign: 'center' }}>64</td>
                                <td style={{ textAlign: 'center' }}>12</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
