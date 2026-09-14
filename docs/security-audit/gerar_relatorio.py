from __future__ import annotations

import re
from collections import Counter
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Circle, Drawing, Rect, String, Wedge, Line


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(__file__).resolve().parent / "relatorio-auditoria-seguranca.pdf"
TMP = ROOT / "tmp" / "pdfs" / "security-audit"
TMP.mkdir(parents=True, exist_ok=True)

PROJECT = "Eclipse"
REPORT_TITLE = "Relatório de Auditoria de Segurança"
AUDIT_DATE = date(2026, 9, 14)

PALETTE = {
    "crítica": "#B91C1C",
    "alta": "#EA580C",
    "média": "#D97706",
    "baixa": "#2563EB",
    "ponto forte": "#059669",
    "ink": "#172033",
    "muted": "#5D6678",
    "paper": "#F7F8FC",
    "line": "#DDE2EA",
    "purple": "#5B4B9A",
}


def register_fonts() -> tuple[str, str, str]:
    candidates = [
        (
            Path("C:/Windows/Fonts/arial.ttf"),
            Path("C:/Windows/Fonts/arialbd.ttf"),
            Path("C:/Windows/Fonts/consola.ttf"),
        ),
        (
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
        ),
    ]
    for regular, bold, mono in candidates:
        if regular.exists() and bold.exists() and mono.exists():
            pdfmetrics.registerFont(TTFont("AuditSans", str(regular)))
            pdfmetrics.registerFont(TTFont("AuditSans-Bold", str(bold)))
            pdfmetrics.registerFont(TTFont("AuditMono", str(mono)))
            return "AuditSans", "AuditSans-Bold", "AuditMono"
    return "Helvetica", "Helvetica-Bold", "Courier"


FONT, FONT_BOLD, FONT_MONO = register_fonts()


FINDINGS = [
    {
        "id": "F-01",
        "category": "Banco sem tranca",
        "severity": "baixa",
        "title": "Endpoint de privacidade expõe métricas globais de outros usuários",
        "locations": [
            "backend/src/privacy/privacy.controller.ts:17-19",
            "backend/src/privacy/privacy.service.ts:32-61",
        ],
        "evidence": (
            "async usage(ownerId: string) {\n"
            "  ... WHERE p.owner_id = $1 ...\n"
            "  SELECT ... FROM youtube_quota_usage WHERE usage_date = CURRENT_DATE\n"
            "  SELECT ... FROM embedding_usage_daily WHERE usage_date = CURRENT_DATE\n"
            "  SELECT ... FROM groq_usage_daily WHERE usage_date = CURRENT_DATE\n"
            "}"
        ),
        "why": (
            "O controller aceita qualquer sessão válida e passa ownerId, mas apenas a soma de tokens por mensagem usa esse parâmetro. "
            "Os contadores de YouTube, Cloudflare e Groq são lidos de tabelas diárias globais, sem owner_id. Assim, um usuário comum consegue "
            "consultar a atividade agregada de toda a instalação e inferir uso de outros usuários. Não há exposição de conteúdo ou identidade."
        ),
        "condition": "Explorável por qualquer conta autenticada quando a instalação possui mais de um usuário.",
        "fix": (
            "Separar explicitamente métricas pessoais e operacionais. Para a resposta ao usuário, persistir/consultar contadores por owner_id; "
            "ou remover os totais globais. Se os totais globais forem necessários, movê-los para uma rota administrativa com autorização no backend."
        ),
    },
    {
        "id": "F-02",
        "category": "Chaves expostas",
        "severity": "alta",
        "title": "PostgreSQL é publicado com credencial previsível",
        "locations": [
            "backend/compose.yaml:6-11",
            "backend/.env.example:4-8",
            "backend/src/config/environment.config.ts:35-43",
            "backend/evaluation/generate-report.mjs:7-13",
        ],
        "evidence": (
            "POSTGRES_USER: eclipse\n"
            "POSTGRES_PASSWORD: eclipse_dev\n"
            "ports:\n"
            "  - \"5432:5432\"\n"
            "DATABASE_PASSWORD ... default('eclipse_dev')"
        ),
        "why": (
            "O Compose publica a porta 5432 em todas as interfaces do host e inicializa o banco com usuário e senha conhecidos do repositório. "
            "A validação aceita o mesmo default fora de produção e o script de avaliação repete o fallback. Um atacante com alcance de rede pode "
            "autenticar diretamente no PostgreSQL e ler ou alterar todos os dados, contornando SessionAuthGuard e filtros de ownerId."
        ),
        "condition": "Exige o Compose em execução e porta 5432 alcançável pela rede/firewall; o risco não depende da API estar exposta.",
        "fix": (
            "Gerar senha local aleatória fora do repositório, exigir DATABASE_PASSWORD sem fallback e publicar a porta apenas em 127.0.0.1 quando "
            "o acesso externo não for necessário. Rejeitar credenciais conhecidas no startup, independentemente de NODE_ENV."
        ),
    },
    {
        "id": "F-03",
        "category": "Chaves expostas",
        "severity": "alta",
        "title": "MinIO publica API e console com credencial root previsível",
        "locations": [
            "backend/compose.yaml:21-32",
            "backend/.env.example:40-44",
            "backend/src/config/environment.config.ts:91-103",
        ],
        "evidence": (
            "MINIO_ROOT_USER: eclipse_minio\n"
            "MINIO_ROOT_PASSWORD: eclipse_minio_dev\n"
            "ports:\n"
            "  - \"9000:9000\"\n"
            "  - \"9001:9001\""
        ),
        "why": (
            "A API e o console administrativo do MinIO são publicados em todas as interfaces com credenciais root conhecidas. Um atacante com alcance "
            "de rede pode listar, baixar, substituir ou excluir os áudios privados, sem passar pela emissão de URLs assinadas e sem checagem de posse."
        ),
        "condition": "Exige o Compose em execução e portas 9000/9001 alcançáveis pela rede/firewall.",
        "fix": (
            "Usar credenciais aleatórias em arquivo local ignorado ou secret store, recusar os valores de exemplo no startup e vincular 9000/9001 a "
            "127.0.0.1. Em cenários compartilhados, usar usuário de serviço sem privilégios root e políticas restritas ao bucket."
        ),
    },
]


ROUTE_GROUPS = [
    ("auth", 5, "register/login/logout públicos por desenho; me e disable protegidos pelo SessionAuthGuard"),
    ("health", 1, "health público; somente status, serviço, timestamp e uptime"),
    ("projects + conversations + messages", 9, "sessão e posse por ownerId; conversationId também vinculado ao projectId"),
    ("AI streaming", 1, "sessão; criação/contexto passam por getActiveConversation(ownerId, projectId, conversationId)"),
    ("briefings", 5, "sessão; projeto ativo/possuído validado antes de leitura, versão, escrita e confirmação"),
    ("references", 4, "sessão; projeto validado e referenceId consultado junto com projectId"),
    ("reference curation", 6, "sessão; projeto ativo, faixa por ownerId e IDs de referências vinculados ao projeto"),
    ("library", 7, "sessão; listagem/busca por ownerId e operações por trackId + ownerId"),
    ("moodboards", 5, "sessão; projeto possuído antes de versão, listagem, geração e PDF"),
    ("final works", 3, "sessão; projectId + ownerId e trackId + ownerId + sourceProjectId"),
    ("privacy", 5, "sessão; export/profile/consent/account isolados; usage tem F-01"),
    ("evaluation", 2, "sessão; requireProject verifica projectId + ownerId"),
    ("stem separation", 3, "sessão; projeto, referência e stem encadeados ao projeto do dono"),
]


ISSUES = [
    {
        "title": "[Segurança] Isolar métricas de uso por usuário no endpoint de privacidade",
        "labels": "security, severity:low",
        "body": """## Descrição do problema
O endpoint autenticado `GET /api/privacy/usage` recebe o usuário atual, porém retorna contadores globais de YouTube, Cloudflare e Groq. Apenas os tokens derivados de mensagens/briefings/moodboards são filtrados por `owner_id`.

Qualquer conta autenticada pode repetir a consulta e observar a atividade agregada da instalação, inferindo uso de outros usuários. O achado não expõe conteúdo ou identidades, mas rompe o limite de isolamento esperado para uma área chamada Privacidade.

## Evidência
`backend/src/privacy/privacy.controller.ts:17-19`
```ts
@Get('usage')
usage(@CurrentUser() user: AuthenticatedUser) {
  return this.privacy.usage(user.id);
}
```

`backend/src/privacy/privacy.service.ts:32-61`
```ts
async usage(ownerId: string) {
  // Esta consulta filtra por p.owner_id = $1.
  // As três consultas abaixo não usam ownerId:
  SELECT ... FROM youtube_quota_usage WHERE usage_date = CURRENT_DATE;
  SELECT ... FROM embedding_usage_daily WHERE usage_date = CURRENT_DATE;
  SELECT ... FROM groq_usage_daily WHERE usage_date = CURRENT_DATE;
}
```

## Impacto
Vazamento de telemetria agregada entre usuários e possibilidade de inferir horários/volume de atividade. Também há risco de a interface apresentar consumo global como se fosse pessoal.

## Sugestão de correção
- Definir se cada métrica é pessoal ou operacional.
- Persistir `owner_id` nas métricas pessoais e filtrar todas as consultas por esse campo.
- Remover métricas globais da resposta comum ou movê-las para rota administrativa.
- Se houver rota administrativa, validar o privilégio no backend.

## Critérios de aceite
- [ ] Uma conta A não observa alteração em sua resposta quando somente a conta B usa YouTube, Cloudflare ou Groq.
- [ ] Todas as métricas exibidas como pessoais são filtradas por `owner_id`.
- [ ] Métricas globais, se mantidas, exigem autorização administrativa no servidor.
- [ ] Existe teste E2E com duas contas comprovando o isolamento.
""",
    },
    {
        "title": "[Segurança] Remover credenciais padrão e restringir portas de PostgreSQL e MinIO",
        "labels": "security, severity:high",
        "body": """## Descrição do problema
O ambiente Docker publica PostgreSQL, API MinIO e console MinIO em todas as interfaces do host usando credenciais previsíveis versionadas. Os mesmos valores aparecem como defaults aceitos pela configuração de desenvolvimento.

Com o Compose em execução e as portas alcançáveis, um atacante não precisa passar pela API: pode acessar diretamente o banco ou o armazenamento com privilégios amplos.

## Evidência
`backend/compose.yaml:6-11`
```yaml
POSTGRES_USER: eclipse
POSTGRES_PASSWORD: eclipse_dev
ports:
  - "5432:5432"
```

`backend/compose.yaml:25-32`
```yaml
MINIO_ROOT_USER: eclipse_minio
MINIO_ROOT_PASSWORD: eclipse_minio_dev
ports:
  - "9000:9000"
  - "9001:9001"
```

`backend/src/config/environment.config.ts:39-43,94-103` aceita os mesmos defaults fora de produção; `backend/evaluation/generate-report.mjs:7-13` repete o fallback do banco.

## Impacto
Comprometimento completo dos dados persistidos: leitura, alteração ou exclusão de contas, projetos, conversas, tokens de uso e arquivos de áudio. O acesso direto contorna autenticação, autorização e URLs assinadas.

## Sugestão de correção
- Remover senhas do Compose e exigir variáveis em arquivo local ignorado ou secret store.
- Gerar credenciais aleatórias no setup e recusar valores conhecidos no startup.
- Vincular portas a `127.0.0.1` por padrão (`127.0.0.1:5432:5432`, etc.).
- Usar usuário MinIO de serviço com política mínima; não usar root na aplicação.
- Remover o fallback `eclipse_dev` do script de avaliação.

## Critérios de aceite
- [ ] `docker compose config` não contém credenciais fixas provenientes do repositório.
- [ ] O startup falha para `eclipse_dev` e `eclipse_minio_dev` em qualquer ambiente compartilhado.
- [ ] PostgreSQL e MinIO escutam apenas em loopback por padrão.
- [ ] A aplicação usa credencial MinIO sem privilégios administrativos.
- [ ] Um teste/documentação de setup demonstra geração e rotação de segredos.
""",
    },
]


def draw_header_footer(pdf_canvas: canvas.Canvas, _doc):
    width, height = A4
    pdf_canvas.saveState()
    pdf_canvas.setStrokeColor(colors.HexColor(PALETTE["line"]))
    pdf_canvas.setLineWidth(0.5)
    pdf_canvas.line(2 * cm, height - 1.35 * cm, width - 2 * cm, height - 1.35 * cm)
    pdf_canvas.setFillColor(colors.HexColor(PALETTE["muted"]))
    pdf_canvas.setFont(FONT, 7.5)
    pdf_canvas.drawString(2 * cm, height - 1.05 * cm, f"{REPORT_TITLE} - {PROJECT}")
    pdf_canvas.line(2 * cm, 1.25 * cm, width - 2 * cm, 1.25 * cm)
    pdf_canvas.drawString(2 * cm, 0.88 * cm, "Uso interno - revisão estática e testes automatizados")
    pdf_canvas.drawRightString(width - 2 * cm, 0.88 * cm, f"Página {pdf_canvas.getPageNumber()}")
    pdf_canvas.restoreState()


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle("cover_kicker", fontName=FONT_BOLD, fontSize=10, textColor=colors.HexColor(PALETTE["purple"]), leading=14, spaceAfter=10),
        "cover_title": ParagraphStyle("cover_title", fontName=FONT_BOLD, fontSize=27, leading=32, textColor=colors.HexColor(PALETTE["ink"]), spaceAfter=16),
        "cover_sub": ParagraphStyle("cover_sub", fontName=FONT, fontSize=11, leading=17, textColor=colors.HexColor(PALETTE["muted"]), spaceAfter=8),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName=FONT_BOLD, fontSize=19, leading=23, textColor=colors.HexColor(PALETTE["ink"]), spaceBefore=8, spaceAfter=12),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=FONT_BOLD, fontSize=13, leading=17, textColor=colors.HexColor(PALETTE["purple"]), spaceBefore=12, spaceAfter=7),
        "h3": ParagraphStyle("h3", parent=base["Heading3"], fontName=FONT_BOLD, fontSize=10.5, leading=14, textColor=colors.HexColor(PALETTE["ink"]), spaceBefore=8, spaceAfter=5),
        "body": ParagraphStyle("body", fontName=FONT, fontSize=9, leading=13.2, textColor=colors.HexColor(PALETTE["ink"]), spaceAfter=7),
        "small": ParagraphStyle("small", fontName=FONT, fontSize=7.7, leading=10.5, textColor=colors.HexColor(PALETTE["muted"])),
        "table": ParagraphStyle("table", fontName=FONT, fontSize=7.4, leading=9.6, textColor=colors.HexColor(PALETTE["ink"])),
        "table_bold": ParagraphStyle("table_bold", fontName=FONT_BOLD, fontSize=7.4, leading=9.6, textColor=colors.HexColor(PALETTE["ink"])),
        "code": ParagraphStyle("code", fontName=FONT_MONO, fontSize=6.8, leading=9.2, textColor=colors.HexColor("#22304A"), backColor=colors.HexColor("#EFF2F7"), borderPadding=7, borderColor=colors.HexColor(PALETTE["line"]), borderWidth=0.5, borderRadius=3, spaceBefore=4, spaceAfter=8),
        "issue_line": ParagraphStyle("issue_line", fontName=FONT_MONO, fontSize=6.9, leading=9.4, textColor=colors.HexColor(PALETTE["ink"]), spaceAfter=0),
        "chip": ParagraphStyle("chip", fontName=FONT_BOLD, fontSize=7, leading=9, alignment=TA_CENTER, textColor=colors.white),
    }


S = styles()


def p(text: str, style: str = "body") -> Paragraph:
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    safe = safe.replace("\n", "<br/>")
    return Paragraph(safe, S[style])


def rich(text: str, style: str = "body") -> Paragraph:
    return Paragraph(text, S[style])


def chip(label: str) -> Table:
    color = colors.HexColor(PALETTE[label])
    table = Table([[Paragraph(label.upper(), S["chip"])]], colWidths=[1.75 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("BOX", (0, 0), (-1, -1), 0, color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


def metric_card(value: str, label: str, color: str) -> Table:
    data = [[Paragraph(value, ParagraphStyle("metric", fontName=FONT_BOLD, fontSize=22, leading=24, textColor=colors.HexColor(color), alignment=TA_CENTER))],
            [Paragraph(label, ParagraphStyle("metric_label", fontName=FONT, fontSize=7.5, leading=9, textColor=colors.HexColor(PALETTE["muted"]), alignment=TA_CENTER))]]
    t = Table(data, colWidths=[4.0 * cm], rowHeights=[0.85 * cm, 0.55 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor(PALETTE["line"])),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def make_charts() -> tuple[Drawing, Drawing]:
    severity = Counter(item["severity"] for item in FINDINGS)
    labels = [name for name in ["crítica", "alta", "média", "baixa"] if severity[name]]
    values = [severity[name] for name in labels]
    donut = Drawing(260, 150)
    cx, cy, radius = 75, 78, 53
    start = 90.0
    total = sum(values)
    for label, value in zip(labels, values):
        sweep = 360.0 * value / total
        donut.add(Wedge(cx, cy, radius, start - sweep, start, fillColor=colors.HexColor(PALETTE[label]), strokeColor=colors.white, strokeWidth=1.5))
        start -= sweep
    donut.add(Circle(cx, cy, 31, fillColor=colors.white, strokeColor=colors.white))
    donut.add(String(cx, cy + 3, str(total), fontName=FONT_BOLD, fontSize=20, textAnchor="middle", fillColor=colors.HexColor(PALETTE["ink"])))
    donut.add(String(cx, cy - 13, "achados", fontName=FONT, fontSize=7.5, textAnchor="middle", fillColor=colors.HexColor(PALETTE["muted"])))
    for index, label in enumerate(labels):
        y = 94 - index * 23
        donut.add(Rect(150, y, 10, 10, rx=2, ry=2, fillColor=colors.HexColor(PALETTE[label]), strokeColor=None))
        donut.add(String(167, y + 1, f"{label.title()}: {severity[label]}", fontName=FONT, fontSize=8, fillColor=colors.HexColor(PALETTE["ink"])))

    cats = ["Banco sem tranca", "Permissão no navegador", "IDOR", "Chaves expostas", "Inputs/XSS"]
    cat_counts = Counter(item["category"] for item in FINDINGS)
    vals = [cat_counts[x] for x in cats]
    bars = Drawing(330, 150)
    origin_x, max_width = 145, 145
    max_value = max(vals) or 1
    for grid_value in range(max_value + 1):
        x = origin_x + max_width * grid_value / max_value
        bars.add(Line(x, 19, x, 140, strokeColor=colors.HexColor("#E6E9EF"), strokeWidth=.5))
        bars.add(String(x, 7, str(grid_value), fontName=FONT, fontSize=6.5, textAnchor="middle", fillColor=colors.HexColor(PALETTE["muted"])))
    bar_colors = [PALETTE["baixa"], PALETTE["purple"], PALETTE["purple"], PALETTE["alta"], PALETTE["purple"]]
    for index, (label, value, color) in enumerate(zip(cats, vals, bar_colors)):
        y = 121 - index * 24
        bars.add(String(138, y + 2, label, fontName=FONT, fontSize=7.1, textAnchor="end", fillColor=colors.HexColor(PALETTE["ink"])))
        width = max_width * value / max_value
        if value:
            bars.add(Rect(origin_x, y - 2, width, 12, rx=3, ry=3, fillColor=colors.HexColor(color), strokeColor=None))
        bars.add(String(origin_x + width + 6, y + 1, str(value), fontName=FONT_BOLD, fontSize=7.3, fillColor=colors.HexColor(PALETTE["ink"])))
    return donut, bars


def cover(story):
    story += [Spacer(1, 2.0 * cm)]
    story.append(Paragraph("ECLIPSE · SEGURANÇA", S["cover_kicker"]))
    story.append(Paragraph(f"{REPORT_TITLE}<br/><font color='{PALETTE['purple']}'>— {PROJECT}</font>", S["cover_title"]))
    story.append(Spacer(1, .4 * cm))
    summary = Table([
        [p("DATA DA REVISÃO", "small"), p("14 de setembro de 2026", "body")],
        [p("ESCOPO", "small"), p("Frontend Angular, API NestJS, TypeORM/PostgreSQL, autenticação por sessão, armazenamento MinIO/S3, Docker Compose, scripts, documentação, histórico Git e bundle de produção.", "body")],
        [p("BASE", "small"), p("Estado do workspace auditado, incluindo alterações locais não commitadas presentes no momento da revisão.", "body")],
    ], colWidths=[3.2 * cm, 12.2 * cm])
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("GRID", (0, 0), (-1, -1), .5, colors.HexColor(PALETTE["line"])),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story += [summary, Spacer(1, .7 * cm)]
    story.append(rich("<b>Nota metodológica.</b> As cinco categorias foram adaptadas à stack detectada: isolamento manual por <font name='AuditMono'>ownerId/projectId</font>; autorização de papéis cruzada entre Angular e NestJS; IDOR revisado em todos os handlers; segredos revisados em código, Compose, configs, scripts, documentação, histórico Git e bundle; XSS revisado em templates Angular, Markdown, URLs e saídas PDF.", "body"))
    story.append(Spacer(1, 2.4 * cm))
    story.append(rich(f"<font color='{PALETTE['alta']}'><b>3 achados verificados</b></font> · 2 altos · 1 baixo · 0 críticos", "cover_sub"))
    story.append(p("Este relatório evita hipóteses: condições necessárias à exploração são registradas junto de cada achado.", "small"))
    story.append(PageBreak())


def executive(story, donut: Drawing, bars: Drawing):
    story.append(Paragraph("Resumo executivo", S["h1"]))
    cards = Table([[metric_card("0", "Críticos", PALETTE["crítica"]), metric_card("2", "Altos", PALETTE["alta"]), metric_card("0", "Médios", PALETTE["média"]), metric_card("1", "Baixos", PALETTE["baixa"]) ]], colWidths=[4.0 * cm] * 4, hAlign="LEFT")
    cards.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 5)]))
    story += [cards, Spacer(1, .45 * cm)]
    story.append(p("A aplicação apresenta boa cobertura de autenticação e posse nos recursos. O risco central está fora da API: o Compose publica PostgreSQL e MinIO com credenciais previsíveis, de modo que a exposição de rede contorna todos os controles de aplicação. O segundo risco é um vazamento limitado de telemetria agregada no endpoint de privacidade."))
    charts = Table([[donut, bars]], colWidths=[7.3 * cm, 9.1 * cm])
    charts.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story += [charts, Spacer(1, .2 * cm)]
    story.append(p("Severidade considera impacto e pré-condições. F-02 e F-03 são altos porque permitem comprometimento integral quando as portas do host estão acessíveis; a condição de rede impede classificá-los como críticos no estado revisado.", "small"))
    story.append(Paragraph("Stack e mapeamento", S["h2"]))
    rows = [
        ["Camada", "Detectado", "Mapeamento de segurança"],
        ["Frontend", "Angular 19 + Ionic 8, TypeScript", "Gates de UI, [innerHTML], URLs, DOM e bundle"],
        ["Backend", "NestJS 11 / Express", "Todos os decorators de rota, guards e serviços chamados"],
        ["Persistência", "TypeORM 1.1 + PostgreSQL 17/pgvector", "Filtros ownerId/projectId, joins, agregações e SQL bruto"],
        ["Autenticação", "Sessão opaca em cookie HttpOnly; hash SHA-256 no banco", "SessionAuthGuard e CurrentUser; não há papéis/admin"],
        ["Armazenamento", "S3 compatível / MinIO", "Posse antes de URLs assinadas e exposição do serviço"],
        ["Deploy", "Docker Compose; sem CI/Helm/Terraform no repositório", "Portas, imagens, defaults e credenciais"],
    ]
    table = Table([[p(c, "table_bold") for c in rows[0]]] + [[p(c, "table") for c in row] for row in rows[1:]], colWidths=[2.6 * cm, 5.1 * cm, 8.1 * cm], repeatRows=1)
    table.setStyle(audit_table_style())
    story.append(table)
    story.append(PageBreak())


def audit_table_style():
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAE7F7")),
        ("GRID", (0, 0), (-1, -1), .45, colors.HexColor(PALETTE["line"])),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(PALETTE["paper"])]),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])


def strengths_and_coverage(story):
    story.append(Paragraph("Pontos fortes e cobertura", S["h1"]))
    strengths = [
        ("Sessões protegidas", "backend/src/auth/session-cookie.ts:5-11 e auth.service.ts:102-116", "Cookie HttpOnly, SameSite=Lax e Secure em produção; token opaco de 256 bits e somente hash persistido."),
        ("Autenticação das rotas", "backend/src/auth/session-auth.guard.ts:15-26", "52 de 56 rotas exigem sessão. As quatro públicas são cadastro, login, logout idempotente e health."),
        ("Projetos e conversas", "backend/src/projects/projects.service.ts:57-77,267-307", "Listagens filtram ownerId; IDs de conversa são validados junto do projectId possuído."),
        ("Biblioteca privada", "backend/src/library/library.service.ts:261-317,475-481", "Listagem e busca filtram ownerId; playback, reprocessamento e remoção resolvem trackId + ownerId."),
        ("Referências e moodboards", "backend/src/references/references.service.ts:89-141; moodboards.service.ts:139-206", "Projeto é validado antes de ler/escrever; IDs filhos permanecem vinculados ao projectId."),
        ("Exportação LGPD", "backend/src/privacy/privacy.service.ts:94-118", "Todas as coleções exportadas aplicam owner_id direta ou indiretamente."),
        ("XSS/Markdown", "src/app/pipes/markdown.pipe.ts:124-149; message.component.html:14", "O renderer escapa &, <, >, aspas e apóstrofos antes de criar tags permitidas; Angular ainda sanitiza [innerHTML]."),
        ("Validação global", "backend/src/bootstrap.ts:25-34", "ValidationPipe usa whitelist, rejeita campos extras e transforma DTOs; Helmet está ativo."),
        ("Segredos reais", "histórico Git e dist/eclipse/browser", "Nenhuma chave real foi encontrada no histórico; o bundle de produção não contém os padrões de segredo verificados."),
    ]
    rows = [[p("Controle", "table_bold"), p("Evidência", "table_bold"), p("Resultado", "table_bold")]]
    rows += [[p(a, "table_bold"), p(b, "table"), p(c, "table")] for a, b, c in strengths]
    table = Table(rows, colWidths=[3.0 * cm, 5.2 * cm, 7.6 * cm], repeatRows=1)
    table.setStyle(audit_table_style())
    story.append(table)
    story.append(PageBreak())
    story.append(Paragraph("Cobertura rota a rota", S["h1"]))
    story.append(p("Foram enumerados os 56 handlers NestJS presentes em 13 controllers. A tabela resume todos os grupos; cada grupo corresponde à totalidade dos decorators @Get/@Post/@Put/@Patch/@Delete encontrados no arquivo, não a uma amostra."))
    rows = [[p("Grupo", "table_bold"), p("Rotas", "table_bold"), p("Resultado", "table_bold")]]
    rows += [[p(name, "table_bold"), p(str(count), "table"), p(result, "table")] for name, count, result in ROUTE_GROUPS]
    route_table = Table(rows, colWidths=[4.5 * cm, 1.4 * cm, 9.9 * cm], repeatRows=1)
    route_table.setStyle(audit_table_style())
    story.append(route_table)
    story.append(p("Total: 56 rotas. Achado de cobertura: F-01 em privacy/usage. Nenhum IDOR foi confirmado nos demais handlers.", "small"))
    story.append(PageBreak())


def findings_section(story):
    story.append(Paragraph("Achados detalhados", S["h1"]))
    rows = [[p("Severidade", "table_bold"), p("Arquivo:linha", "table_bold"), p("Descrição", "table_bold")]]
    for finding in FINDINGS:
        rows.append([
            chip(finding["severity"]),
            p("\n".join(finding["locations"]), "table"),
            rich(f"<b>{finding['id']} — {finding['title']}</b><br/>{finding['why']}", "table"),
        ])
    table = Table(rows, colWidths=[2.1 * cm, 5.5 * cm, 8.2 * cm], repeatRows=1)
    table.setStyle(audit_table_style())
    story.append(table)
    story.append(Spacer(1, .25 * cm))
    for idx, finding in enumerate(FINDINGS):
        story.append(Paragraph(f"{finding['id']} · {finding['title']}", S["h2"]))
        story.append(Table([[chip(finding["severity"]), p(finding["category"], "small")]], colWidths=[2.0 * cm, 13.8 * cm], style=TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0)])))
        story.append(Spacer(1, .15 * cm))
        story.append(rich(f"<b>Arquivo(s):</b> {'; '.join(finding['locations'])}"))
        story.append(Paragraph(finding["evidence"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>"), S["code"]))
        story.append(rich(f"<b>Por que é explorável.</b> {finding['why']}"))
        story.append(rich(f"<b>Condição.</b> {finding['condition']}"))
        story.append(rich(f"<b>Correção indicada.</b> {finding['fix']}"))
        if idx == 0:
            story.append(Spacer(1, .15 * cm))
    story.append(PageBreak())


def category_results(story):
    story.append(Paragraph("Resultado por categoria", S["h1"]))
    categories = [
        ("1. Banco sem tranca", "1 achado baixo", "O mecanismo é filtro manual por ownerId/projectId, não RLS. Listagens, buscas, exportações e agregações foram revisadas. F-01 é o único desvio: três contadores globais em /privacy/usage. Exportação de dados e recursos de projeto estão corretamente isolados."),
        ("2. Permissão definida no navegador", "Não se aplica", "Não há role, isAdmin, canEdit, painel administrativo ou autorização por papel no frontend/backend. As ações de escrita disponíveis pertencem ao próprio usuário e são verificadas por sessão e posse no servidor; portanto não existe gate de papel de UI a cruzar."),
        ("3. IDOR", "Nenhum achado", "Todos os 56 handlers foram percorridos. Das 52 rotas autenticadas, as que recebem projectId, conversationId, referenceId, trackId ou stemId validam o recurso pai e/ou incluem ownerId/projectId no lookup. Rotas públicas não recebem IDs de objetos privados."),
        ("4. Chaves expostas", "2 achados altos", "Não foram encontradas chaves reais no código, histórico Git ou bundle Angular. Foram confirmadas credenciais padrão operacionais no Compose para PostgreSQL e MinIO, combinadas com portas publicadas em todas as interfaces (F-02 e F-03)."),
        ("5. Inputs sem tratamento (XSS)", "Nenhum achado", "O único [innerHTML] usa o pipe Markdown próprio. O pipe escapa HTML antes de aplicar formatação e Angular sanitiza o valor; blocos de código também são escapados. URLs de templates passam pelo sanitizer do Angular, usam protocolos http/https validados e links externos possuem rel=noopener noreferrer. new Function existe apenas para importar módulos ESM por string constante, sem entrada do usuário."),
    ]
    for title, status, body in categories:
        box = Table([[rich(f"<b>{title}</b><br/><font color='{PALETTE['purple']}'>{status}</font><br/>{body}", "body")]], colWidths=[15.8 * cm])
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("BOX", (0, 0), (-1, -1), .6, colors.HexColor(PALETTE["line"])),
            ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]))
        story += [box, Spacer(1, .22 * cm)]
    story.append(Paragraph("Pontos fracos centrais", S["h2"]))
    story.append(p("A fronteira de confiança mais frágil é o deploy local: banco e storage podem ficar acessíveis pela rede com credenciais públicas. Dentro da API, o único desvio confirmado é a ausência de separação entre métricas pessoais e globais no endpoint de privacidade."))
    story.append(PageBreak())


def recommendations(story):
    story.append(Paragraph("Recomendações priorizadas", S["h1"]))
    recs = [
        ("P1", "Fechar a exposição direta de PostgreSQL e MinIO", "Alterar o Compose para bind em 127.0.0.1, retirar credenciais fixas, gerar segredos locais e recusar valores conhecidos. Fazer isso antes de usar a máquina em rede compartilhada."),
        ("P2", "Reduzir privilégios do armazenamento", "Criar usuário/política MinIO exclusiva para o bucket e operações necessárias; a aplicação não deve usar credencial root."),
        ("P3", "Separar telemetria pessoal de operacional", "Decidir o contrato de /privacy/usage, persistir métricas pessoais por owner_id e proteger qualquer visão global por autorização administrativa no backend."),
        ("P4", "Adicionar regressões de segurança", "Criar E2E com duas contas para métricas de uso e teste de configuração que falhe para defaults públicos; manter os testes de posse já existentes."),
        ("P5", "Automatizar detecção de segredos", "Adicionar scanner de segredos no CI e varrer histórico. A auditoria atual não encontrou segredo real, mas a prevenção reduz risco futuro."),
    ]
    rows = [[p("Prioridade", "table_bold"), p("Ação", "table_bold"), p("Resultado esperado", "table_bold")]]
    rows += [[p(a, "table_bold"), p(b, "table_bold"), p(c, "table")] for a, b, c in recs]
    table = Table(rows, colWidths=[1.7 * cm, 5.1 * cm, 9.0 * cm], repeatRows=1)
    table.setStyle(audit_table_style())
    story.append(table)
    story.append(Paragraph("Verificações executadas", S["h2"]))
    checks = [
        "Build NestJS: aprovado.",
        "Build Angular de produção: aprovado; bundle resultante sem padrões de chave/segredo.",
        "Testes unitários: 25 suítes, 111 testes aprovados.",
        "Testes E2E: 1 suíte, 23 testes aprovados.",
        "Histórico Git: patches e nomes de arquivos de ambiente revisados; nenhum segredo real confirmado.",
        "Deploy: Docker Compose revisado; não há arquivos CI, Helm ou Terraform no repositório.",
    ]
    for item in checks:
        story.append(rich(f"<font color='{PALETTE['ponto forte']}'>●</font> {item}"))
    story.append(PageBreak())


def issues_section(story):
    story.append(Paragraph("ISSUES PARA O GITHUB", S["h1"]))
    story.append(p("Os três achados acionáveis foram agrupados em duas issues: PostgreSQL e MinIO compartilham a mesma causa de deploy e foram consolidados para evitar spam."))
    for index, issue in enumerate(ISSUES, 1):
        story.append(Paragraph(f"Issue {index}", S["h2"]))
        block = f"--- ISSUE {index} ---\nTítulo: {issue['title']}\nLabels sugeridas: {issue['labels']}\n\n{issue['body'].strip()}\n--- FIM ISSUE {index} ---"
        lines = []
        for line in block.splitlines():
            if not line:
                lines.append(Spacer(1, 4))
                continue
            escaped = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            lines.append(Paragraph(escaped, S["issue_line"]))
        issue_box = Table([[lines]], colWidths=[15.8 * cm])
        issue_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3F5F9")),
            ("BOX", (0, 0), (-1, -1), .7, colors.HexColor(PALETTE["line"])),
            ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]))
        story.append(issue_box)
        if index != len(ISSUES):
            story.append(PageBreak())


def build():
    donut, bars = make_charts()
    width, height = A4
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.75 * cm,
        bottomMargin=1.55 * cm,
        title=f"{REPORT_TITLE} - {PROJECT}",
        author="Codex",
        subject="Auditoria de segurança do projeto Eclipse",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates(PageTemplate(id="audit", frames=[frame], onPage=draw_header_footer))
    story = []
    cover(story)
    executive(story, donut, bars)
    strengths_and_coverage(story)
    findings_section(story)
    category_results(story)
    recommendations(story)
    issues_section(story)
    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build()
