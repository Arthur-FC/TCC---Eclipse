import { Message } from './message.model';

export interface Chat {
    id: number;
    title: string;
    createdAt: string;
    messages: Message[];
}
