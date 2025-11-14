import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';

const LoginHero = memo(() => (
    <article className="mx-auto max-w-xl text-center text-slate-900 md:text-left">
    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#055b6e] md:text-sm">Panel terapeuty</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            Twój cyfrowy asystent terapii pacjentów
        </h1>
        <p className="mt-6 text-base text-slate-600 md:text-lg">
            Zarządzaj dokumentacją, planami ćwiczeń i komunikacją z pacjentami z jednego miejsca. Nasz panel usprawnia
            codzienną pracę terapeutów i zapewnia szybki dostęp do historii wizyt.
        </p>
        <p className="mt-10 flex items-center justify-center gap-3 text-sm text-slate-500 md:justify-start">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#055b6e]" />
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
        <AppLayout mainClassName="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-50 px-4 sm:px-6">
            <div className="absolute inset-0 -z-20 bg-gradient-to-br from-white via-slate-50 to-emerald-50" aria-hidden="true" />
            <div className="absolute -top-32 right-6 -z-10 h-72 w-72 rounded-full bg-emerald-200/70 blur-3xl sm:right-16" aria-hidden="true" />
            <div className="absolute bottom-[-140px] left-[-40px] -z-10 h-96 w-96 rounded-full bg-sky-200/60 blur-[130px] sm:left-[-20px]" aria-hidden="true" />

            <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-12 py-16 md:flex-row md:items-start md:gap-16 md:py-20">
                <LoginHero />
                <LoginForm />
            </section>
        </AppLayout>
    );
};
