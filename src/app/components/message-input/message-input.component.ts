import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-message-input',
    standalone: false,
    templateUrl: './message-input.component.html',
    styleUrls: ['./message-input.component.scss']
})
export class MessageInputComponent implements OnChanges {
    @Input() disabled = false;
    @Input() resetToken = 0;
    @Output() messageSent = new EventEmitter<string>();
    message = '';

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['resetToken'] && !changes['resetToken'].firstChange) {
            this.message = '';
        }
    }

    send(): void {
        const content = this.message.trim();
        if (!content || this.disabled) {
            return;
        }

        this.messageSent.emit(content);
    }
}
