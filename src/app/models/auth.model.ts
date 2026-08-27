export interface AuthenticatedUser {
    id: string;
    name: string;
    email: string;
    createdAt: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials extends LoginCredentials {
    name: string;
}

export type AuthRequest =
    | { mode: 'login'; credentials: LoginCredentials }
    | { mode: 'register'; credentials: RegisterCredentials };
