import { Message } from './message.model';

export interface Chat {
    id: string;
    conversationId: string | null;
    title: string;
    createdAt: string;
    updatedAt: string;
    messages: Message[];
}
