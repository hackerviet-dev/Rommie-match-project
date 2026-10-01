"""Synchronize Markdown and the SRS dashboard from docs/project-status.json.
Requires reportlab and pypdf. Keeps the original 31-page SRS and v1.1 appendix.
"""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from pypdf import PdfReader, PdfWriter
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'docs/project-status.json').read_text(encoding='utf-8'))
labels=d['statusLabels']; caps=d['capabilities']; layers=('backend','database','frontend','verification')
weights={'done':1,'partial':.5,'planned':0,'blocked':0}
values=[weights[c[k]] for c in caps for k in layers if c[k]!='na'];coverage=round(100*sum(values)/len(values))
lines=['# Trạng thái dự án RoomieMatch','',f"- Cập nhật: **{d['lastUpdated']}**",f"- Phiên bản tài liệu: **{d['documentVersion']}**",f"- Branch/commit kiểm tra: **{d['baseline']['branch']} / {d['baseline']['commit']}**",f"- Giai đoạn hiện tại: **{d['currentPhase']}**",f'- Mức bao phủ kỹ thuật: **{coverage}%**','','> Phần trăm tính theo bốn lớp backend, database, frontend và verification; done = 1, partial = 0.5, planned/blocked = 0, bỏ qua na. Đây không phải phần trăm thời gian hoặc ngân sách.','','## Actor','','| Mã | Actor | Mục tiêu | Hiện trạng | Trạng thái |','| --- | --- | --- | --- | --- |']
for a in d['actors']:lines.append('| '+' | '.join([a['code'],a['name'],a['target'],a['current'],labels[a['status']]])+' |')
lines+=['','## Tiến độ năng lực','','| Mã | Năng lực | Backend | DB | Frontend | Kiểm tra | Tổng thể | Việc tiếp theo |','| --- | --- | --- | --- | --- | --- | --- | --- |']
for c in caps:lines.append('| '+' | '.join([c['id'],c['name']]+[labels[c[k]] for k in layers]+[labels[c['status']],c['nextAction']])+' |')
lines+=['','## Bằng chứng kiểm tra','']
for c in caps:lines.append(f"- **{c['id']} - {c['name']}:** {c['evidence']}")
lines+=['','## Roadmap','','| Giai đoạn | Tên | Mục tiêu | Trạng thái |','| --- | --- | --- | --- |']
for r in d['roadmap']:lines.append('| '+' | '.join([r['phase'],r['name'],r['goal'],labels[r['status']]])+' |')
lines+=['','## Lịch sử cập nhật','']
for e in d['changelog']:lines.append(f"- **{e['date']} - v{e['version']}:** {e['summary']}")
lines+=['','## Cách cập nhật','','1. Cập nhật JSON nguồn sau khi trạng thái triển khai thay đổi.','2. Chạy `scripts/sync-project-status.py` bằng Python có reportlab và pypdf.','3. Kiểm tra JSON, Markdown và render dashboard PDF.','']
(ROOT/'docs/project-status.md').write_text('\n'.join(lines),encoding='utf-8')
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'));pdfmetrics.registerFont(TTFont('ArialBold','C:/Windows/Fonts/arialbd.ttf'))
styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='VN',fontName='Arial',fontSize=8,leading=11,spaceAfter=5));styles.add(ParagraphStyle(name='VNTitle',fontName='ArialBold',fontSize=17,leading=22,spaceAfter=14));styles.add(ParagraphStyle(name='VNHead',fontName='ArialBold',fontSize=11,leading=14,spaceAfter=5))
def p(s,style='VN'):return Paragraph(escape(str(s)),styles[style])
def table(rows,widths):
 t=Table([[p(x) for x in row] for row in rows],colWidths=widths,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e6f3f4')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.3,colors.HexColor('#cbd5e1')),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]));return t
story=[p('DASHBOARD MỤC TIÊU VÀ TIẾN ĐỘ','VNTitle'),p(f"Phiên bản {d['documentVersion']} | {d['lastUpdated']} | {d['baseline']['branch']} / {d['baseline']['commit']}"),p(f'Bao phủ kỹ thuật: {coverage}%','VNHead'),p('Bốn lớp: backend, database, frontend, verification. Done = 1; partial = 0.5; planned/blocked = 0; không tính na.'),p(d['currentPhase']),Spacer(1,12),p('Actor và hiện trạng','VNHead'),table([['Actor','Hiện trạng','Trạng thái']]+[[a['name'],a['current'],labels[a['status']]] for a in d['actors']],[85,335,95]),PageBreak()]
for title,group in [('B.1 Năng lực cốt lõi',caps[:9]),('B.2 Năng lực mở rộng',caps[9:])]:
 story+=[p(title,'VNTitle'),table([['Mã / năng lực','BE / DB / FE / KT','Tổng thể','Việc tiếp theo']]+[[c['id']+' / '+c['name'],' / '.join(labels[c[k]] for k in layers),labels[c['status']],c['nextAction']] for c in group],[100,125,70,220]),PageBreak()]
story+=[p('B.3 Roadmap và lịch sử cập nhật','VNTitle'),table([['Giai đoạn','Mục tiêu','Trạng thái']]+[[r['phase']+' - '+r['name'],r['goal'],labels[r['status']]] for r in d['roadmap']],[105,315,95]),Spacer(1,15),p('Lịch sử cập nhật','VNHead')]
styles.add(ParagraphStyle(name='VNHistory',fontName='Arial',fontSize=8,leading=10,spaceAfter=3))
for e in d['changelog']:story+=[KeepTogether([p(e['date']+' - v'+e['version'],'VNHead'),p(e['summary'],'VNHistory')])]
styles.add(ParagraphStyle(name='VNEvidence',fontName='Arial',fontSize=8,leading=9,spaceAfter=1))
styles.add(ParagraphStyle(name='VNEvidenceHead',fontName='ArialBold',fontSize=10,leading=12,spaceAfter=3))
story+=[PageBreak(),p('B.4 Bằng chứng và quy trình cập nhật','VNTitle')]
for index,c in enumerate(caps):
 if index==9:story+=[PageBreak(),p('B.4 Bằng chứng - năng lực mở rộng','VNTitle')]
 story+=[KeepTogether([p(c['id']+' - '+c['name'],'VNEvidenceHead'),p(c['evidence'],'VNEvidence')])]
story+=[KeepTogether([p('Quy trình cập nhật','VNHead'),p('Sửa JSON nguồn; đồng bộ Markdown và dashboard PDF; kiểm tra trạng thái từng tầng, lịch sử thay đổi và bản render trước khi kết thúc.')])]
tmp=ROOT/'tmp/pdfs';tmp.mkdir(parents=True,exist_ok=True);appendix=tmp/'status-appendix.pdf'
def footer(canvas,doc):
 canvas.setFont('Arial',8);canvas.drawString(40,20,'RoomieMatch - Dashboard v'+d['documentVersion']);canvas.drawRightString(A4[0]-40,20,f'Trang {31+doc.page}')
SimpleDocTemplate(str(appendix),pagesize=A4,leftMargin=40,rightMargin=40,topMargin=38,bottomMargin=38).build(story,onFirstPage=footer,onLaterPages=footer)
output=ROOT/'output/pdf/RoomieMatch-SRS-v1.2-progress.pdf';reader=PdfReader(output);writer=PdfWriter()
for page in list(reader.pages)[:31]:writer.add_page(page)
for page in PdfReader(appendix).pages:writer.add_page(page)
with output.open('wb') as f:writer.write(f)
check=PdfReader(output);text='\n'.join(page.extract_text() or '' for page in check.pages[31:]);assert d['lastUpdated'] in text and 'CAP-02' in text and str(coverage)+'%' in text
print(f'Synchronized JSON/Markdown/PDF: coverage {coverage}%, PDF {len(check.pages)} pages')
