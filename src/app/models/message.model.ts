export type MessageAuthor = 'user' | 'assistant';

export interface Message {
    id: string;
    content: string;
    author: MessageAuthor;
    createdAt: string;
}
