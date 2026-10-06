import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { profileApi } from "@/features/profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QueryState } from "@/components/common/query-state";
import { useMyQuiz, useQuiz } from "../hooks/use-quiz";
import { QuizResultDetails } from "./quiz-result-details";

export function SavedProfileQuizDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const userId = useAuthStore(state => state.user?.id);
  const profile = useQuery({ queryKey: ["profile", "me", userId], queryFn: profileApi.getMine, enabled: open && Boolean(userId) });
  const quiz = useQuiz();
  const saved = useMyQuiz();
  const info = profile.data?.onboarding;
  const fields: [string, string | number | null | undefined][] = info ? [
    ["Họ tên", info.name], ["Tuổi", info.age], ["Giới tính", info.gender], ["Tình trạng", info.employment],
    ["Trường học / nơi làm việc", info.orgName], ["Thành phố", info.city], ["Giới thiệu", info.bio],
    ["Chỗ ở", info.hasRoom === "yes" ? "Đã có phòng · Người đang ở" : "Đang tìm phòng"],
    ["Giờ ngủ", info.sleep], ["Sạch sẽ", `${info.cleanliness}/5`], ["Hướng ngoại", `${info.extroversion}/100`],
    ["Hút thuốc", info.yn.smoke], ["Rượu bia", info.yn.drink], ["Thú cưng", info.yn.pets], ["Không gian phòng", info.env],
    ...(info.hasRoom === "no" ? [
      ["Ngân sách hàng tháng", `${(info.budgetMin * 1000000).toLocaleString("vi-VN")} – ${(info.budgetMax * 1000000).toLocaleString("vi-VN")} đồng`],
      ["Khoảng cách mong muốn", info.distance], ["Loại phòng", info.roomType],
      ["Ngày dọn vào", info.moveInDate ? new Date(`${info.moveInDate}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa lưu"],
    ] as [string, string][] : []),
  ] : [];
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>Thông tin và khảo sát đã lưu</DialogTitle><DialogDescription>Dữ liệu của bạn được đọc lại từ hệ thống. Xem kết quả không sử dụng lượt tìm người phù hợp.</DialogDescription></DialogHeader>
      <QueryState query={profile} />
      {profile.data && <section><h2 className="mb-3 font-semibold">Hồ sơ và nhu cầu ở ghép</h2>{info ? <dl className="grid gap-3 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="rounded-xl bg-muted/40 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{value || "Chưa bổ sung"}</dd></div>)}</dl> : <p className="text-sm">Chưa có thông tin onboarding đã lưu.</p>}</section>}
      <section className="mt-3"><h2 className="mb-3 font-semibold">Kết quả khảo sát của bạn</h2><QueryState query={saved} />
        {saved.data ? <><QuizResultDetails result={saved.data} /><QueryState query={quiz} /><ol className="mt-4 space-y-3">{quiz.data?.questions.map((question, index) => <li key={question.id} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{index + 1}. {question.text}</p><p className="mt-2 text-teal">Đã chọn: {question.options.find(option => option.id === saved.data!.answers[question.id])?.text ?? "Không có đáp án đã lưu"}</p></li>)}</ol></> : !saved.isPending && !saved.isError && <p className="text-sm">Bạn chưa lưu bài khảo sát.</p>}
      </section>
    </DialogContent>
  </Dialog>;
}
