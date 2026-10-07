export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  // Empty for an image sent without a caption.
  content: string;
  imageUrl: string | null;
  createdAt: string;
  readAt: string | null;
};
export type Conversation = {
  id: string;
  partner: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  lastMessage: Message | null;
  unreadCount: number;
  isBlocked: boolean;
  updatedAt: string;
};
export type OutgoingChatMessage = {
  conversationId: string;
  senderId: string;
  content: string;
};
