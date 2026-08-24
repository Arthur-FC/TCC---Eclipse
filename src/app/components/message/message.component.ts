import { Component, Input } from '@angular/core';
import { Message } from '../../models/message.model';

@Component({
    selector: 'app-message',
    standalone: false,
    templateUrl: './message.component.html',
    styleUrls: ['./message.component.scss']
})
export class MessageComponent {
    @Input({ required: true }) message!: Message;
}
