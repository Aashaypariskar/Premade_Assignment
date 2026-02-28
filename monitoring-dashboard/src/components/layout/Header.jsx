import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
    return (
        <header className="header">
            <div className="header-left">
                <span className="header-title">IR INSPECTION MONITORING</span>
                <span className="header-subtitle">LIVE OPERATIONS CONSOLE</span>
            </div>
            <div className="header-right">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: '#1e293b',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#94a3b8'
                }}>
                    <span>DATE RANGE: <span style={{ color: '#f8fafc' }}>Today, Jan 15, 2024</span></span>
                    <span>▾</span>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: '#1e293b',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#94a3b8'
                }}>
                    <span>MODULES: <span style={{ color: '#f8fafc' }}>All</span></span>
                    <span>▾</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
