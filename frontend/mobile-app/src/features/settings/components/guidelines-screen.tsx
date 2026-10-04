import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  type LucideIcon,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react-native";
import { Text, View } from "react-native";
import { FormScreen } from "@/components/form-screen";
import { StackHeader } from "@/components/stack-header";
import { Card } from "@/components/ui/card";
import { colors } from "@/theme/colors";

// Nội dung giống trang /community-guidelines của web.
const SECTIONS: { icon: LucideIcon; title: string; desc: string; bullets: string[] }[] = [
  {
    icon: Users,
    title: "Tôn trọng lẫn nhau",
    desc: "Mọi người dùng đều xứng đáng được đối xử lịch sự, công bằng và tôn trọng. Không phân biệt đối xử, xúc phạm hoặc công kích dựa trên giới tính, tuổi tác, nguồn gốc, tôn giáo, nghề nghiệp hay lối sống.",
    bullets: [
      "Không dùng ngôn từ thù ghét, kỳ thị hoặc khiêu dâm.",
      "Tranh luận có văn hóa, không công kích cá nhân.",
      "Tôn trọng quyết định từ chối ghép đôi của người khác.",
    ],
  },
  {
    icon: Shield,
    title: "Trung thực và an toàn",
    desc: "Hồ sơ của bạn là cơ sở để ghép đôi. Thông tin sai lệch không chỉ làm giảm trải nghiệm của bạn mà còn ảnh hưởng đến người khác.",
    bullets: [
      "Cung cấp thông tin thật về bản thân, thói quen và nhu cầu ở chung.",
      "Không giả mạo danh tính, ảnh đại diện hoặc trường học/công ty.",
      "Không chia sẻ thông tin nhạy cảm quá sớm như số tài khoản, mật khẩu.",
    ],
  },
  {
    icon: MessageSquare,
    title: "Giao tiếp lành mạnh",
    desc: "Tin nhắn và cuộc gọi là cầu nối để tìm hiểu bạn cùng phòng. Hãy giữ nó cởi mở, trung thực và an toàn.",
    bullets: [
      "Không spam, quấy rối hoặc gây áp lực khi người khác từ chối.",
      "Không gửi nội dung bạo lực, khiêu dâm hoặc vi phạm pháp luật.",
      "Trả lời tin nhắn và hẹn gặp đúng giờ nếu đã đồng ý.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Hành vi bị cấm",
    desc: "RoomieMatch nghiêm cấm các hành vi gian lận, lừa đảo và gây rối. Vi phạm có thể dẫn đến khóa tài khoản vĩnh viễn.",
    bullets: [
      "Lừa đảo tiền cọc, tiền thuê nhà hoặc thông tin cá nhân.",
      "Quảng cáo dịch vụ, rao bán phòng trá hình spam.",
      "Đe dọa, quấy rối, theo dõi hoặc đăng thông tin riêng tư của người khác.",
    ],
  },
  {
    icon: Flag,
    title: "Báo cáo và chế tài",
    desc: "Cộng đồng được duy trì nhờ sự chủ động của bạn. Mọi báo cáo đều được xử lý kín đáo và khách quan.",
    bullets: [
      "Dùng nút báo cáo trong hồ sơ hoặc tin nhắn khi phát hiện vi phạm.",
      "Đội ngũ sẽ xem xét, yêu cầu chỉnh sửa hoặc khóa tài khoản tùy mức độ.",
      "Báo cáo sai sự thật lặp lại cũng sẽ bị xử lý.",
    ],
  },
];

export function GuidelinesScreen() {
  return (
    <FormScreen>
      <StackHeader title="Quy tắc cộng đồng" />
      <View className="mt-4 gap-4">
        <View className="gap-2">
          <Text className="text-2xl font-bold text-ink">Quy tắc ứng xử của RoomieMatch</Text>
          <Text className="text-sm leading-5 text-slate-500">
            Cùng xây dựng không gian tìm bạn cùng phòng an toàn, tôn trọng và đáng tin cậy cho cộng
            đồng người dùng tại Việt Nam.
          </Text>
        </View>
        {SECTIONS.map(({ icon: Icon, title, desc, bullets }) => (
          <Card key={title} className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-mint/40">
                <Icon color={colors.navy} size={18} />
              </View>
              <Text className="flex-1 text-lg font-bold text-ink">{title}</Text>
            </View>
            <Text className="text-sm leading-5 text-slate-600">{desc}</Text>
            {bullets.map((bullet) => (
              <View key={bullet} className="flex-row items-start gap-2">
                <CheckCircle2 color={colors.teal} size={16} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sm leading-5 text-slate-600">{bullet}</Text>
              </View>
            ))}
          </Card>
        ))}
        <Card className="gap-2 bg-navy">
          <Text className="text-lg font-bold text-white">Báo cáo vi phạm</Text>
          <Text className="text-sm leading-5 text-slate-200">
            Nếu bạn gặp hành vi không phù hợp, hãy báo cáo ngay trong ứng dụng (nút Báo cáo trên hồ
            sơ) hoặc liên hệ đội ngũ hỗ trợ. Chúng tôi sẽ xem xét và xử lý trong vòng 24-48 giờ.
          </Text>
        </Card>
      </View>
    </FormScreen>
  );
}
