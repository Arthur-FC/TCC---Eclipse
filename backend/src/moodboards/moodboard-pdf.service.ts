import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { BriefingEntity } from '../briefings/briefing.entity';
import { ProjectEntity } from '../projects/project.entity';
import { MoodboardEntity } from './moodboard.entity';

export interface PdfExport {
  buffer: Buffer;
  filename: string;
}

interface MoodboardPdfInput {
  project: ProjectEntity;
  moodboard: MoodboardEntity;
  briefing: BriefingEntity;
}

interface CardOptions {
  badge?: string;
  meta?: string;
  url?: string | null;
  accent?: string;
}

const COLORS = {
  ink: '#211B26',
  muted: '#756D79',
  border: '#E8DFEB',
  paper: '#FCFAFD',
  card: '#FFFFFF',
  purple: '#7950A1',
  magenta: '#D63882',
  rose: '#FFF0F5',
  lavender: '#F3ECF8',
  green: '#2F7D55',
};

@Injectable()
export class MoodboardPdfService {
  async generate(input: MoodboardPdfInput): Promise<PdfExport> {
    const chunks: Buffer[] = [];
    const document = new PDFDocument({
      autoFirstPage: false,
      bufferPages: true,
      compress: true,
      info: {
        Title: `${input.moodboard.data.title} - Moodboard Eclipse`,
        Author: 'Eclipse',
        Subject: `Moodboard e roadmap - versão ${input.moodboard.version}`,
        CreationDate: input.moodboard.createdAt,
      },
      margins: { top: 74, right: 48, bottom: 56, left: 48 },
      size: 'A4',
    });
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    const completed = new Promise<Buffer>((resolve, reject) => {
      document.once('end', () => resolve(Buffer.concat(chunks)));
      document.once('error', reject);
    });

    const writer = new PdfWriter(document);
    writer.addPage();
    this.cover(writer, input);
    this.briefing(writer, input.briefing);
    this.references(writer, input.moodboard);
    this.characteristics(writer, input.moodboard);
    this.roadmap(writer, input.moodboard);
    this.finish(writer, input.moodboard);

    document.end();
    return {
      buffer: await completed,
      filename: `eclipse-moodboard-v${input.moodboard.version}.pdf`,
    };
  }

  private cover(writer: PdfWriter, input: MoodboardPdfInput): void {
    const { document: doc } = writer;
    const x = writer.left;
    const width = writer.width;
    const heroY = writer.y;
    doc.font('Helvetica-Bold').fontSize(27);
    const titleHeight = doc.heightOfString(input.moodboard.data.title, { width: width - 48 });
    doc.font('Helvetica').fontSize(10);
    const directionHeight = doc.heightOfString(input.moodboard.data.creativeDirection, { width: width - 48, lineGap: 2 });
    const heroHeight = 24 + 15 + titleHeight + 18 + directionHeight + 24;
    doc.roundedRect(x, heroY, width, heroHeight, 16).fill(COLORS.ink);
    doc.fillColor('#F3B1D1').font('Helvetica-Bold').fontSize(9)
      .text('MOODBOARD E ROADMAP', x + 24, heroY + 24, { characterSpacing: 1.6 });
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(27)
      .text(input.moodboard.data.title, x + 24, heroY + 48, { width: width - 48 });
    doc.fillColor('#DED4E2').font('Helvetica').fontSize(10)
      .text(input.moodboard.data.creativeDirection, x + 24, heroY + 48 + titleHeight + 18, { width: width - 48, lineGap: 2 });
    writer.y += heroHeight + 20;

    writer.card('Projeto', input.project.title, {
      badge: `v${input.moodboard.version} - briefing v${input.moodboard.briefingVersion}`,
      meta: `${formatDate(input.moodboard.createdAt)} | ${input.moodboard.aiModel}`,
      accent: COLORS.magenta,
    });
    writer.note('Sugestão da IA', 'As direções criativas deste documento são orientações. Elas não representam medições ou audição do áudio.');
  }

  private briefing(writer: PdfWriter, briefing: BriefingEntity): void {
    writer.section('Briefing confirmado', 'Dados fornecidos e validados no projeto');
    const data = briefing.data;
    const scalarFields: Array<[string, string | null]> = [
      ['Objetivo', data.objective],
      ['Tema', data.theme],
      ['Narrativa', data.narrative],
      ['Andamento', data.tempo],
      ['Público-alvo', data.targetAudience],
      ['Observações adicionais', data.additionalNotes],
    ];
    for (const [label, value] of scalarFields) {
      if (value) writer.card(label, value, { badge: 'Briefing', accent: COLORS.green });
    }
    const listFields: Array<[string, string[]]> = [
      ['Emoções', data.emotions],
      ['Gêneros', data.genres],
      ['Clima', data.mood],
      ['Instrumentação desejada', data.instrumentation],
      ['Referências citadas no briefing', data.references],
      ['Restrições', data.constraints],
    ];
    for (const [label, values] of listFields) {
      values.forEach((value, index) => writer.card(
        values.length > 1 ? `${label} ${index + 1}` : label,
        value,
        { badge: 'Briefing', accent: COLORS.green },
      ));
    }
  }

  private references(writer: PdfWriter, moodboard: MoodboardEntity): void {
    writer.section('Referências selecionadas', 'Somente as entradas confirmadas nesta versão');
    const applications = new Map(moodboard.data.referenceApplications.map((item) => [item.referenceId, item.application]));
    for (const reference of moodboard.referenceInputs) {
      const source = sourceLabel(reference.source);
      const duration = reference.durationSeconds ? ` | ${formatDuration(reference.durationSeconds)}` : '';
      const provenance = dataStatusLabel(reference.dataStatus);
      const creator = reference.creator ? ` - ${reference.creator}` : '';
      const body = [
        reference.description || null,
        applications.get(reference.id) ? `Aplicação sugerida: ${applications.get(reference.id)}` : null,
      ].filter((value): value is string => !!value).join('\n\n') || 'Referência preservada na seleção confirmada.';
      writer.card(`${reference.title}${creator}`, body, {
        badge: provenance,
        meta: `${source}${duration}`,
        url: safePublicUrl(reference.url),
        accent: COLORS.purple,
      });
    }
  }

  private characteristics(writer: PdfWriter, moodboard: MoodboardEntity): void {
    const data = moodboard.data;
    writer.section('Direção criativa', 'Características propostas para a produção');
    for (const item of data.emotionalPalette) writer.card(`Paleta emocional - ${item.label}`, item.description, { badge: 'Sugestão da IA', accent: COLORS.magenta });
    for (const item of data.instrumentation) writer.card(`Instrumentação - ${item.instrument}`, item.role, { badge: 'Sugestão da IA', accent: COLORS.purple });
    for (const item of data.structure) writer.card(`Estrutura - ${item.section}`, item.goal, { badge: 'Sugestão da IA', meta: `Energia: ${item.energy}`, accent: COLORS.magenta });
    for (const item of data.production) writer.card(`Produção - ${item.area}`, item.suggestion, { badge: 'Sugestão da IA', accent: COLORS.purple });
    data.constraints.forEach((item, index) => writer.card(
      data.constraints.length > 1 ? `Restrição preservada ${index + 1}` : 'Restrição preservada',
      item,
      { badge: 'Briefing', accent: COLORS.green },
    ));
  }

  private roadmap(writer: PdfWriter, moodboard: MoodboardEntity): void {
    writer.section('Roadmap', 'Próximos passos sugeridos');
    for (const item of moodboard.data.roadmap) {
      writer.card(`${item.order}. ${item.title}`, item.action, {
        badge: 'Sugestão da IA',
        meta: `Entrega: ${item.deliverable}`,
        accent: COLORS.magenta,
      });
    }
  }

  private finish(writer: PdfWriter, moodboard: MoodboardEntity): void {
    writer.ensureSpace(70);
    const { document: doc } = writer;
    doc.moveTo(writer.left, writer.y + 8).lineTo(writer.left + writer.width, writer.y + 8).strokeColor(COLORS.border).stroke();
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5)
      .text(`Documento gerado a partir da versão imutável ${moodboard.version} do moodboard Eclipse.`, writer.left, writer.y + 22, { width: writer.width });
  }
}

class PdfWriter {
  readonly left = 48;
  readonly width = 499.28;
  readonly bottom = 786;
  y = 74;
  private pageNumber = 0;

  constructor(readonly document: PDFKit.PDFDocument) {}

  addPage(): void {
    this.document.addPage();
    this.pageNumber += 1;
    this.y = 74;
    const doc = this.document;
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.paper);
    doc.fillColor(COLORS.magenta).font('Helvetica-Bold').fontSize(12).text('ECLIPSE', this.left, 31, { characterSpacing: 1.4 });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('MOODBOARD MUSICAL', this.left + 73, 34);
    doc.moveTo(this.left, 54).lineTo(this.left + this.width, 54).strokeColor(COLORS.border).stroke();
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 20;
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      .text(`ECLIPSE  |  ${this.pageNumber}`, this.left, 808, { width: this.width, align: 'right', lineBreak: false });
    doc.page.margins.bottom = bottomMargin;
    doc.x = this.left;
    doc.y = this.y;
  }

  ensureSpace(height: number): void {
    if (this.y + height > this.bottom) this.addPage();
  }

  section(title: string, subtitle: string): void {
    this.ensureSpace(150);
    this.y += 12;
    this.document.fillColor(COLORS.magenta).font('Helvetica-Bold').fontSize(8)
      .text('ECLIPSE', this.left, this.y, { characterSpacing: 1.1 });
    this.y += 15;
    this.document.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(19).text(title, this.left, this.y, { width: this.width });
    this.y += 24;
    this.document.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(subtitle, this.left, this.y, { width: this.width });
    this.y += 22;
  }

  note(title: string, body: string): void {
    this.card(title, body, { accent: COLORS.magenta });
  }

  card(title: string, body: string, options: CardOptions = {}): void {
    const contentWidth = this.width - 34;
    const badgeHeight = options.badge ? 17 : 0;
    const titleHeight = this.measure(title, 'Helvetica-Bold', 11, contentWidth);
    const metaHeight = options.meta ? this.measure(options.meta, 'Helvetica', 8.5, contentWidth) + 5 : 0;
    const bodyHeight = this.measure(body, 'Helvetica', 9.5, contentWidth) + 7;
    const url = safePublicUrl(options.url);
    const urlHeight = url ? this.measure(url, 'Helvetica', 8.5, contentWidth) + 7 : 0;
    const height = 28 + badgeHeight + titleHeight + metaHeight + bodyHeight + urlHeight;
    this.ensureSpace(height + 10);

    const doc = this.document;
    const x = this.left;
    const y = this.y;
    doc.roundedRect(x, y, this.width, height, 10).fillAndStroke(COLORS.card, COLORS.border);
    doc.roundedRect(x, y, 4, height, 2).fill(options.accent || COLORS.purple);
    let cursor = y + 14;
    if (options.badge) {
      const badgeText = options.badge.toUpperCase();
      const badgeWidth = Math.min(190, doc.font('Helvetica-Bold').fontSize(7).widthOfString(badgeText) + (badgeText.length * .4) + 28);
      doc.roundedRect(x + 16, cursor, badgeWidth, 14, 7).fill(COLORS.lavender);
      doc.fillColor(COLORS.purple).font('Helvetica-Bold').fontSize(7)
        .text(badgeText, x + 25, cursor + 4, { width: badgeWidth - 18, lineBreak: false, characterSpacing: .4 });
      cursor += 21;
    }
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(11).text(title, x + 17, cursor, { width: contentWidth });
    cursor += titleHeight + 5;
    if (options.meta) {
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5).text(options.meta, x + 17, cursor, { width: contentWidth });
      cursor += metaHeight;
    }
    doc.fillColor(COLORS.ink).font('Helvetica').fontSize(9.5).text(body, x + 17, cursor, { width: contentWidth, lineGap: 2 });
    cursor += bodyHeight;
    if (url) {
      doc.fillColor(COLORS.purple).font('Helvetica').fontSize(8.5)
        .text(url, x + 17, cursor, { width: contentWidth, link: url, underline: true });
    }
    this.y += height + 10;
  }

  private measure(value: string, font: string, size: number, width: number): number {
    this.document.font(font).fontSize(size);
    return this.document.heightOfString(value, { width, lineGap: size === 9.5 ? 2 : 0 });
  }
}

function safePublicUrl(value: string | null | undefined): string | null {
  if (!value || value.length > 1_000) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function sourceLabel(source: string): string {
  return ({ youtube: 'YouTube', spotify: 'Spotify', library: 'Acervo próprio', manual: 'Link manual' } as Record<string, string>)[source] || 'Referência';
}

function dataStatusLabel(status: string): string {
  return ({
    'source-metadata': 'Metadados da fonte',
    'user-provided': 'Informado pelo usuário',
    'mixed-estimates': 'Metadados e estimativas locais',
  } as Record<string, string>)[status] || 'Origem registrada';
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
