import { memo } from 'react';
import { SignUpForm } from '../components/auth/SignUpForm';
import { AppLayout } from '../components/layout/AppLayout';

const SignUpIntro = memo(() => (
    <article className="max-w-xl text-center text-slate-100 md:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300 md:text-sm">Dołącz do 10x Physio</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Tworzymy cyfrowego partnera terapii</h1>
        <p className="mt-6 text-base text-slate-200 md:text-lg">
            Załóż konto, aby prowadzić dokumentację pacjentów, udostępniać plany ćwiczeń oraz korzystać z asystenta AI, który
            wspiera w codziennych decyzjach terapeutycznych.
        </p>
        <p className="mt-10 flex items-center justify-center gap-3 text-sm text-slate-200/90 md:justify-start">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            Darmowy okres testowy przez 14 dni
        </p>
    </article>
));

SignUpIntro.displayName = 'SignUpIntro';

// The SignUpPage composes the sign-up experience and keeps presentation concerns separate from form logic.
export const SignUpPage = () => {
    return (
        <AppLayout mainClassName="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-950 px-4 sm:px-6">
            <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" aria-hidden="true" />
            <div className="absolute -top-32 left-12 -z-10 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl sm:left-24" aria-hidden="true" />
            <div className="absolute bottom-[-160px] right-[-60px] -z-10 h-96 w-96 rounded-full bg-sky-400/30 blur-[120px] sm:right-[-40px]" aria-hidden="true" />

            <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-14 py-14 md:flex-row md:items-start md:gap-16 md:py-20">
                <SignUpIntro />
                <SignUpForm />
            </section>
        </AppLayout>
    );
};
