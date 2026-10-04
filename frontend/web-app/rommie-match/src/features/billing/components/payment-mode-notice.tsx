export function PaymentModeNotice({ provider }: { provider: string | undefined }) {
  if (provider !== "mock") return null;
  return <p role="note" className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Mock — giao dịch giả lập.</strong> Trạng thái này dùng để kiểm thử, không xác nhận thu hoặc hoàn tiền thật.</p>;
}
