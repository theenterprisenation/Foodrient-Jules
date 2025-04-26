import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { 
  Conversation, 
  Message, 
  ConversationType,
  ParticipantRole,
  MessageType
} from '../types/messaging';

interface MessagingState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  createConversation: (title: string, type: ConversationType, participantIds: string[]) => Promise<string>;
  sendMessage: (conversationId: string, content: string, type?: MessageType, metadata?: any) => Promise<void>;
  sendBulkMessage: (userIds: string[], content: string, type: MessageType, metadata?: any) => Promise<void>;
  sendOrderConfirmation: (orderId: string, userId: string, orderDetails: any) => Promise<void>;
  sendAnnouncement: (title: string, content: string, userIds: string[], metadata?: any) => Promise<void>;
  sendPromotion: (title: string, content: string, userIds: string[], metadata?: any) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  subscribeToMessages: (conversationId: string) => void;
  unsubscribeFromMessages: () => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => {
  let messageSubscription: any = null;

  return {
    conversations: [],
    currentConversation: null,
    messages: [],
    isLoading: false,
    error: null,

    fetchConversations: async () => {
      set({ isLoading: true, error: null });
      try {
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select(`
            *,
            participants:conversation_participants(
              *,
              profile:profiles(full_name, role)
            ),
            last_message:messages(
              *,
              sender:profiles(full_name, role)
            )
          `)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        // Get the latest message for each conversation
        const conversationsWithLastMessage = conversations?.map(conv => ({
          ...conv,
          last_message: conv.last_message?.[0]
        }));

        set({ conversations: conversationsWithLastMessage || [] });
      } catch (error: any) {
        console.error('Error fetching conversations:', error);
        set({ error: error.message });
      } finally {
        set({ isLoading: false });
      }
    },

    fetchMessages: async (conversationId: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data: messages, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles(full_name, role),
            status:message_status(status)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        set({ messages: messages || [] });

        // Also fetch and set current conversation details
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select(`
            *,
            participants:conversation_participants(
              *,
              profile:profiles(full_name, role)
            )
          `)
          .eq('id', conversationId)
          .single();

        if (convError) throw convError;
        set({ currentConversation: conversation });
      } catch (error: any) {
        console.error('Error fetching messages:', error);
        set({ error: error.message });
      } finally {
        set({ isLoading: false });
      }
    },

    createConversation: async (title: string, type: ConversationType, participantIds: string[]) => {
      set({ isLoading: true, error: null });
      try {
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({ title, type })
          .select()
          .single();

        if (convError) throw convError;

        // Add participants
        const participants = participantIds.map(userId => ({
          conversation_id: conversation.id,
          user_id: userId,
          role: 'member' as ParticipantRole
        }));

        // Add current user as owner
        participants.push({
          conversation_id: conversation.id,
          user_id: (await supabase.auth.getUser()).data.user?.id!,
          role: 'owner' as ParticipantRole
        });

        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert(participants);

        if (partError) throw partError;

        await get().fetchConversations();
        return conversation.id;
      } catch (error: any) {
        console.error('Error creating conversation:', error);
        set({ error: error.message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    sendMessage: async (conversationId: string, content: string, type: MessageType = 'text', metadata?: any) => {
      set({ isLoading: true, error: null });
      try {
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            content,
            type,
            metadata
          })
          .select(`
            *,
            sender:profiles(full_name, role)
          `)
          .single();

        if (error) throw error;

        set(state => ({
          messages: [...state.messages, message]
        }));
      } catch (error: any) {
        console.error('Error sending message:', error);
        set({ error: error.message });
      } finally {
        set({ isLoading: false });
      }
    },

    sendBulkMessage: async (userIds: string[], content: string, type: MessageType, metadata?: any) => {
      set({ isLoading: true, error: null });
      try {
        // Create a group conversation for the bulk message
        const conversationId = await get().createConversation(
          type === 'announcement' ? 'Announcement' : 'Promotion',
          'group',
          userIds
        );

        // Send the message to the group
        await get().sendMessage(conversationId, content, type, metadata);
      } catch (error: any) {
        console.error('Error sending bulk message:', error);
        set({ error: error.message });
      } finally {
        set({ isLoading: false });
      }
    },

    sendOrderConfirmation: async (orderId: string, userId: string, orderDetails: any) => {
      try {
        // Create a direct conversation for the order confirmation
        const conversationId = await get().createConversation(
          `Order #${orderId}`,
          'direct',
          [userId]
        );

        // Prepare the order confirmation message
        const content = `
          Thank you for your order #${orderId}!
          
          Order Details:
          ${orderDetails.items.map((item: any) => 
            `- ${item.quantity}x ${item.name} (₦${item.price.toLocaleString()})`
          ).join('\n')}
          
          Total: ₦${orderDetails.total.toLocaleString()}
          
          We'll notify you when your order is ready for delivery.
        `;

        // Send the confirmation message
        await get().sendMessage(conversationId, content, 'order_confirmation', {
          order_id: orderId,
          total: orderDetails.total,
          items: orderDetails.items
        });
      } catch (error: any) {
        console.error('Error sending order confirmation:', error);
        set({ error: error.message });
      }
    },

    sendAnnouncement: async (title: string, content: string, userIds: string[], metadata?: any) => {
      try {
        await get().sendBulkMessage(userIds, content, 'announcement', {
          ...metadata,
          title,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
        });
      } catch (error: any) {
        console.error('Error sending announcement:', error);
        set({ error: error.message });
      }
    },

    sendPromotion: async (title: string, content: string, userIds: string[], metadata?: any) => {
      try {
        await get().sendBulkMessage(userIds, content, 'promotion', {
          ...metadata,
          title,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
        });
      } catch (error: any) {
        console.error('Error sending promotion:', error);
        set({ error: error.message });
      }
    },

    markAsRead: async (messageId: string) => {
      try {
        const { error } = await supabase
          .from('message_status')
          .update({ status: 'read' })
          .eq('message_id', messageId)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id!);

        if (error) throw error;
      } catch (error: any) {
        console.error('Error marking message as read:', error);
      }
    },

    subscribeToMessages: (conversationId: string) => {
      messageSubscription = supabase
        .channel(`messages:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          async (payload) => {
            const { data: message } = await supabase
              .from('messages')
              .select(`
                *,
                sender:profiles(full_name, role)
              `)
              .eq('id', payload.new.id)
              .single();

            if (message) {
              set(state => ({
                messages: [...state.messages, message]
              }));
            }
          }
        )
        .subscribe();
    },

    unsubscribeFromMessages: () => {
      if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
        messageSubscription = null;
      }
    }
  };
});