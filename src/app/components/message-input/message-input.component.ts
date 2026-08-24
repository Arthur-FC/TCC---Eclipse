import { Component, EventEmitter, Output } from '@angular/core';

@Component({
    selector: 'app-message-input',
    standalone: false,
    templateUrl: './message-input.component.html',
    styleUrls: ['./message-input.component.scss']
})
export class MessageInputComponent {
    @Output() messageSent = new EventEmitter<string>();
    message = '';

    send(): void {
        const content = this.message.trim();
        if (!content) {
            return;
        }

        this.messageSent.emit(content);
        this.message = '';
    }
}
