import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    AuthenticatedUser,
    LoginCredentials,
    RegisterCredentials
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly authUrl = `${environment.apiBaseUrl}/auth`;

    constructor(private readonly http: HttpClient) {}

    getCurrentUser(): Promise<AuthenticatedUser> {
        return firstValueFrom(
            this.http.get<AuthenticatedUser>(`${this.authUrl}/me`, {
                withCredentials: true
            })
        );
    }

    login(credentials: LoginCredentials): Promise<AuthenticatedUser> {
        return firstValueFrom(
            this.http.post<AuthenticatedUser>(`${this.authUrl}/login`, credentials, {
                withCredentials: true
            })
        );
    }

    register(credentials: RegisterCredentials): Promise<AuthenticatedUser> {
        return firstValueFrom(
            this.http.post<AuthenticatedUser>(`${this.authUrl}/register`, credentials, {
                withCredentials: true
            })
        );
    }

    async logout(): Promise<void> {
        await firstValueFrom(
            this.http.post<void>(`${this.authUrl}/logout`, null, {
                withCredentials: true
            })
        );
    }
}
