import { useMemo } from 'react';
import { isAuthenticatedSelector, useAuthStore } from '../state/authStore';
import type { AuthSessionDto } from '../types/auth';

interface UseAuthResult {
    isAuthenticated: boolean;
    session: AuthSessionDto | null;
    login: (session: AuthSessionDto) => void;
    logout: () => void;
}

// useAuth consolidates access to the authentication store and memoizes derived flags.
export const useAuth = (): UseAuthResult => {
    const session = useAuthStore((state) => state.session);
    const login = useAuthStore((state) => state.login);
    const logout = useAuthStore((state) => state.logout);
    const isAuthenticated = useAuthStore(isAuthenticatedSelector);

    return useMemo(
        () => ({
            isAuthenticated,
            session,
            login,
            logout,
        }),
        [isAuthenticated, login, logout, session],
    );
};
