-- Link legacy rejection notices to an existing reviewer message, or add a factual
-- system-labelled rejection message. Only legacy rejection reasons are made recipient-visible; approval notes remain private.
DO $$
DECLARE item record; chat_id uuid; existing_message uuid; status_body text;
BEGIN
 FOR item IN
  SELECT DISTINCT ON (r.id) r.id,r.title,r.owner_user_id,r.reviewed_by,r.moderation_note,n.id AS notice_id,n.data
  FROM rooms r JOIN notifications n ON n.user_id=r.owner_user_id
    AND coalesce(n.data->>'roomId',n.data->>'entityId')=r.id::text
    AND n.data->>'status'='rejected'
  JOIN users reviewer ON reviewer.id=r.reviewed_by
  WHERE r.moderation_status='rejected' AND r.deleted_at IS NULL
    AND reviewer.role IN ('admin','moderator') AND r.reviewed_by<>r.owner_user_id
    AND n.data->>'conversationId' IS NULL
  ORDER BY r.id,n.created_at DESC,n.id
 LOOP
  INSERT INTO conversations(direct_key)
  VALUES (CASE WHEN item.reviewed_by::text COLLATE "C" < item.owner_user_id::text COLLATE "C"
    THEN item.reviewed_by::text||':'||item.owner_user_id::text
    ELSE item.owner_user_id::text||':'||item.reviewed_by::text END)
  ON CONFLICT(direct_key) WHERE direct_key IS NOT NULL DO UPDATE SET updated_at=now()
  RETURNING id INTO chat_id;
  INSERT INTO conversation_members(conversation_id,user_id)
  VALUES(chat_id,item.reviewed_by),(chat_id,item.owner_user_id) ON CONFLICT DO NOTHING;
  SELECT id INTO existing_message FROM messages
    WHERE conversation_id=chat_id AND sender_id=item.reviewed_by
      AND content LIKE 'Tin phòng “'||item.title||'” đã bị từ chối.%'
    ORDER BY created_at DESC LIMIT 1;
  status_body := coalesce(nullif(item.data->>'recipientMessage',''),nullif(trim(item.moderation_note),''),'Người duyệt chưa cung cấp lý do từ chối. Bạn có thể hỏi trong hội thoại.');
  IF existing_message IS NULL THEN
    INSERT INTO messages(conversation_id,sender_id,content)
    VALUES(chat_id,item.reviewed_by,'[Thông báo hệ thống bổ sung kết quả từ chối trước đây] Tin phòng “'||item.title||'” đã bị từ chối. '||status_body);
  END IF;
  UPDATE notifications SET type='room_review',title='Tin phòng đã bị từ chối',
    data=data||jsonb_build_object('roomId',item.id,'roomTitle',item.title,'conversationId',chat_id,
      'recipientMessage',coalesce(nullif(data->>'recipientMessage',''),status_body))
    WHERE id=item.notice_id;
 END LOOP;
END $$;
