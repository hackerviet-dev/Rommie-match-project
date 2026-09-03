INSERT INTO users (id, email, role, auth_provider) VALUES
    ('00000000-0000-0000-0000-000000000001', 'maianh@roomiematch.vn', 'member', 'seed'),
    ('00000000-0000-0000-0000-000000000002', 'linh.nguyen@roomiematch.vn', 'member', 'seed'),
    ('00000000-0000-0000-0000-000000000003', 'minh.tran@roomiematch.vn', 'member', 'seed'),
    ('00000000-0000-0000-0000-000000000004', 'hamy@roomiematch.vn', 'member', 'seed'),
    ('00000000-0000-0000-0000-000000000005', 'phuc.le@roomiematch.vn', 'member', 'seed'),
    ('00000000-0000-0000-0000-000000000006', 'thao.vo@roomiematch.vn', 'member', 'seed'),
    ('00000000-0000-0000-0000-000000000099', 'admin@roomiematch.vn', 'admin', 'seed')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;

INSERT INTO profiles
    (user_id, display_name, birth_date, gender, occupation, bio, city, district, avatar_url, is_verified, profile_completion)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Mai Anh', '2003-04-18', 'Nữ', 'Sinh viên Marketing', 'Tìm bạn ở ghép gọn gàng và tôn trọng không gian riêng.', 'TP.HCM', 'Quận 1', 'https://api.dicebear.com/9.x/avataaars/svg?seed=MaiAnh', true, 85),
    ('00000000-0000-0000-0000-000000000002', 'Nguyễn Linh', '2002-08-12', 'Nữ', 'Nhà thiết kế UX', 'Yêu không gian sáng, cây xanh và những buổi tối yên tĩnh.', 'TP.HCM', 'Quận 1', 'https://api.dicebear.com/9.x/avataaars/svg?seed=Linh&backgroundColor=8FD3C1', true, 96),
    ('00000000-0000-0000-0000-000000000003', 'Trần Minh', '2000-02-20', 'Nam', 'Kỹ sư phần mềm', 'Làm việc linh hoạt, nấu ăn cuối tuần và luôn giữ khu vực chung ngăn nắp.', 'TP.HCM', 'Bình Thạnh', 'https://api.dicebear.com/9.x/avataaars/svg?seed=Minh&backgroundColor=15A9B8', true, 92),
    ('00000000-0000-0000-0000-000000000004', 'Hà My', '2003-11-03', 'Nữ', 'Sinh viên năm cuối', 'Cởi mở, ưu tiên giao tiếp rõ ràng và cần một góc học tập yên tĩnh.', 'TP.HCM', 'Thủ Đức', 'https://api.dicebear.com/9.x/avataaars/svg?seed=HaMy&backgroundColor=8FD3C1', true, 89),
    ('00000000-0000-0000-0000-000000000005', 'Lê Phúc', '2001-06-22', 'Nam', 'Kỹ sư dữ liệu', 'Thích chạy bộ, cà phê và căn nhà không khói thuốc.', 'TP.HCM', 'Quận 3', 'https://api.dicebear.com/9.x/avataaars/svg?seed=Phuc&backgroundColor=15A9B8', false, 82),
    ('00000000-0000-0000-0000-000000000006', 'Võ Thảo', '2002-01-15', 'Nữ', 'Biên tập viên', 'Thích thú cưng, đọc sách và chia sẻ việc nhà công bằng.', 'TP.HCM', 'Phú Nhuận', 'https://api.dicebear.com/9.x/avataaars/svg?seed=Thao&backgroundColor=8FD3C1', true, 90),
    ('00000000-0000-0000-0000-000000000099', 'RoomieMatch Admin', '1995-01-01', NULL, 'Quản trị viên', NULL, 'TP.HCM', 'Quận 1', NULL, true, 100)
ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    occupation = EXCLUDED.occupation,
    bio = EXCLUDED.bio,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    avatar_url = EXCLUDED.avatar_url,
    is_verified = EXCLUDED.is_verified,
    profile_completion = EXCLUDED.profile_completion;

INSERT INTO lifestyle_preferences
    (user_id, sleep_schedule, cleanliness, social_style, smoking, pet_friendly, cooking_frequency, budget_min, budget_max, move_in_date, interests)
VALUES
    ('00000000-0000-0000-0000-000000000001', '23:00–07:00', 4, 'Cân bằng', false, true, '3–4 lần/tuần', 3500000, 6000000, '2026-10-01', ARRAY['cà phê', 'phim', 'chạy bộ']),
    ('00000000-0000-0000-0000-000000000002', '22:30–06:30', 5, 'Hướng nội', false, false, '2–3 lần/tuần', 4000000, 6000000, '2026-10-01', ARRAY['thiết kế', 'cây xanh', 'đọc sách']),
    ('00000000-0000-0000-0000-000000000003', '00:00–08:00', 4, 'Cân bằng', false, true, 'Cuối tuần', 3000000, 5000000, '2026-10-15', ARRAY['công nghệ', 'gym', 'nấu ăn']),
    ('00000000-0000-0000-0000-000000000004', '00:30–07:30', 4, 'Hướng ngoại', false, true, 'Ít khi', 3000000, 4500000, '2026-11-01', ARRAY['âm nhạc', 'metro', 'nhiếp ảnh']),
    ('00000000-0000-0000-0000-000000000005', '23:30–06:30', 5, 'Hướng nội', false, false, '3–4 lần/tuần', 4000000, 6500000, '2026-10-01', ARRAY['dữ liệu', 'chạy bộ', 'cà phê']),
    ('00000000-0000-0000-0000-000000000006', '23:00–07:00', 4, 'Cân bằng', false, true, 'Hàng ngày', 3500000, 5500000, '2026-10-20', ARRAY['sách', 'mèo', 'nấu ăn'])
ON CONFLICT (user_id) DO UPDATE SET
    sleep_schedule = EXCLUDED.sleep_schedule,
    cleanliness = EXCLUDED.cleanliness,
    budget_min = EXCLUDED.budget_min,
    budget_max = EXCLUDED.budget_max,
    interests = EXCLUDED.interests;

INSERT INTO rooms
    (id, owner_user_id, title, description, address, district, city, monthly_rent, deposit, available_from, max_occupants, amenities, latitude, longitude)
VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Phòng sáng gần phố đi bộ', 'Phòng có cửa sổ lớn, khu bếp chung và giờ giấc tự do.', '42 Nguyễn Huệ', 'Quận 1', 'TP.HCM', 5200000, 5200000, '2026-10-01', 2, ARRAY['máy lạnh', 'máy giặt', 'ban công', 'wifi'], 10.774200, 106.703800),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Căn hộ yên tĩnh gần Landmark 81', 'Còn một phòng ngủ trong căn hộ hai phòng.', '18 Nguyễn Hữu Cảnh', 'Bình Thạnh', 'TP.HCM', 4800000, 4800000, '2026-10-15', 2, ARRAY['bếp', 'máy giặt', 'bảo vệ', 'hồ bơi'], 10.795000, 106.721800),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Studio gần tuyến Metro', 'Đi bộ 7 phút đến ga, phù hợp sinh viên.', '12 Võ Văn Ngân', 'Thủ Đức', 'TP.HCM', 3800000, 3800000, '2026-11-01', 2, ARRAY['gác lửng', 'wifi', 'bãi xe'], 10.850600, 106.771900)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, monthly_rent = EXCLUDED.monthly_rent, is_active = true;

INSERT INTO matching_scores (user_id, candidate_user_id, overall_score, breakdown, explanation) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 96, '{"sleep":95,"cleanliness":98,"social":88,"budget":92}', 'Cùng ưu tiên không gian sạch, giờ ngủ tương đồng và ngân sách phù hợp.'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 92, '{"sleep":84,"cleanliness":95,"social":91,"budget":96}', 'Ngân sách rất phù hợp và cả hai đều giao tiếp thẳng thắn.'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 89, '{"sleep":82,"cleanliness":91,"social":94,"budget":90}', 'Hợp về tính xã hội, khu vực và thời điểm chuyển vào.'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 86, '{"sleep":92,"cleanliness":96,"social":76,"budget":81}', 'Cùng thích chạy bộ và đề cao căn nhà không khói thuốc.'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 84, '{"sleep":94,"cleanliness":90,"social":82,"budget":76}', 'Thói quen sinh hoạt gần nhau và đều yêu thú cưng.')
ON CONFLICT (user_id, candidate_user_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    breakdown = EXCLUDED.breakdown,
    explanation = EXCLUDED.explanation,
    calculated_at = now();

INSERT INTO local_services
    (id, category, name, description, phone, district, city, distance_km, rating, review_count, price_from, is_verified)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'Giao nước', 'Nước sạch Sài Gòn', 'Giao nước bình tận phòng trong 30 phút.', '0901000001', 'Quận 1', 'TP.HCM', 0.40, 4.9, 328, 25000, true),
    ('20000000-0000-0000-0000-000000000002', 'Giặt ủi', 'Giặt Nhanh 24h', 'Nhận và giao đồ tận nhà trong ngày.', '0901000002', 'Quận 1', 'TP.HCM', 0.70, 4.8, 216, 20000, true),
    ('20000000-0000-0000-0000-000000000003', 'Dọn dẹp', 'Nhà Sạch Mỗi Ngày', 'Dọn phòng và căn hộ theo giờ.', '0901000003', 'Quận 3', 'TP.HCM', 1.20, 4.7, 184, 120000, true),
    ('20000000-0000-0000-0000-000000000004', 'Sửa điện', 'Điện Nước Minh Tâm', 'Xử lý điện nước dân dụng, có mặt nhanh.', '0901000004', 'Bình Thạnh', 'TP.HCM', 1.60, 4.8, 143, 80000, true),
    ('20000000-0000-0000-0000-000000000005', 'Sửa ống nước', 'Thợ Nhà Gần Bạn', 'Sửa rò rỉ và lắp thiết bị vệ sinh.', '0901000005', 'Phú Nhuận', 'TP.HCM', 1.90, 4.6, 97, 100000, true),
    ('20000000-0000-0000-0000-000000000006', 'Lắp internet', 'NetHome', 'Tư vấn và lắp internet trong 24 giờ.', '0901000006', 'Thủ Đức', 'TP.HCM', 2.00, 4.7, 251, 165000, true)
ON CONFLICT (id) DO UPDATE SET rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, price_from = EXCLUDED.price_from;

INSERT INTO conversations (id) VALUES
    ('30000000-0000-0000-0000-000000000001'),
    ('30000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversation_members (conversation_id, user_id) VALUES
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Chào Mai Anh, mình thấy tụi mình hợp nhau 96% đó!', now() - interval '2 hours'),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Chào Linh! Mai mình ghé xem phòng sau giờ học được không?', now() - interval '90 minutes'),
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Mình vừa gửi lịch sinh hoạt và ngân sách nhé.', now() - interval '1 hour')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions (id, user_id, plan, status, starts_at, ends_at) VALUES
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'premium', 'active', now() - interval '10 days', now() + interval '20 days')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, ends_at = EXCLUDED.ends_at;
