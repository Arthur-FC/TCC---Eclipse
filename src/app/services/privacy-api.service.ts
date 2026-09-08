import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthenticatedUser } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class PrivacyApiService {
    private readonly url = `${environment.apiBaseUrl}/privacy`;

    constructor(private readonly http: HttpClient) {}

    exportData(): Promise<Record<string, unknown>> {
        return firstValueFrom(this.http.get<Record<string, unknown>>(`${this.url}/export`, { withCredentials: true }));
    }

    usage(): Promise<any> {
        return firstValueFrom(this.http.get<any>(`${this.url}/usage`, { withCredentials: true }));
    }

    updateProfile(name: string, email: string): Promise<AuthenticatedUser> {
        return firstValueFrom(this.http.patch<AuthenticatedUser>(`${this.url}/profile`, { name, email }, { withCredentials: true }));
    }

    async deleteAccount(password: string): Promise<void> {
        await firstValueFrom(this.http.delete<void>(`${this.url}/account`, {
            withCredentials: true,
            body: { confirmation: 'EXCLUIR', password }
        }));
    }
}
