import type { PropsWithChildren, ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
    redirectTo?: string;
}

// ProtectedRoute guards sections of the app that require authentication and redirects guests to the login screen.
export const ProtectedRoute = ({
    children,
    redirectTo = '/login',
}: PropsWithChildren<ProtectedRouteProps>): ReactElement => {
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to={redirectTo} replace state={{ from: location }} />;
    }

    return <>{children}</>;
};
