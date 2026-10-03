export const groupRoleLabel = (role: string) =>
  ({ owner: "Chủ nhóm", manager: "Người quản lý", member: "Thành viên" })[
    role
  ] ?? role;
export const disputeStatusLabel = (status: string) =>
  ({
    open: "Mới tiếp nhận",
    investigating: "Đang hòa giải",
    resolved: "Đã giải quyết",
    dismissed: "Không đủ cơ sở",
  })[status] ?? status;
