export type ConversationType = 'direct' | 'group';
export type ParticipantRole = 'owner' | 'admin' | 'member';
export type MessageType = 'text' | 'system' | 'order_confirmation' | 'announcement' | 'promotion';
export type MessageStatus = 'delivered' | 'read';

export interface Conversation {
  id: string;
  title: string | null;
  type: ConversationType;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  last_message?: Message;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  created_at: string;
  profile?: {
    full_name: string;
    role: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  metadata?: {
    order_id?: string;
    announcement_id?: string;
    promotion_id?: string;
    expires_at?: string;
    action_url?: string;
  };
  created_at: string;
  updated_at: string;
  sender?: {
    full_name: string;
    role: string;
  };
  status?: MessageStatus[];
}

export interface MessageStatusType {
  id: string;
  message_id: string;
  user_id: string;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}