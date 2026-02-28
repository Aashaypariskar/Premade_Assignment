import React, { useState, useEffect } from 'react';
import { getSessions } from '../api/monitoringApi';
import FilterBar from '../components/common/FilterBar';

const SessionsPage = () => {
    const [sessions, setSessions] = useState([]);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({});
    const [loading, setLoading] = useState(true);
    const limit = 25;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const res = await getSessions(page, 25, filters);
                setSessions(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [page, filters]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setPage(1);
    };

    return (
        <div className="page sessions-page">
            <h1>Inspection Sessions</h1>

            <FilterBar onFilterChange={handleFilterChange} />
            <div className="table-container">
                {loading ? <p>Loading Sessions...</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th>Session ID</th>
                                <th>Module</th>
                                <th>Coach</th>
                                <th>Inspector</th>
                                <th>Status</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s) => (
                                <tr key={`${s.module_type}-${s.session_id}`}>
                                    <td>{s.session_id}</td>
                                    <td>{s.module_type}</td>
                                    <td>{s.coach_id}</td>
                                    <td>{s.inspector_id}</td>
                                    <td><span className={`status-badge ${s.status?.toLowerCase()}`}>{s.status}</span></td>
                                    <td>{new Date(s.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="pagination">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Previous</button>
                <span>Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={sessions.length < limit || loading}>Next</button>
            </div>
        </div>
    );
};

export default SessionsPage;
