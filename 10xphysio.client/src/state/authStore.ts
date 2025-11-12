import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { AuthSessionDto } from '../types/auth';

// AuthState centralizes the authenticated session details across the application.
interface AuthState {
    session: AuthSessionDto | null;
    login: (session: AuthSessionDto) => void;
    logout: () => void;
}

const AUTH_SESSION_STORAGE_KEY = '10xphysio.auth.session';

// buildStorage returns a Storage-like interface that falls back to an in-memory implementation during SSR builds.
const buildStorage = (): StateStorage => {
    if (typeof window === 'undefined') {
        const inMemoryStorage: Record<string, string> = {};

        return {
            getItem: (name) => {
                return Object.prototype.hasOwnProperty.call(inMemoryStorage, name) ? inMemoryStorage[name] : null;
            },
            setItem: (name, value) => {
                inMemoryStorage[name] = value;
            },
            removeItem: (name) => {
                delete inMemoryStorage[name];
            },
        };
    }

    return window.localStorage;
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            session: null,
            login: (session) => {
                set({ session });
            },
            logout: () => {
                set({ session: null });
            },
        }),
        {
            name: AUTH_SESSION_STORAGE_KEY,
            storage: createJSONStorage(buildStorage),
            partialize: (state) => ({ session: state.session }),
            onRehydrateStorage: () => (_, error) => {
                if (error) {
                    console.error('Failed to restore persisted auth session.', error);
                }
            },
        },
    ),
);

// isAuthenticatedSelector exposes a stable selector for memoized consumption across hooks and components.
export const isAuthenticatedSelector = (state: AuthState) => state.session !== null;
