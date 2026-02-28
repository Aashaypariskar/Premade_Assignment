import React, { useState, useEffect } from 'react';
import { getInspectors } from '../../api/monitoringApi';

const FilterBar = ({ onFilterChange }) => {
    const [inspectors, setInspectors] = useState([]);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        module: '',
        inspector: '',
        status: ''
    });

    useEffect(() => {
        const fetchInspectors = async () => {
            try {
                const { data } = await getInspectors();
                setInspectors(data);
            } catch (err) {
                console.error('Failed to fetch inspectors', err);
            }
        };
        fetchInspectors();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleClear = () => {
        const cleared = { startDate: '', endDate: '', module: '', inspector: '', status: '' };
        setFilters(cleared);
        onFilterChange(cleared);
    };

    return (
        <div className="filter-bar">
            <div className="filter-group">
                <label>Date Range</label>
                <div className="date-inputs">
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleChange} />
                    <span>to</span>
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleChange} />
                </div>
            </div>

            <div className="filter-group">
                <label>Module</label>
                <select name="module" value={filters.module} onChange={handleChange}>
                    <option value="">All Modules</option>
                    <option value="WSP">WSP</option>
                    <option value="SICKLINE">Sickline</option>
                    <option value="COMMISSIONARY">Commissionary</option>
                    <option value="CAI">CAI</option>
                    <option value="PITLINE">Pitline</option>
                </select>
            </div>

            <div className="filter-group">
                <label>Inspector</label>
                <select name="inspector" value={filters.inspector} onChange={handleChange}>
                    <option value="">All Inspectors</option>
                    {inspectors.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label>Status</label>
                <select name="status" value={filters.status} onChange={handleChange}>
                    <option value="">All Statuses</option>
                    <option value="0">Open / Deficiency</option>
                    <option value="1">Resolved / OK</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="IN_PROGRESS">In Progress</option>
                </select>
            </div>

            <button className="btn-secondary" onClick={handleClear}>Clear</button>
        </div>
    );
};

export default FilterBar;
