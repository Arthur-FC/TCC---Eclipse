import { Pipe, PipeTransform } from '@angular/core';

type ListType = 'ol' | 'ul';

@Pipe({
    name: 'markdown',
    standalone: false
})
export class MarkdownPipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        return renderMarkdown(value ?? '');
    }
}

export function renderMarkdown(markdown: string): string {
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    const blocks: string[] = [];
    let paragraph: string[] = [];
    let listType: ListType | null = null;
    let listItems: string[] = [];
    let codeLines: string[] = [];
    let codeLanguage = '';
    let insideCodeBlock = false;

    const flushParagraph = (): void => {
        if (paragraph.length === 0) {
            return;
        }

        blocks.push(`<p>${paragraph.map(renderInline).join(' ')}</p>`);
        paragraph = [];
    };

    const flushList = (): void => {
        if (!listType || listItems.length === 0) {
            return;
        }

        blocks.push(`<${listType}>${listItems.map(item => `<li>${item}</li>`).join('')}</${listType}>`);
        listType = null;
        listItems = [];
    };

    const flushCodeBlock = (): void => {
        const languageClass = codeLanguage ? ` class="language-${codeLanguage}"` : '';
        blocks.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        codeLanguage = '';
    };

    for (const line of lines) {
        const fence = line.match(/^\s*```([a-zA-Z0-9_-]*)\s*$/);

        if (insideCodeBlock) {
            if (fence) {
                flushCodeBlock();
                insideCodeBlock = false;
            } else {
                codeLines.push(line);
            }
            continue;
        }

        if (fence) {
            flushParagraph();
            flushList();
            codeLanguage = fence[1];
            insideCodeBlock = true;
            continue;
        }

        if (!line.trim()) {
            flushParagraph();
            flushList();
            continue;
        }

        const heading = line.match(/^\s*(#{1,4})\s+(.+)$/);
        if (heading) {
            flushParagraph();
            flushList();
            const level = heading[1].length;
            blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
            continue;
        }

        const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);
        const unorderedItem = line.match(/^\s*[-+*]\s+(.+)$/);
        const item = orderedItem ?? unorderedItem;

        if (item) {
            flushParagraph();
            const nextListType: ListType = orderedItem ? 'ol' : 'ul';
            if (listType && listType !== nextListType) {
                flushList();
            }
            listType = nextListType;
            listItems.push(renderInline(item[1]));
            continue;
        }

        flushList();

        const quote = line.match(/^\s*>\s?(.*)$/);
        if (quote) {
            flushParagraph();
            blocks.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
            continue;
        }

        paragraph.push(line.trim());
    }

    if (insideCodeBlock) {
        flushCodeBlock();
    } else {
        flushParagraph();
        flushList();
    }

    return blocks.join('');
}

function renderInline(value: string): string {
    const codeSpans: string[] = [];
    let rendered = escapeHtml(value);

    rendered = rendered.replace(/`([^`\n]+)`/g, (_match, code: string) => {
        const index = codeSpans.push(`<code>${code}</code>`) - 1;
        return `\u0000CODE${index}\u0000`;
    });

    rendered = rendered
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
        .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');

    return rendered.replace(/\u0000CODE(\d+)\u0000/g, (_match, index: string) => codeSpans[Number(index)]);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
