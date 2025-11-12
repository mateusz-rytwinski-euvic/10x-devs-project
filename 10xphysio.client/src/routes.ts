import type { ComponentType } from 'react';
import { LoginPage } from './pages/LoginPage';
import { PatientsPage } from './pages/PatientsPage';
import { SignUpPage } from './pages/SignUpPage';

/**
 * Centralized route definitions for the application.
 * All application paths should be defined here to ensure consistency and ease of maintenance.
 */
export const routes = {
    login: '/login',
    signup: '/signup',
    patients: '/patients',
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
];