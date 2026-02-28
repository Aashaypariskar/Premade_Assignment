import React from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import SessionsPage from './pages/SessionsPage';
import DefectsPage from './pages/DefectsPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './routes/ProtectedRoute';

const MainLayout = () => {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Header />
                <main className="content-area">
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/sessions" element={<SessionsPage />} />
                        <Route path="/defects" element={<DefectsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/unauthorized" element={
                        <div className="unauthorized" style={{ padding: '2rem', textAlign: 'center' }}>
                            <h1>Access Denied</h1>
                            <p>You do not have permissions to view this dashboard.</p>
                            <button onClick={() => window.location.href = '/login'}>Back to Login</button>
                        </div>
                    } />
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
