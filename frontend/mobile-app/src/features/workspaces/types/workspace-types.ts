export type GroupSummary = {
  id: string;
  name: string;
  roomId: string | null;
  memberCount: number;
  myRole: string | null;
  myStatus: string | null;
};
export type Group = {
  id: string;
  name: string;
  roomId: string | null;
  members: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
    status: string;
  }[];
};
export type Dispute = {
  id: string;
  title: string;
  details: string;
  status: string;
  resolutionNote: string | null;
  complainantName: string;
  respondentName: string;
  complainantId: string;
  respondentId: string;
  roomId: string | null;
  groupId: string | null;
  messages?: {
    id: string;
    content: string;
    authorName: string;
    createdAt: string;
  }[];
};
