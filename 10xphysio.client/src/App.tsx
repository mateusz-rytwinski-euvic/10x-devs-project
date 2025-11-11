import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { PatientsPage } from './pages/PatientsPage';

export const App = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/patients"
                element={isAuthenticated ? <PatientsPage /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to={isAuthenticated ? '/patients' : '/login'} replace />} />
        </Routes>
    );
};