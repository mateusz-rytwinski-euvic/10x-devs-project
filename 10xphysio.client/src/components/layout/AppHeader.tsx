import { Button } from '@fluentui/react-components';
import { SignOut20Regular } from '@fluentui/react-icons';
import { memo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { routes } from '../../routes';

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
            label: 'Profil',
            to: routes.profile,
            isVisible: isAuthenticated,
        },
        {
            label: 'Zaloguj się',
            to: routes.login,
            isVisible: !isAuthenticated && location.pathname !== routes.login,
        },
        {
            label: 'Zarejestruj się',
            to: routes.signup,
            isVisible: !isAuthenticated && location.pathname !== routes.signup,
        },
    ];

    const handleLogout = useCallback(() => {
        logout();
    }, [logout]);

    const homeLink = isAuthenticated ? routes.patients : routes.login;

    return (
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4">
                <Link to={homeLink} className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <img src="/logo.png" alt="10x Physio Logo" className="h-10 w-auto" />
                </Link>

                <nav className="flex flex-1 items-center justify-end gap-3 text-sm font-medium text-slate-600">
                    {navigationLinks
                        .filter((link) => link.isVisible)
                        .map((link) => {
                            const isActive = location.pathname === link.to;
                            const baseClasses =
                                'rounded-full px-3 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400';
                            const activeClasses = isActive
                                ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-900'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';

                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`${baseClasses} ${activeClasses}`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}

                    {isAuthenticated ? (
                        <>
                            {/* Fluent UI button ensures focus-visible styling without extra work, keeping the header accessible. */}
                            {/* Adding a sign-out icon improves immediate recognition of the logout action, especially for quick scanning users. */}
                            <Button
                                appearance="primary"
                                size="small"
                                icon={<SignOut20Regular />}
                                onClick={handleLogout}
                            >
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
