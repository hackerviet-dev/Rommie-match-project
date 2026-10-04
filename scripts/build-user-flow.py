"""Local-only flow diagram and URL/API/database inventory. Outputs are ignored artifacts."""
import json, html, textwrap
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader, PdfWriter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/flow';OUT.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold','C:/Windows/Fonts/arialbd.ttf'))
inventory=[]
def route(url,title,apis,read='',write='',note=''):
    inventory.append(dict(url=url,title=title,apis=apis.split('|') if apis else [],read=read.split(', ') if read else [],write=write.split(', ') if write else [],note=note))
route('/', 'Trang chủ / Khách', '',note='Khách xem giới thiệu; phiên thành viên/Premium hợp lệ về /dashboard, admin/moderator về /admin. Không tự quét ghép đôi.')
route('/register','Đăng ký','POST /api/auth/register','users','users, profiles, refresh_tokens', 'Chuyển sang onboarding bắt buộc. Chưa có CAPTCHA.')
route('/login','Đăng nhập','POST /api/auth/login|GET /api/auth/me|POST /api/auth/refresh','users, profiles, refresh_tokens','refresh_tokens','Trang mặc định theo actor: thành viên/Premium /dashboard; admin/moderator /admin. Giữ URL đích hợp lệ khi đăng nhập từ trang cần quyền. Thành viên chưa hoàn thiện bị chuyển /onboarding.')
route('/onboarding','Hồ sơ, lối sống, nhu cầu','GET /api/users/me/profile|GET /api/users/me/onboarding|PUT /api/users/me/onboarding','profiles, lifestyle_preferences','profiles, lifestyle_preferences','4 bước lưu cùng transaction; nhu cầu nằm trong onboarding_data và lifestyle_preferences. Không gọi thêm PUT profile/lifestyle/housing-needs riêng.')
route('/quiz','Khảo sát lối sống','GET /api/matching/quiz|GET /api/matching/me/quiz|PUT /api/matching/me/quiz|GET /api/matching/me/usage|POST /api/matching/me/recalculate','quiz_responses, profiles, lifestyle_preferences, users, user_settings, user_blocks, subscriptions, matching_runs','quiz_responses, matching_scores, matching_runs','Câu hỏi từ định nghĩa trong code. Chỉ quét khi bấm nút; thành công mở /matches. Không trừ lượt nếu không có ứng viên.')
route('/dashboard','Dashboard / Thành viên','GET /api/users/me/profile|GET /api/matching/me/matches|GET /api/users/me/saved-profiles|GET /api/chat/conversations|GET /api/hyperlocal/services|GET /api/billing/me/subscription|GET /api/matching/me/usage|GET /api/matching/me/quiz|GET /api/matching/requests|POST /api/matching/me/recalculate|POST /api/matching/requests/{id}/{accept,decline,cancel,end}','users, profiles, lifestyle_preferences, matching_scores, matching_runs, saved_profiles, conversations, conversation_members, messages, local_services, subscriptions, quiz_responses, match_requests, user_blocks, user_settings','matching_scores, matching_runs, match_requests','Logo tải lại gợi ý đã lưu; không tự dùng lượt quét. Số liệu lấy từ API, không cộng số minh họa.')
route('/matches','Danh sách phù hợp','GET /api/matching/me/matches|GET /api/matching/me/usage|POST /api/matching/me/recalculate|GET /api/users/me/saved-profiles/ids|POST /api/users/{id}/save|DELETE /api/users/{id}/save|POST /api/chat/conversations','matching_scores, profiles, lifestyle_preferences, users, user_settings, user_blocks, subscriptions, matching_runs, profile_boosts, saved_profiles, conversations, conversation_members','matching_scores, matching_runs, saved_profiles, conversations, conversation_members','Phân trang và lọc server; bộ lọc nâng cao bị backend chặn nếu chưa Premium. Thẻ giữ thiết kế nền chuyển màu; nút nhắn tin tạo/lấy hội thoại thật rồi mở URL conversation.')
route('/profile/:id','Hồ sơ chi tiết','GET /api/users/{id}/profile|GET /api/matching/me/matches/{id}|GET /api/users/me/saved-profiles/ids|POST /api/users/{id}/save|DELETE /api/users/{id}/save|POST /api/chat/conversations|POST /api/users/{id}/block|POST /api/users/{id}/reports|POST /api/matching/requests','users, profiles, lifestyle_preferences, user_settings, user_blocks, matching_scores, subscriptions, saved_profiles','saved_profiles, conversations, conversation_members, user_blocks, user_reports, match_requests','Điểm ghép chỉ hiện khi có kết quả; 404 chi tiết ghép không ngăn đọc hồ sơ được phép.')
route('/rooms','Tìm phòng','GET /api/rooms','rooms, users, profiles, user_blocks, user_settings',note='Chỉ tin approved và active xuất hiện công khai. Lọc thành phố/quận/giá/ngày, phân trang.')
route('/rooms/new','Đăng phòng','POST /api/rooms','users','rooms','Kiểm tra ngày/số người/tiền thuê/tọa độ; tạo tin pending chờ admin/moderator duyệt.')
route('/rooms/:id','Chi tiết phòng / Bản đồ','GET /api/rooms/{id}|POST /api/chat/conversations','rooms, users, profiles, user_blocks, user_settings','conversations, conversation_members','Google Maps nhúng từ địa chỉ/tọa độ; tọa độ được nhập thủ công, chưa có Google Places/autocomplete hoặc chọn điểm trên bản đồ.')
route('/rooms/:id/edit','Sửa phòng','GET /api/rooms/{id}|PUT /api/rooms/{id}','rooms, users, profiles','rooms','Chỉ chủ tin được sửa; tin sửa về pending, ẩn khỏi tìm công khai đến khi duyệt.')
route('/services','Dịch vụ gần nhà','GET /api/hyperlocal/services','local_services',note='Tìm từ khóa, lọc khu vực/danh mục và phân trang trên server; chưa tính khoảng cách từ GPS người dùng.')
route('/services/:id','Chi tiết / Đặt dịch vụ','GET /api/hyperlocal/services/{id}|POST /api/hyperlocal/services/{id}/bookings','local_services','service_bookings','Lịch hẹn sau hiện tại 30 phút đến 60 ngày; yêu cầu thành viên để đặt.')
route('/bookings/:id','Chi tiết booking','GET /api/hyperlocal/me/bookings/{id}|POST /api/hyperlocal/me/bookings/{id}/cancel','service_bookings, local_services','service_bookings')
route('/chat','Nhắn tin','GET /api/chat/conversations|GET /api/chat/conversations/{id}|GET /api/chat/conversations/{id}/messages|POST /api/chat/conversations/{id}/messages|POST /api/chat/conversations/{id}/read|SignalR /hubs/chat','conversations, conversation_members, messages, users, profiles, user_blocks','messages, conversation_members, conversations','SignalR MessageReceived/ConversationRead; REST gửi và đọc; tự đồng bộ định kỳ khi mất kết nối. Phân trang lịch sử. Không có gọi thoại/video/đính kèm.')
route('/premium','Chọn gói Premium','GET /api/billing/plans|GET /api/billing/health|GET /api/billing/me/subscription|POST /api/billing/checkout','subscriptions, users','payments','Gói/giá lấy từ cấu hình backend. Checkout mở paymentUrl. payOS thật chưa được kiểm chứng trong lần nối frontend này.')
route('/premium/result','Kết quả thanh toán','GET /api/billing/payments/{id}|GET /api/billing/me/subscription','payments, subscriptions, payment_refund_requests',note='Trang đọc trạng thái server; không tự kích hoạt Premium từ tham số URL.')
route('/payments/:id','Giao dịch / Hoàn tiền','GET /api/billing/payments/{id}|POST /api/billing/payments/{id}/refund','payments, subscriptions, payment_refund_requests','payment_refund_requests, payments, subscriptions','payOS cần admin chuyển khoản thủ công rồi xác nhận; quyền gói chỉ thay đổi khi backend xử lý hoàn thành.')
route('/settings?section=profile','Hồ sơ của tôi','GET /api/users/me/profile|PUT /api/users/me/profile|GET /api/users/me/lifestyle|GET /api/billing/me/subscription|GET /api/matching/me/quiz','profiles, lifestyle_preferences, subscriptions, quiz_responses','profiles')
route('/settings?section=saved','Lưu hồ sơ','GET /api/users/me/saved-profiles|GET /api/users/me/saved-profiles/ids|DELETE /api/users/{id}/save','saved_profiles, users, profiles, user_settings, user_blocks','saved_profiles','Đã bỏ localStorage cho hồ sơ đã lưu.')
route('/settings?section=rooms','Phòng của tôi','GET /api/rooms/me|DELETE /api/rooms/{id}','rooms, users, profiles','rooms','Tạo/sửa mở các URL phòng tương ứng; xóa có hộp xác nhận.')
route('/settings?section=bookings','Lịch đặt của tôi','GET /api/hyperlocal/me/bookings','service_bookings, local_services')
route('/settings?section=billing','Gói / Hạn mức / Boost','GET /api/billing/me/subscription|GET /api/billing/payments|GET /api/matching/me/usage|POST /api/matching/me/boost','subscriptions, payments, matching_runs, profile_boosts, payment_refund_requests','profile_boosts','Boost tăng thứ hạng, không sửa điểm tương đồng hiển thị.')
route('/settings?section=settings','Chặn / Bảo mật','GET /api/users/me/blocks|DELETE /api/users/{id}/block|POST /api/auth/logout|POST /api/auth/logout-all','user_blocks, users, profiles, refresh_tokens','user_blocks, refresh_tokens','Chưa có API tùy chọn thông báo/quyền riêng tư/đổi mật khẩu/2FA/gửi CCCD trong OpenAPI hiện tại; giữ nút chưa hỗ trợ rõ ràng.')
route('/admin','Tổng quan quản trị','GET /api/admin/workspace-stats|GET /api/admin/stats|GET /api/admin/rooms?status=pending|GET /api/admin/audit-logs','users, profiles, rooms, housing_groups, disputes, user_reports, identity_verifications, staff_audit_logs',note='Sidebar riêng, không có header thành viên. Moderator đọc workspace-stats; stats chỉ admin.')
route('/admin/users','Quản lý thành viên','GET /api/admin/users','users, profiles, subscriptions',note='Admin/moderator tìm tên/email, lọc vai trò và phân trang. Premium là quyền gói, không phải role hệ thống.')
route('/admin/users/:id','Chi tiết / quyền tài khoản','GET /api/admin/users/{id}|PUT /api/admin/users/{id}/access','users, profiles, lifestyle_preferences, rooms, user_reports, subscriptions','users, refresh_tokens, staff_audit_logs','Moderator chỉ đọc. Chỉ admin đổi role/khóa; ghi lý do, xác nhận, thu hồi phiên. Không tự đổi quyền; giữ ít nhất một admin hoạt động.')
route('/admin/staff','Đội ngũ & phân quyền','GET /api/admin/users','users, profiles, subscriptions',note='Chỉ admin; lọc đội admin/moderator. Thay đổi quyền mở chi tiết thành viên.')
route('/admin/rooms','Kiểm duyệt tin phòng','GET /api/admin/rooms|POST /api/admin/rooms/{id}/review','rooms, profiles','rooms, staff_audit_logs','Admin/moderator duyệt hoặc từ chối có lý do. expectedUpdatedAt chặn duyệt phiên bản cũ. Tin mới/sửa chờ duyệt; tin cũ trước migration giữ trạng thái approved.')
route('/admin/groups','Kiểm tra nhóm ở ghép','GET /api/admin/groups|GET /api/admin/groups/{id}|PUT /api/admin/groups/{id}/members/{userId}/role','housing_groups, housing_group_members, profiles','housing_group_members, staff_audit_logs','Moderator đọc; admin được can thiệp role nhóm. Chuyển chủ nhóm giữ đúng một owner; role trong nhóm không cấp quyền hệ thống.')
route('/admin/disputes','Hòa giải tranh chấp','GET /api/admin/disputes|GET /api/admin/disputes/{id}|POST /api/admin/disputes/{id}/messages|POST /api/admin/disputes/{id}/review','disputes, dispute_messages, profiles','disputes, dispute_messages, staff_audit_logs','Tiếp nhận → đang hòa giải → giải quyết/không đủ cơ sở. Ghi kết luận; đã đóng không phản hồi thêm; staff là bên tranh chấp không được tự xử lý.')
route('/admin/reports','Báo cáo vi phạm','GET /api/admin/reports|POST /api/admin/reports/{id}/review','user_reports, profiles','user_reports, staff_audit_logs','Admin/moderator lọc trạng thái, xem hai hồ sơ và ghi kết luận.')
route('/admin/verifications','Xác minh danh tính','GET /api/admin/verifications|POST /api/admin/verifications/{id}/review','identity_verifications, profiles','identity_verifications, profiles, staff_audit_logs','Admin/moderator duyệt/từ chối; thành viên nộp hồ sơ eKYC chưa có luồng.')
route('/admin/services','Quản lý dịch vụ','GET /api/hyperlocal/services|POST /api/hyperlocal/services|PUT /api/hyperlocal/services/{id}|DELETE /api/hyperlocal/services/{id}','local_services','local_services',note='Chỉ admin; giữ CRUD và kiểm tra dữ liệu thật.')
route('/admin/refunds','Yêu cầu hoàn tiền','GET /api/admin/billing/refund-requests|POST /api/admin/billing/refund-requests/{id}/approve|POST /api/admin/billing/refund-requests/{id}/reject','payment_refund_requests, payments, users, profiles','payment_refund_requests, payments, subscriptions','Chỉ admin. payOS hoàn thủ công, chưa xác minh chuyển tiền thật.')
route('/admin/audit','Nhật ký xử lý','GET /api/admin/audit-logs','staff_audit_logs, profiles',note='Chỉ admin, chỉ đọc; role/khóa tài khoản, duyệt tin/báo cáo/xác minh, role nhóm, tranh chấp có nhật ký.')
route('/groups','Nhóm ở ghép của tôi','GET /api/groups/me|GET /api/groups/{id}|GET /api/rooms/me|POST /api/groups|POST /api/groups/{id}/invitations|POST /api/groups/{id}/{accept,decline,leave}|PUT /api/groups/{id}/members/{userId}/role|DELETE /api/groups/{id}/members/{userId}','users, profiles, rooms, housing_groups, housing_group_members','housing_groups, housing_group_members, staff_audit_logs','Member/Premium tạo nhóm, mời email, chấp nhận/từ chối, rời nhóm. Owner phân quyền/chuyển chủ/hủy lời mời/xóa; manager mời. Chủ nhóm phải chuyển quyền trước khi rời.')
route('/disputes','Yêu cầu hòa giải','GET /api/disputes/me|GET /api/disputes/{id}|POST /api/disputes|POST /api/disputes/{id}/messages|GET /api/groups/me|GET /api/groups/{id}|GET /api/chat/conversations|GET /api/users/{id}/profile','disputes, dispute_messages, profiles, users, housing_group_members, housing_groups, rooms, conversations, conversation_members, messages, user_settings, user_blocks','disputes, dispute_messages','Chỉ hai bên đọc và phản hồi. Tạo từ hồ sơ hoặc nhóm; kiểm tra bên liên quan/phòng/nhóm; case đóng chỉ đọc kết luận. Bằng chứng qua mô tả/đường dẫn, chưa có upload file riêng.')
route('/notifications','Lịch sử thông báo','GET /api/users/me/notifications|GET /api/users/me/notifications/unread-count|POST /api/users/me/notifications/{id}/read|POST /api/users/me/notifications/read-all','notifications','notifications',note='Chuông Member/Premium/Admin/Moderator đọc cùng API; lịch sử cá nhân, lọc chưa đọc, phân trang và mở URL nguồn. Đồng bộ mỗi 10 giây; sự kiện ghi cùng transaction. Không có push/email thông báo.')
route('/community-guidelines','Quy tắc cộng đồng','',note='Nội dung tĩnh, không gọi database.')

byurl={r['url']:r for r in inventory}
nodes=[];edges=[]
def node(id,title,url,x,y,detail=''):
    nodes.append(dict(id=id,title=title,url=url,x=x,y=y,detail=detail))
def edge(a,b):edges.append((a,b))
node('guest','Khách','/',340,70)
node('browse','Xem trang chủ, bảng giá, dịch vụ','/',120,200)
node('auth','Đăng ký hoặc đăng nhập','/login',560,200)
node('member','Thành viên','/dashboard',560,330)
node('profile','Hoàn thiện hồ sơ','/onboarding',120,465,'Bước 1')
node('life','Khai báo lối sống','/onboarding',120,595,'Bước 2')
node('needs','Nhu cầu hiện tại','/onboarding',120,725,'Bước 3-4')
node('has','Có phòng','/onboarding',35,855)
node('no','Tìm phòng','/onboarding',260,855)
node('post','Đăng phòng','/rooms/new',35,985)
node('search','Tìm và lọc phòng','/rooms',260,985)
node('calculate','Tính điểm ghép đôi','/quiz',120,1115,'POST recalculate khi bấm nút')
node('matches','Xem danh sách phù hợp','/matches',120,1245)
node('public','Xem hồ sơ chi tiết','/profile/:id',120,1375)
node('save','Lưu hồ sơ','/settings?section=saved',35,1505)
node('chat','Nhắn tin','/chat',260,1505)
node('issue','Có vấn đề?','/chat',150,1645)
node('yes','Có: Chặn hoặc báo cáo','/profile/:id',35,1790)
node('confirm','Không: Trao đổi và ở ghép','/dashboard',300,1790,'Gửi / chấp nhận đề nghị ghép')
node('premium','Chọn nâng cấp Premium','/premium',560,465)
node('checkout','Backend tạo giao dịch','/premium',560,595,'POST checkout')
node('gateway','Cổng thanh toán','/premium/result',560,725,'Mở paymentUrl từ API')
node('activate','Backend kích hoạt subscription','/premium/result',560,855,'Webhook xác nhận từ cổng')
node('premium-member','Thành viên Premium','/settings?section=billing',560,985)
node('advanced','Bộ lọc nâng cao, quét không giới hạn','/matches',560,1115)
node('services','Tìm dịch vụ gần nhà','/services',820,1115)
node('booking','Đặt dịch vụ','/services/:id',820,1245)
node('bookings','Lịch đặt / Hủy booking','/settings?section=bookings',820,1375)
node('billing','Giao dịch / Boost / Hoàn tiền','/settings?section=billing',560,1375)
node('admin','Quản trị & kiểm duyệt','/admin',820,1650)
node('groups','Nhóm ở ghép / Phân quyền','/groups',300,1940)
node('disputes','Yêu cầu hòa giải','/disputes',35,1940)
edge('confirm','groups');edge('yes','disputes')
node('mine','Phòng của tôi / Sửa / Xóa','/settings?section=rooms',560,1505)
for a,b in [('guest','browse'),('guest','auth'),('auth','member'),('member','profile'),('profile','life'),('life','needs'),('needs','has'),('needs','no'),('has','post'),('no','search'),('post','calculate'),('search','calculate'),('calculate','matches'),('matches','public'),('public','save'),('public','chat'),('save','issue'),('chat','issue'),('issue','yes'),('issue','confirm'),('member','premium'),('premium','checkout'),('checkout','gateway'),('gateway','activate'),('activate','premium-member'),('premium-member','advanced'),('advanced','billing'),('services','booking'),('booking','bookings'),('post','mine')]:edge(a,b)

W,H=1090,2100;BW,BH=220,100;lookup={n['id']:n for n in nodes}
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10" fill="#9aafbf"/></marker></defs><rect width="100%" height="100%" fill="white"/><text x="35" y="32" fill="#143c68" font-size="20" font-family="Arial">2. Luồng tổng quan của người dùng</text>']
c=canvas.Canvas(str(OUT/'flow-only.pdf'),pagesize=(W,H));c.setFont('ArialBold',20);c.setFillColor(HexColor('#143c68'));c.drawString(35,H-32,'2. Luồng tổng quan của người dùng')
def line(points):
    svg.append('<path d="'+' '.join(('M' if i==0 else 'L')+f'{x} {y}' for i,(x,y) in enumerate(points))+'" fill="none" stroke="#9aafbf" stroke-width="1.6" marker-end="url(#arrow)"/>')
    c.setStrokeColor(HexColor('#9aafbf'));c.setLineWidth(1.6);p=c.beginPath();p.moveTo(points[0][0],H-points[0][1]);
    for x,y in points[1:]:p.lineTo(x,H-y)
    c.drawPath(p)
for a,b in edges:
    na,nb=lookup[a],lookup[b];x1=na['x']+BW/2;y1=na['y']+BH;x2=nb['x']+BW/2;y2=nb['y'];mid=(y1+y2)/2
    if (a,b)==('post','mine'):line([(na['x']+BW,na['y']+BH/2),(520,na['y']+BH/2),(520,nb['y']-18),(x2,nb['y']-18),(x2,y2)])
    else:line([(x1,y1),(x1,mid),(x2,mid),(x2,y2)])
# Long service branch follows the right edge, as in the supplied reference.
line([(lookup['member']['x']+BW,380),(1070,380),(1070,1090),(930,1090),(930,1115)])
for i,n in enumerate(nodes,1):
    x,y=n['x'],n['y'];r=byurl[n['url']]
    svg.append(f'<g class="node" tabindex="0" role="button" aria-label="{html.escape(n["title"])}" data-id="{n["id"]}"><rect x="{x}" y="{y}" width="{BW}" height="{BH}" rx="17" fill="#e7f3ff" stroke="#cbdff0"/>')
    title=textwrap.wrap(n['title'],27)
    lines=title+[n['url']]+([n['detail']] if n['detail'] else [])
    for li,txt in enumerate(lines):svg.append(f'<text x="{x+BW/2}" y="{y+25+li*17}" text-anchor="middle" font-family="Arial" font-size="{12 if li<len(title) else 10}" fill="#185992">{html.escape(txt)}</text>')
    svg.append(f'<text x="{x+BW/2}" y="{y+90}" text-anchor="middle" font-family="Arial" font-size="9" fill="#52768f">{len(r["apis"])} API · chọn để xem database</text></g>')
    c.setFillColor(HexColor('#e7f3ff'));c.setStrokeColor(HexColor('#cbdff0'));c.roundRect(x,H-y-BH,BW,BH,17,fill=1,stroke=1)
    for li,txt in enumerate(lines):c.setFillColor(HexColor('#185992'));c.setFont('ArialBold' if li<len(title) else 'Arial',12 if li<len(title) else 10);c.drawCentredString(x+BW/2,H-y-25-li*17,txt)
    c.setFont('Arial',9);c.setFillColor(HexColor('#52768f'));c.drawCentredString(x+BW/2,H-y-90,f'{len(r["apis"])} API - chi tiết trong phụ lục URL')
c.setFont('Arial',10);c.drawString(35,35,'Frontend -> API backend -> PostgreSQL. Không kết nối database trực tiếp từ trình duyệt.');c.save()
svg.append('</svg>');svg=''.join(svg);(OUT/'RoomieMatch-user-flow.svg').write_text(svg,encoding='utf-8')
payload=json.dumps(dict(nodes=nodes,routes=inventory),ensure_ascii=False).replace('</','<\\/')
page='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RoomieMatch - Luồng / URL / API / Database</title><style>*{box-sizing:border-box}body{margin:0;font:14px Arial;background:#f4f8fa;color:#143c68}header{padding:20px 28px;background:white;border-bottom:1px solid #d8e3e9;position:sticky;top:0;z-index:2}h1{font-size:22px;margin:0 0 8px}main{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:20px;padding:20px}article{background:white;border-radius:20px;padding:15px;overflow:auto}svg{width:100%;min-width:650px}.node{cursor:pointer}.node:hover rect,.node:focus rect{fill:#ccebdd;stroke:#168897;stroke-width:2}aside{position:sticky;top:110px;align-self:start;background:white;border-radius:20px;padding:24px;max-height:calc(100vh - 130px);overflow:auto}code{display:block;overflow-wrap:anywhere;background:#f2f6fa;padding:9px;margin:5px 0;border-radius:7px;font-size:12px}select{width:100%;padding:10px;margin-bottom:14px;border-radius:8px;border:1px solid #cbd5e1}h2{font-size:20px}h3{font-size:14px;margin-top:22px}li{margin:7px 0}p{line-height:1.6}.note{background:#fff8dd;padding:12px;border-radius:10px}footer{padding:20px;text-align:center}@media(max-width:850px){main{grid-template-columns:1fr}aside{position:static;max-height:none}svg{min-width:650px}}</style><header><h1>Luồng tổng quan của người dùng</h1><span>Chọn một ô để xem URL, API và bảng PostgreSQL. Bố cục giữ các nhánh của sơ đồ tham chiếu.</span></header><main><article>SVG_PLACEHOLDER</article><aside><select aria-label="Chọn trang" id="pages"></select><div id="detail"></div></aside></main><footer>Frontend → API backend → PostgreSQL · 03/10/2026 · Ghi chú chưa tích hợp nằm ở từng trang.</footer><script>const data=PAYLOAD_PLACEHOLDER;const select=document.getElementById('pages');const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));select.innerHTML=data.routes.map(r=>'<option value="'+esc(r.url)+'">'+esc(r.url)+' - '+esc(r.title)+'</option>').join('');function show(url){select.value=url;const r=data.routes.find(r=>r.url===url);document.getElementById('detail').innerHTML='<h2>'+esc(r.title)+'</h2><code>'+esc(r.url)+'</code><h3>API được giao diện sử dụng</h3>'+(r.apis.length?r.apis.map(a=>'<code>'+esc(a)+'</code>').join(''):'<p>Không gọi API.</p>')+'<h3>Database đọc</h3><p>'+esc(r.read.join(', ')||'Không đọc trực tiếp database.')+'</p><h3>Database ghi</h3><p>'+esc(r.write.join(', ')||'Không ghi database.')+'</p>'+(r.note?'<p class="note">'+esc(r.note)+'</p>':'');}select.onchange=()=>show(select.value);document.querySelectorAll('.node').forEach(n=>{const open=()=>show(data.nodes.find(x=>x.id===n.dataset.id).url);n.onclick=open;n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});show('/dashboard');</script></html>'''.replace('SVG_PLACEHOLDER',svg).replace('PAYLOAD_PLACEHOLDER',payload)
(OUT/'RoomieMatch-user-flow.html').write_text(page,encoding='utf-8')
(ROOT/'docs/page-api-database.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
md=['# URL - API - Database','', '> Frontend chỉ gọi API; backend đọc/ghi PostgreSQL. API trong ngoặc {id} dùng UUID từ server.','']
style=ParagraphStyle('VN',fontName='Arial',fontSize=9,leading=13,spaceAfter=5);head=ParagraphStyle('H',fontName='ArialBold',fontSize=14,leading=18,spaceAfter=8)
story=[Paragraph('RoomieMatch - URL / API / Database',head),Paragraph('Phụ lục cho sơ đồ tổng quan. Mỗi URL liệt kê API mà giao diện gọi và bảng mà backend đọc/ghi.',style),Spacer(1,12)]
for r in inventory:
    md+=['## '+r['url']+' - '+r['title'],'','API:']+['- '+a for a in r['apis']]+['','Đọc: '+(', '.join(r['read']) or 'Không'),'Ghi: '+(', '.join(r['write']) or 'Không'),'',r['note'],'']
    block=[Paragraph(html.escape(r['url']+' - '+r['title']),head)]
    for a in r['apis']:block.append(Paragraph(html.escape(a),style))
    block+=[Paragraph('<b>Đọc:</b> '+html.escape(', '.join(r['read']) or 'Không'),style),Paragraph('<b>Ghi:</b> '+html.escape(', '.join(r['write']) or 'Không'),style)]
    if r['note']:block.append(Paragraph(html.escape(r['note']),style))
    block.append(Spacer(1,14));story.append(KeepTogether(block))
(ROOT/'docs/page-api-database.md').write_text('\n'.join(md),encoding='utf-8')
SimpleDocTemplate(str(OUT/'route-inventory.pdf'),pagesize=A4,leftMargin=42,rightMargin=42,topMargin=40,bottomMargin=40).build(story)
writer=PdfWriter()
for src in ['flow-only.pdf','route-inventory.pdf']:
    for p in PdfReader(OUT/src).pages:writer.add_page(p)
with (ROOT/'output/pdf/RoomieMatch-user-flow-api-database.pdf').open('wb') as f:writer.write(f)
print(f'Generated flow HTML/SVG/PDF and inventory for {len(inventory)} URLs.')
