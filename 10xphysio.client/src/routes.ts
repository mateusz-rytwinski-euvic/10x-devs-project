import type { ComponentType } from 'react';
import { LoginPage } from './pages/LoginPage';
import { PatientDetailsPage } from './pages/PatientDetailsPage';
import { PatientsPage } from './pages/PatientsPage';
import { SignUpPage } from './pages/SignUpPage';
import { VisitDetailsPage } from './pages/VisitDetailsPage';
import { VisitFormPage } from './pages/VisitFormPage';

/**
 * Centralized route definitions for the application.
 * All application paths should be defined here to ensure consistency and ease of maintenance.
 */
export const routes = {
    login: '/login',
    signup: '/signup',
    patients: '/patients',
    patientDetails: '/patients/:patientId',
    patientVisitCreate: '/patients/:patientId/visits/new',
    patientVisitForm: '/patients/:patientId/visits/:visitId',
    patientVisitDetails: '/patients/:patientId/visits/:visitId/details',
} as const;

/**
 * Type representing the available route keys.
 */
export type RouteKey = keyof typeof routes;

/**
 * Helper function to get a route path by key.
 * @param key - The route key.
 * @returns The route path.
 */
export const getRoute = (key: RouteKey): string => routes[key];

/**
 * Interface for route configuration.
 */
export interface RouteConfig {
    path: string;
    component: ComponentType;
    isProtected: boolean;
}

/**
 * Centralized route configurations.
 * Each route specifies its path, component, and protection status.
 */
export const routeConfigs: RouteConfig[] = [
    {
        path: routes.login,
        component: LoginPage,
        isProtected: false,
    },
    {
        path: routes.signup,
        component: SignUpPage,
        isProtected: false,
    },
    {
        path: routes.patients,
        component: PatientsPage,
        isProtected: true,
    },
    {
        path: routes.patientDetails,
        component: PatientDetailsPage,
        isProtected: true,
    },
    {
        path: routes.patientVisitCreate,
        component: VisitFormPage,
        isProtected: true,
    },
    {
        path: routes.patientVisitForm,
        component: VisitFormPage,
        isProtected: true,
    },
    {
        path: routes.patientVisitDetails,
        component: VisitDetailsPage,
        isProtected: true,
    },
];

const replacePathParams = (path: string, params: Record<string, string>): string => {
    return Object.entries(params).reduce((accumulator, [key, value]) => {
        return accumulator.replace(`:${key}`, value);
    }, path);
};

export const getPatientDetailsPath = (patientId: string): string => {
    return replacePathParams(routes.patientDetails, { patientId });
};

export const getPatientVisitCreatePath = (patientId: string): string => {
    return replacePathParams(routes.patientVisitCreate, { patientId });
};

export const getPatientVisitFormPath = (patientId: string, visitId: string): string => {
    return replacePathParams(routes.patientVisitForm, { patientId, visitId });
};

export const getPatientVisitDetailsPath = (patientId: string, visitId: string): string => {
    return replacePathParams(routes.patientVisitDetails, { patientId, visitId });
};