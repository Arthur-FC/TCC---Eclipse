export type MessageAuthor = 'user' | 'assistant';

export interface Message {
    id: number;
    content: string;
    author: MessageAuthor;
    createdAt: string;
}
