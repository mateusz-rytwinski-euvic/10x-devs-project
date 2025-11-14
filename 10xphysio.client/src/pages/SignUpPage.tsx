import { memo } from 'react';
import { SignUpForm } from '../components/auth/SignUpForm';
import { AppLayout } from '../components/layout/AppLayout';

const SignUpIntro = memo(() => (
    <article className="mx-auto max-w-xl text-center text-slate-900 md:text-left">
    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#055b6e] md:text-sm">Dołącz do 10x Physio</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Tworzymy cyfrowego partnera terapii</h1>
        <p className="mt-6 text-base text-slate-600 md:text-lg">
            Załóż konto, aby prowadzić dokumentację pacjentów, udostępniać plany ćwiczeń oraz korzystać z asystenta AI, który
            wspiera w codziennych decyzjach terapeutycznych.
        </p>
        <p className="mt-10 flex items-center justify-center gap-3 text-sm text-slate-500 md:justify-start">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#055b6e]" />
            Darmowy okres testowy przez 14 dni
        </p>
    </article>
));

SignUpIntro.displayName = 'SignUpIntro';

// The SignUpPage composes the sign-up experience and keeps presentation concerns separate from form logic.
export const SignUpPage = () => {
    return (
        <AppLayout mainClassName="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-50 px-4 sm:px-6">
            <div className="absolute inset-0 -z-20 bg-gradient-to-br from-white via-slate-50 to-emerald-50" aria-hidden="true" />
            <div className="absolute -top-40 left-6 -z-10 h-80 w-80 rounded-full bg-emerald-200/70 blur-3xl sm:left-20" aria-hidden="true" />
            <div className="absolute bottom-[-160px] right-[-20px] -z-10 h-96 w-96 rounded-full bg-sky-200/60 blur-[130px]" aria-hidden="true" />

            <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-12 py-16 md:flex-row md:items-start md:gap-16 md:py-20">
                <SignUpIntro />
                <SignUpForm />
            </section>
        </AppLayout>
    );
};
