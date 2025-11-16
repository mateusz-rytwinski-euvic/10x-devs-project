import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
    const queryClient = useQueryClient();
    const session = useAuthStore((state) => state.session);
    const loginFromStore = useAuthStore((state) => state.login);
    const logoutFromStore = useAuthStore((state) => state.logout);
    const isAuthenticated = useAuthStore(isAuthenticatedSelector);

    const login = useCallback(
        (nextSession: AuthSessionDto) => {
            queryClient.clear();
            loginFromStore(nextSession);
        },
        [loginFromStore, queryClient],
    );

    const logout = useCallback(() => {
        queryClient.clear();
        logoutFromStore();
    }, [logoutFromStore, queryClient]);

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
