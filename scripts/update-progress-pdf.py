"""Regenerate only the living dashboard; preserve the original SRS pages."""
import io
import json
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, PageBreak

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'docs/project-status.json').read_text(encoding='utf-8'))
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
style = ParagraphStyle('body', fontName='Arial', fontSize=8, leading=11, spaceAfter=5)
title = ParagraphStyle('title', parent=style, fontSize=16, leading=21, spaceAfter=15)
labels = data['statusLabels']
story = []

def p(text):
    return Paragraph(escape(str(text)).replace('\n', '<br/>'), style)

def table(rows, widths):
    result = Table([[p(cell) for cell in row] for row in rows], colWidths=widths, repeatRows=1)
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dceeee')),
        ('GRID', (0, 0), (-1, -1), .3, colors.HexColor('#afc8c8')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(result)

story.append(Paragraph('DASHBOARD MỤC TIÊU VÀ TIẾN ĐỘ', title))
story.append(p(f"Phiên bản {data['documentVersion']} | Cập nhật {data['lastUpdated']}"))
story.append(p(f"Baseline: {data['baseline']['branch']} / {data['baseline']['commit']}"))
story.append(p(data['currentPhase']))
weights = {'done': 1, 'partial': .5, 'planned': 0, 'blocked': 0, 'na': 1}
coverage = round(100 * sum(weights[c[k]] for c in data['capabilities'] for k in ('backend', 'database', 'frontend', 'verification')) / (4 * len(data['capabilities'])))
story.append(p(f'Mức bao phủ kỹ thuật: {coverage}%. Không phải tỷ lệ thời gian hoặc ngân sách.'))
story.append(Spacer(1, 10))
table([['Actor', 'Hiện trạng', 'Trạng thái']] + [[a['name'], a['current'], labels[a['status']]] for a in data['actors']], [85, 325, 95])
for heading, caps in [('B.1 Năng lực cốt lõi', data['capabilities'][:9]), ('B.2 Năng lực mở rộng', data['capabilities'][9:])]:
    story.append(PageBreak())
    story.append(Paragraph(heading, title))
    table([['Năng lực', 'BE / DB / FE / Kiểm tra', 'Bằng chứng và việc tiếp theo']] + [
        [c['id'] + ' - ' + c['name'], ' / '.join(labels[c[k]] for k in ('backend', 'database', 'frontend', 'verification')), c['evidence'] + '\nTiếp theo: ' + c['nextAction']]
        for c in caps
    ], [105, 100, 300])
story.append(PageBreak())
story.append(Paragraph('B.3 Roadmap và lịch sử cập nhật', title))
table([['Giai đoạn', 'Mục tiêu', 'Trạng thái']] + [[r['phase'] + ' - ' + r['name'], r['goal'], labels[r['status']]] for r in data['roadmap']], [125, 285, 95])
story.append(Spacer(1, 15))
for entry in data['changelog']:
    story.append(p(f"{entry['date']} - v{entry['version']}: {entry['summary']}"))
story.append(PageBreak())
story.append(Paragraph('B.4 Quy trình cập nhật tài liệu sống', title))
for text in [
    'Nguồn trạng thái: docs/project-status.json. Markdown và dashboard PDF phải đồng bộ.',
    'Cập nhật backend, database, frontend, verification, status, evidence và nextAction sau thay đổi.',
    'Không đánh dấu hoàn thành cho mock UI hoặc luồng chưa kiểm thử end-to-end.',
    'Render/Neon: migration startup dùng transaction lock và ledger, không seed tài khoản demo production.',
    'payOS: provider production mặc định tắt. Chỉ bật sau khi có khóa mới, webhook HTTPS và kiểm thử thật.',
    'Kiểm tra hiện tại: frontend lint (0 lỗi, 6 cảnh báo), TypeScript, build; Docker 10 migration, rerun, health, plans và CORS đạt.',
]:
    story.append(p(text))

buffer = io.BytesIO()
def footer(canvas, doc):
    canvas.setFont('Arial', 8)
    canvas.drawString(45, 25, 'RoomieMatch - SRS | Dashboard tiến độ v1.2')
    canvas.drawRightString(550, 25, f'Trang {31 + doc.page}')

SimpleDocTemplate(buffer, pagesize=(595, 842), leftMargin=45, rightMargin=45, topMargin=45, bottomMargin=45).build(story, onFirstPage=footer, onLaterPages=footer)
dashboard = PdfReader(buffer)
assert len(dashboard.pages) == 5, 'Dashboard overflow: review layout before publishing'
target = ROOT / 'output/pdf/RoomieMatch-SRS-v1.2-progress.pdf'
reader = PdfReader(target)
writer = PdfWriter()
for page in reader.pages[:31]:
    writer.add_page(page)
for page in dashboard.pages:
    writer.add_page(page)
with target.open('wb') as stream:
    writer.write(stream)
assert len(PdfReader(target).pages) == 36
print('Updated five dashboard pages; preserved original 31 SRS pages.')
