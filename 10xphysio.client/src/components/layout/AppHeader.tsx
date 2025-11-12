import { Button } from '@fluentui/react-components';
import { memo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface HeaderLink {
    label: string;
    to: string;
    isVisible: boolean;
}

// AppHeader centralizes the application brand and high-level navigation, keeping entry points consistent across pages.
export const AppHeader = memo(() => {
    const location = useLocation();
    const { isAuthenticated, logout } = useAuth();

    const navigationLinks: HeaderLink[] = [
        {
            label: 'Zaloguj się',
            to: '/login',
            isVisible: !isAuthenticated && location.pathname !== '/login',
        },
        {
            label: 'Zarejestruj się',
            to: '/signup',
            isVisible: !isAuthenticated && location.pathname !== '/signup',
        },
    ];

    const handleLogout = useCallback(() => {
        logout();
    }, [logout]);

    const homeLink = isAuthenticated ? '/patients' : '/login';

    return (
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4">
                <Link to={homeLink} className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <img src="/logo.png" alt="10x Physio Logo" className="h-10 w-auto" />
                </Link>

                <nav className="flex flex-1 items-center justify-end gap-3 text-sm font-medium text-slate-600">
                    {navigationLinks
                        .filter((link) => link.isVisible)
                        .map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="rounded-full px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                                {link.label}
                            </Link>
                        ))}

                    {isAuthenticated ? (
                        <>
                            {/* Fluent UI button ensures focus-visible styling without extra work, keeping the header accessible. */}
                            <Button appearance="primary" size="small" onClick={handleLogout}>
                                Wyloguj
                            </Button>
                        </>
                    ) : null}
                </nav>
            </div>
        </header>
    );
});

AppHeader.displayName = 'AppHeader';
