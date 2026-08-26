import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AuthRequest } from '../../models/auth.model';

@Component({
    selector: 'app-auth-screen',
    standalone: false,
    templateUrl: './auth-screen.component.html',
    styleUrls: ['./auth-screen.component.scss']
})
export class AuthScreenComponent {
    @Input() loading = false;
    @Input() errorMessage = '';
    @Output() authenticationRequested = new EventEmitter<AuthRequest>();

    mode: 'login' | 'register' = 'login';
    name = '';
    email = '';
    password = '';

    submit(): void {
        if (this.loading) {
            return;
        }

        if (this.mode === 'register') {
            this.authenticationRequested.emit({
                mode: 'register',
                credentials: {
                    name: this.name.trim(),
                    email: this.email.trim(),
                    password: this.password
                }
            });
            return;
        }

        this.authenticationRequested.emit({
            mode: 'login',
            credentials: {
                email: this.email.trim(),
                password: this.password
            }
        });
    }

    switchMode(): void {
        if (this.loading) {
            return;
        }
        this.mode = this.mode === 'login' ? 'register' : 'login';
        this.password = '';
    }
}
