import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { PatientsPage } from './pages/PatientsPage';
import { SignUpPage } from './pages/SignUpPage';

export const App = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/patients" replace /> : <LoginPage />}
            />
            <Route
                path="/signup"
                element={isAuthenticated ? <Navigate to="/patients" replace /> : <SignUpPage />}
            />
            <Route
                path="/patients"
                element={
                    <ProtectedRoute>
                        <PatientsPage />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to={isAuthenticated ? '/patients' : '/login'} replace />} />
        </Routes>
    );
};