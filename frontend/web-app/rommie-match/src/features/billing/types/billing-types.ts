export type Subscription = {
  tier: string;
  isPremium: boolean;
  subscriptionId: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type Checkout = {
  paymentId: string;
  planCode: string;
  amount: number;
  currency: string;
  paymentUrl: string;
  expiresAt: string;
};

export type Payment = {
  id: string;
  planCode: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  refundableUntil: string | null;
  refundRequest: {
    id: string;
    status: string;
    resolutionNote: string | null;
  } | null;
};
export type Plan = {
  code: string;
  name: string;
  tier: string;
  price: number;
  currency: string;
  durationMonths: number;
  features: string[];
};
