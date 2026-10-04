-- Activity and notification are committed together. Failed/rolled-back actions never notify.
DROP FUNCTION IF EXISTS activity_notice(uuid,text,text,text,text,text);
CREATE OR REPLACE FUNCTION activity_notice(recipient uuid, kind text, heading text, detail text, target text, state text DEFAULT NULL, entity text DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
 INSERT INTO notifications(user_id,type,title,body,data)
 SELECT recipient,kind,heading,detail,jsonb_build_object('url',target,'status',state,'entityId',entity)
 WHERE EXISTS(SELECT 1 FROM users WHERE id=recipient AND is_active);
$$;

CREATE OR REPLACE FUNCTION activity_state_label(state text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE state WHEN 'pending' THEN 'Đang chờ' WHEN 'accepted' THEN 'Đã chấp nhận'
 WHEN 'declined' THEN 'Đã từ chối' WHEN 'cancelled' THEN 'Đã hủy' WHEN 'ended' THEN 'Đã kết thúc'
 WHEN 'paid' THEN 'Đã thanh toán' WHEN 'failed' THEN 'Thất bại' WHEN 'expired' THEN 'Hết hạn'
 WHEN 'refunded' THEN 'Đã hoàn tiền' WHEN 'approved' THEN 'Đã duyệt' WHEN 'rejected' THEN 'Đã từ chối'
 WHEN 'confirmed' THEN 'Đã xác nhận' WHEN 'completed' THEN 'Hoàn thành' WHEN 'open' THEN 'Đã tiếp nhận'
 WHEN 'investigating' THEN 'Đang xử lý' WHEN 'resolved' THEN 'Đã giải quyết' WHEN 'dismissed' THEN 'Đã đóng'
 WHEN 'invited' THEN 'Được mời' WHEN 'active' THEN 'Đã tham gia' ELSE state END;
$$;

CREATE OR REPLACE FUNCTION notify_activity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n jsonb; o jsonb; recipient uuid; other uuid; target text; kind text; heading text; state text;
BEGIN
 IF TG_OP='DELETE' THEN n:=to_jsonb(OLD); ELSE n:=to_jsonb(NEW); END IF;
 IF TG_OP='UPDATE' THEN o:=to_jsonb(OLD); END IF;
 state:=n->>'status'; kind:=TG_TABLE_NAME;
 IF TG_TABLE_NAME='messages' THEN
  INSERT INTO notifications(user_id,type,title,body,data)
  SELECT cm.user_id,'message','Bạn có tin nhắn mới','Mở hội thoại để đọc tin nhắn.',jsonb_build_object('url','/chat?conversation='||NEW.conversation_id,'entityId',NEW.id)
  FROM conversation_members cm JOIN users u ON u.id=cm.user_id AND u.is_active
  WHERE cm.conversation_id=NEW.conversation_id AND cm.user_id<>NEW.sender_id
   AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE b.deleted_at IS NULL AND
    ((b.blocker_id=cm.user_id AND b.blocked_id=NEW.sender_id) OR (b.blocked_id=cm.user_id AND b.blocker_id=NEW.sender_id)));
  RETURN NEW;
 ELSIF TG_TABLE_NAME='conversation_members' THEN
  IF NEW.last_read_at IS DISTINCT FROM OLD.last_read_at THEN
   UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE user_id=NEW.user_id AND type='message'
    AND data->>'url'='/chat?conversation='||NEW.conversation_id AND created_at<=NEW.last_read_at;
  END IF;
  RETURN NEW;
 ELSIF TG_TABLE_NAME='match_requests' THEN
  IF TG_OP='UPDATE' AND state IS NOT DISTINCT FROM o->>'status' THEN RETURN NEW; END IF;
  target:='/dashboard'; heading:='Đề nghị ghép đôi';
  IF TG_OP='INSERT' THEN recipient:=NEW.recipient_id;
  ELSE recipient:=NEW.requester_id; other:=NEW.recipient_id; END IF;
 ELSIF TG_TABLE_NAME='housing_group_members' THEN
  IF TG_OP='UPDATE' AND state IS NOT DISTINCT FROM o->>'status' AND n->>'role' IS NOT DISTINCT FROM o->>'role' THEN RETURN NEW; END IF;
  recipient:=(n->>'user_id')::uuid; target:='/groups?group='||(n->>'group_id'); heading:='Cập nhật nhóm ở ghép';
  IF TG_OP='DELETE' THEN state:='ended'; target:='/groups';
  ELSIF TG_OP='INSERT' AND state='invited' THEN heading:='Bạn có lời mời tham gia nhóm';
  ELSIF TG_OP='UPDATE' AND n->>'role' IS DISTINCT FROM o->>'role' THEN
   state:=n->>'role'; heading:='Quyền trong nhóm đã thay đổi';
   state:=CASE state WHEN 'owner' THEN 'Chủ nhóm' WHEN 'manager' THEN 'Quản lý nhóm' ELSE 'Thành viên' END;
  END IF;
  SELECT created_by INTO other FROM housing_groups WHERE id=(n->>'group_id')::uuid;
 ELSIF TG_TABLE_NAME IN ('payments','service_bookings','payment_refund_requests','identity_verifications') THEN
  IF TG_OP='UPDATE' AND state IS NOT DISTINCT FROM o->>'status' THEN RETURN NEW; END IF;
  recipient:=(n->>'user_id')::uuid;
  IF TG_TABLE_NAME='payments' THEN heading:=CASE WHEN n->>'provider'='mock' THEN 'Trạng thái thanh toán giả lập' ELSE 'Trạng thái thanh toán' END; target:='/payments/'||(n->>'id');
  ELSIF TG_TABLE_NAME='service_bookings' THEN heading:='Trạng thái lịch đặt dịch vụ'; target:='/bookings/'||(n->>'id');
  ELSIF TG_TABLE_NAME='payment_refund_requests' THEN heading:='Yêu cầu hoàn tiền'; target:='/payments/'||(n->>'payment_id');
  ELSE heading:='Kết quả xác minh danh tính'; target:='/settings?section=profile'; END IF;
 ELSIF TG_TABLE_NAME='disputes' THEN
  IF TG_OP='UPDATE' AND state IS NOT DISTINCT FROM o->>'status' THEN RETURN NEW; END IF;
  recipient:=NEW.complainant_id; other:=NEW.respondent_id; heading:='Trạng thái yêu cầu hòa giải'; target:='/disputes?case='||NEW.id;
 ELSIF TG_TABLE_NAME='dispute_messages' THEN
  SELECT complainant_id,respondent_id INTO recipient,other FROM disputes WHERE id=NEW.dispute_id;
  IF recipient=NEW.author_id THEN recipient:=NULL; END IF;
  IF other=NEW.author_id THEN other:=NULL; END IF;
  heading:='Yêu cầu hòa giải có phản hồi mới'; target:='/disputes?case='||NEW.dispute_id;
 ELSIF TG_TABLE_NAME='rooms' THEN
  IF TG_OP='UPDATE' AND NEW.moderation_status IS NOT DISTINCT FROM OLD.moderation_status THEN RETURN NEW; END IF;
  recipient:=NEW.owner_user_id; state:=NEW.moderation_status; heading:='Trạng thái tin phòng'; target:='/settings?section=rooms';
 ELSIF TG_TABLE_NAME='user_reports' THEN
  IF TG_OP='UPDATE' AND state IS NOT DISTINCT FROM o->>'status' THEN RETURN NEW; END IF;
  recipient:=NEW.reporter_id; heading:='Trạng thái báo cáo của bạn'; target:='/notifications';
 ELSIF TG_TABLE_NAME='subscriptions' THEN
  IF TG_OP='UPDATE' AND (n->>'status',n->>'plan',n->>'ends_at') IS NOT DISTINCT FROM (o->>'status',o->>'plan',o->>'ends_at') THEN RETURN NEW; END IF;
  recipient:=NEW.user_id; heading:='Gói tài khoản đã thay đổi'; target:='/settings?section=billing';
  state:=CASE NEW.status WHEN 'active' THEN 'Đang hoạt động' WHEN 'expired' THEN 'Đã hết hạn' WHEN 'cancelled' THEN 'Đã hủy' ELSE NEW.status END;
 ELSIF TG_TABLE_NAME='users' THEN
  IF (NEW.role,NEW.is_active) IS NOT DISTINCT FROM (OLD.role,OLD.is_active) THEN RETURN NEW; END IF;
  recipient:=NEW.id; heading:='Quyền tài khoản đã thay đổi'; target:='/notifications'; state:=NEW.role;
 ELSIF TG_TABLE_NAME='lifestyle_preferences' THEN
  IF (n-'updated_at') IS NOT DISTINCT FROM (o-'updated_at') THEN RETURN NEW; END IF;
  recipient:=NEW.user_id; heading:='Lối sống và nhu cầu ở đã được cập nhật'; target:='/settings?section=profile';
 ELSIF TG_TABLE_NAME='profiles' THEN
  IF (n-'updated_at'-'profile_completion') IS NOT DISTINCT FROM (o-'updated_at'-'profile_completion') THEN RETURN NEW; END IF;
  recipient:=NEW.user_id; heading:='Hồ sơ đã được cập nhật'; target:='/settings?section=profile';
 ELSE RETURN NEW;
 END IF;
 PERFORM activity_notice(recipient,kind,heading,COALESCE(activity_state_label(state),'Có cập nhật mới.'),target,state,COALESCE(n->>'id',n->>'group_id',n->>'user_id'));
 IF other IS NOT NULL AND other IS DISTINCT FROM recipient THEN
  PERFORM activity_notice(other,kind,heading,COALESCE(activity_state_label(state),'Có cập nhật mới.'),target,state,COALESCE(n->>'id',n->>'group_id',n->>'user_id'));
 END IF;
 -- Staff queues receive their own notices, never another member's personal feed.
 IF (TG_OP='INSERT' OR (TG_OP='UPDATE' AND state IS DISTINCT FROM o->>'status')) AND
  ((TG_TABLE_NAME='rooms' AND state='pending') OR TG_TABLE_NAME IN ('disputes','user_reports','identity_verifications','payment_refund_requests','service_bookings')) THEN
  target:=CASE TG_TABLE_NAME WHEN 'rooms' THEN '/admin/rooms' WHEN 'disputes' THEN '/admin/disputes'
   WHEN 'user_reports' THEN '/admin/reports' WHEN 'identity_verifications' THEN '/admin/verifications'
   WHEN 'payment_refund_requests' THEN '/admin/refunds' ELSE '/admin/services' END;
  INSERT INTO notifications(user_id,type,title,body,data)
  SELECT id,'staff_activity',heading,COALESCE(activity_state_label(state),'Có cập nhật mới.'),jsonb_build_object('url',target,'status',state,'entityId',n->>'id')
  FROM users WHERE is_active AND (role='admin' OR (role='moderator' AND TG_TABLE_NAME NOT IN ('payment_refund_requests','service_bookings')));
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['match_requests','payments','service_bookings','payment_refund_requests','identity_verifications','disputes','rooms','user_reports','subscriptions'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS activity_notifications ON %I',t);
  EXECUTE format('CREATE TRIGGER activity_notifications AFTER INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION notify_activity()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['messages','dispute_messages'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS activity_notifications ON %I',t);
  EXECUTE format('CREATE TRIGGER activity_notifications AFTER INSERT ON %I FOR EACH ROW EXECUTE FUNCTION notify_activity()',t);
 END LOOP;
END $$;
DROP TRIGGER IF EXISTS activity_notifications ON housing_group_members;
CREATE TRIGGER activity_notifications AFTER INSERT OR UPDATE OR DELETE ON housing_group_members FOR EACH ROW EXECUTE FUNCTION notify_activity();
DROP TRIGGER IF EXISTS activity_notifications ON profiles;
CREATE TRIGGER activity_notifications AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION notify_activity();
DROP TRIGGER IF EXISTS activity_notifications ON conversation_members;
CREATE TRIGGER activity_notifications AFTER UPDATE OF last_read_at ON conversation_members FOR EACH ROW EXECUTE FUNCTION notify_activity();
DROP TRIGGER IF EXISTS activity_notifications ON users;
CREATE TRIGGER activity_notifications AFTER UPDATE OF role,is_active ON users FOR EACH ROW EXECUTE FUNCTION notify_activity();
DROP TRIGGER IF EXISTS activity_notifications ON lifestyle_preferences;
CREATE TRIGGER activity_notifications AFTER UPDATE ON lifestyle_preferences FOR EACH ROW EXECUTE FUNCTION notify_activity();
