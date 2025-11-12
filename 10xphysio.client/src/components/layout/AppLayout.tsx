import type { PropsWithChildren } from 'react';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';

interface AppLayoutProps {
    mainClassName?: string;
}

// AppLayout ensures every view is framed with the shared shell elements while leaving room for page-specific styling.
export const AppLayout = ({ children, mainClassName }: PropsWithChildren<AppLayoutProps>) => {
    const resolvedMainClassName = ['flex flex-1 flex-col', mainClassName].filter(Boolean).join(' ');

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
            <AppHeader />
            <main className={resolvedMainClassName}>{children}</main>
            <AppFooter />
        </div>
    );
};
