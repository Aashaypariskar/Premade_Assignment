import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: 'white',
                    border: '2px solid rgba(255,255,255,0.2)'
                }}>
                    IR
                </div>
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/" end>
                    <span style={{ fontSize: '1.25rem' }}>⊞</span>
                    <span>Overview</span>
                </NavLink>
                <NavLink to="/sessions">
                    <span style={{ fontSize: '1.25rem' }}>☰</span>
                    <span>Sessions</span>
                </NavLink>
                <NavLink to="/defects">
                    <span style={{ fontSize: '1.25rem' }}>⚠</span>
                    <span>Deficiencies</span>
                </NavLink>
                <NavLink to="/inspectors">
                    <span style={{ fontSize: '1.25rem' }}>👤</span>
                    <span>Inspectors</span>
                </NavLink>
                <NavLink to="/reports">
                    <span style={{ fontSize: '1.25rem' }}>📄</span>
                    <span>Reports</span>
                </NavLink>
            </nav>
        </aside>
    );
};

export default Sidebar;
