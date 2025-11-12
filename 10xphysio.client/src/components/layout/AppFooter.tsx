import { memo } from 'react';

// AppFooter keeps legal and support links consistent across the application.
export const AppFooter = memo(() => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-slate-200 bg-white/80 py-6 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                <p className="text-center md:text-left">© {currentYear} 10x Physio. Wszelkie prawa zastrzeżone.</p>
                <nav className="flex flex-wrap items-center justify-center gap-4">
                    <a
                        href="mailto:support@10xphysio.app"
                        className="transition-colors hover:text-slate-900"
                    >
                        Kontakt
                    </a>
                </nav>
            </div>
        </footer>
    );
});

AppFooter.displayName = 'AppFooter';
