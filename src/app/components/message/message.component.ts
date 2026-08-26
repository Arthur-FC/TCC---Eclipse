import { Component, Input, OnDestroy } from '@angular/core';
import { Message } from '../../models/message.model';

@Component({
    selector: 'app-message',
    standalone: false,
    templateUrl: './message.component.html',
    styleUrls: ['./message.component.scss']
})
export class MessageComponent implements OnDestroy {
    @Input({ required: true }) message!: Message;

    copied = false;
    private copiedTimer?: ReturnType<typeof setTimeout>;

    async copyMessage(content: HTMLElement): Promise<void> {
        const text = content.innerText.trim() || this.message.content;

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                this.copyWithFallback(text);
            }

            this.showCopiedFeedback();
        } catch {
            if (this.copyWithFallback(text)) {
                this.showCopiedFeedback();
            }
        }
    }

    ngOnDestroy(): void {
        if (this.copiedTimer) {
            clearTimeout(this.copiedTimer);
        }
    }

    private copyWithFallback(text: string): boolean {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();

        const copied = document.execCommand('copy');
        textArea.remove();
        return copied;
    }

    private showCopiedFeedback(): void {
        this.copied = true;

        if (this.copiedTimer) {
            clearTimeout(this.copiedTimer);
        }

        this.copiedTimer = setTimeout(() => {
            this.copied = false;
        }, 1800);
    }
}
