import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { user, login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.normalizedRole?.toUpperCase().includes("ADMIN")) {
            navigate("/");
        } else if (user && !user.normalizedRole?.toUpperCase().includes("ADMIN")) {
            navigate("/unauthorized");
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/login`, {
                email,
                password
            });

            if (res.data.token) {
                login(res.data.user, res.data.token);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#121212'
        }}>
            <form onSubmit={handleSubmit} style={{
                background: '#1e1e1e',
                padding: '2.5rem',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '400px',
                border: '1px solid #333'
            }}>
                <h1 style={{ marginBottom: '1.5rem', color: '#646cff', textAlign: 'center' }}>Admin Login</h1>

                {error && <p style={{ color: '#f87171', background: '#451a1a', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: '#2a2a2a',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            color: 'white'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: '#2a2a2a',
                            border: '1px solid #444',
                            borderRadius: '4px',
                            color: 'white'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#646cff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Logging in...' : 'Enter Dashboard'}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
