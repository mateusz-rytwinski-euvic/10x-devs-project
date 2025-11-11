// LoginViewModel captures the transient state of the login form inputs.
export interface LoginViewModel {
    email: string;
    password: string;
}

// AuthLoginCommand mirrors the payload expected by the backend /api/auth/login endpoint.
export interface AuthLoginCommand {
    email: string;
    password: string;
}

// AuthSessionDto represents the response returned after a successful authentication handshake.
export interface AuthSessionDto {
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

// LoginFormErrors groups validation and API level error messages so the UI can surface them consistently.
export interface LoginFormErrors {
    email?: string;
    password?: string;
    api?: string;
}
