export const bookingStatusAction = (status: string) =>
  status === "confirmed" || status === "completed"
    ? ("success" as const)
    : status === "cancelled"
      ? ("muted" as const)
      : ("warning" as const);
