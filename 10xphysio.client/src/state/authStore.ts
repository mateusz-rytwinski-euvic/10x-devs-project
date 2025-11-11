import { create } from 'zustand';
import type { AuthSessionDto } from '../types/auth';

// AuthState centralizes the authenticated session details across the application.
interface AuthState {
    session: AuthSessionDto | null;
    login: (session: AuthSessionDto) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    login: (session) => {
        set({ session });
    },
    logout: () => {
        set({ session: null });
    },
}));

// isAuthenticatedSelector exposes a stable selector for memoized consumption across hooks and components.
export const isAuthenticatedSelector = (state: AuthState) => state.session !== null;
