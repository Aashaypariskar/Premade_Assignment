import React, { useState, useEffect } from 'react';
import { getDefects } from '../api/monitoringApi';
import FilterBar from '../components/common/FilterBar';

const DefectsPage = () => {
    const [defects, setDefects] = useState([]);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({});
    const [loading, setLoading] = useState(true);
    const limit = 25;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const res = await getDefects(page, 25, filters);
                setDefects(res.data);
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
        <div className="page defects-page">
            <h1>Open & Resolved Defects</h1>

            <FilterBar onFilterChange={handleFilterChange} />
            <div className="table-container">
                {loading ? <p>Loading Defects...</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th>Module</th>
                                <th>Defect ID</th>
                                <th>Session ID</th>
                                <th>Status</th>
                                <th>Resolved</th>
                                <th>Before Photo</th>
                                <th>After Photo</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {defects.map((d) => (
                                <tr key={`${d.module_type}-${d.defect_id}`}>
                                    <td>{d.module_type}</td>
                                    <td>{d.defect_id}</td>
                                    <td>{d.session_id}</td>
                                    <td><span className={`status-badge ${d.status?.toLowerCase()}`}>{d.status}</span></td>
                                    <td>{d.resolved ? '✅ Yes' : '❌ No'}</td>
                                    <td>{d.has_before_photo ? '📷 Exists' : 'None'}</td>
                                    <td>{d.has_after_photo ? '📷 Exists' : 'None'}</td>
                                    <td>{new Date(d.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="pagination">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Previous</button>
                <span>Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={defects.length < limit || loading}>Next</button>
            </div>
        </div>
    );
};

export default DefectsPage;
