import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';

const LoginHero = memo(() => (
    <article className="max-w-xl text-center text-slate-100 md:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300 md:text-sm">10x Physio</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            Twój cyfrowy asystent terapii pacjentów
        </h1>
        <p className="mt-6 text-base text-slate-200 md:text-lg">
            Zarządzaj dokumentacją, planami ćwiczeń i komunikacją z pacjentami z jednego miejsca. Nasz panel usprawnia
            codzienną pracę terapeutów i zapewnia szybki dostęp do historii wizyt.
        </p>
        <p className="mt-10 flex items-center justify-center gap-3 text-sm text-slate-200/90 md:justify-start">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            Bezpieczne logowanie i zgodność z RODO
        </p>
    </article>
));

LoginHero.displayName = 'LoginHero';

// The LoginPage is responsible for composing the login experience and redirecting already authenticated users.
export const LoginPage = () => {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <Navigate to="/patients" replace />;
    }

    return (
        <AppLayout mainClassName="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-950 px-4 sm:px-6">
            <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" aria-hidden="true" />
            <div className="absolute -top-40 right-10 -z-10 h-72 w-72 rounded-full bg-sky-400/35 blur-3xl sm:right-24" aria-hidden="true" />
            <div className="absolute bottom-[-140px] left-[-80px] -z-10 h-96 w-96 rounded-full bg-emerald-400/25 blur-[120px] sm:left-[-60px]" aria-hidden="true" />

            <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-14 py-14 md:flex-row md:items-start md:gap-16 md:py-20">
                <LoginHero />
                <LoginForm />
            </section>
        </AppLayout>
    );
};
