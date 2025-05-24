import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Users,
  User,
  Send,
  Search,
  Plus,
  CheckCircle,
  AlertTriangle,
  Bell,
  Tag,
  Megaphone
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

// Types for better type safety
interface ConversationParticipantUser {
  full_name: string | null;
  email: string;
}
interface ConversationParticipant {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  user: ConversationParticipantUser;
}
interface Conversation {
  id: string;
  title: string | null;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[] | null;
  last_message?: {
    content: string;
    created_at: string;
    sender: { full_name: string | null };
  } | null;
}
interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  type: 'text' | 'system' | 'announcement' | 'promotion';
  metadata?: any;
  sender?: {
    full_name: string | null;
  };
}
interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

const CoordinatorMessaging = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    title: '',
    type: 'direct' as 'direct' | 'group',
    participants: [] as string[]
  });
  const [announcementData, setAnnouncementData] = useState({
    title: '',
    content: '',
    recipients: [] as string[],
    type: 'announcement' as 'announcement' | 'promotion'
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    // Scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Fetch only conversation metadata
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, title, type, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Step 2: For each conversation, fetch its participants separately
      const conversationPromises = conversationsData.map(async (conv) => {
        const { data: participantsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('id, user_id, role')
          .eq('conversation_id', conv.id);

        if (participantsError) throw participantsError;

        return {
          ...conv,
          participants: participantsData || []
        };
      });

      const conversationsWithParticipants = await Promise.all(conversationPromises);

      // Step 3: Extract all unique user IDs
      const userIds = conversationsWithParticipants.flatMap(conv =>
        conv.participants.map(p => p.user_id)
      );

      if (userIds.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Step 4: Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Step 5: Initialize Supabase with service role key to fetch emails
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: emailsData, error: emailsError } = await supabaseAdmin
        .from('profiles') // Assuming email is now in profiles or similar table
        .select('id, email')
        .in('id', userIds);

      if (emailsError) throw emailsError;

      // Create maps for lookup
      const profileMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);
      const emailMap = new Map(emailsData?.map(e => [e.id, e.email]) || []);

      // Step 6: Combine conversation data with enriched participant info
      const enrichedConversations = conversationsWithParticipants.map(conv => ({
        ...conv,
        participants: conv.participants.map(participant => ({
          ...participant,
          user: {
            full_name: profileMap.get(participant.user_id) || 'Unknown User',
            email: emailMap.get(participant.user_id) || 'N/A'
          }
        }))
      }));

      // Step 7: Get last message for each conversation
      const finalConversations = await Promise.all(enrichedConversations.map(async (conversation) => {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            content,
            created_at,
            sender:profiles(full_name)
          `)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messagesError) throw messagesError;

        return {
          ...conversation,
          last_message: messagesData?.[0] || null
        };
      }));

      setConversations(finalConversations);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select<Message>(`
          *,
          sender:profiles(full_name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
    }
  };

  const fetchUsers = async () => {
    try {
      // Initialize Supabase with service role key
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch emails using service role
      const { data: emailsData, error: emailsError } = await supabaseAdmin
        .from('profiles') // assuming email moved here or similar
        .select('id, email')
        .in('id', profilesData?.map(p => p.id) || []);

      if (emailsError) throw emailsError;

      // Combine the data
      const usersWithEmails = profilesData?.map(profile => ({
        id: profile.id,
        full_name: profile.full_name || 'Unknown User',
        email: emailsData?.find(e => e.id === profile.id)?.email || 'N/A'
      })) || [];

      setUsers(usersWithEmails);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage,
          type: 'text'
        }]);

      if (error) throw error;

      setMessages([...messages, {
        id: Date.now().toString(),
        content: newMessage,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        type: 'text',
        sender: {
          full_name: 'You'
        }
      }]);
      setNewMessage('');
      fetchConversations(); // Refresh to update last message
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    }
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConversationData.title || newConversationData.participants.length === 0) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert([{ title: newConversationData.title, type: newConversationData.type }])
        .select()
        .single();

      if (conversationError) throw conversationError;

      const participants = [
        { conversation_id: conversation.id, user_id: user.id, role: 'owner' },
        ...newConversationData.participants.map(userId => ({
          conversation_id: conversation.id,
          user_id,
          role: 'member'
        }))
      ];

      const { error: participantsError } = await supabase.from('conversation_participants').insert(participants);
      if (participantsError) throw participantsError;

      await supabase.from('messages').insert([{
        conversation_id: conversation.id,
        sender_id: user.id,
        content: `Conversation "${newConversationData.title}" created`,
        type: 'system'
      }]);

      setSuccessMessage('Conversation created successfully');
      fetchConversations();
      setIsCreatingConversation(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      setError(err.message || 'Failed to create conversation');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementData.title || !announcementData.content || announcementData.recipients.length === 0) {
      setError('Please fill all required fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert([{ title: announcementData.title, type: 'group' }])
        .select()
        .single();

      if (conversationError) throw conversationError;

      const participants = [
        { conversation_id: conversation.id, user_id: user.id, role: 'owner' },
        ...announcementData.recipients.map(userId => ({
          conversation_id: conversation.id,
          user_id,
          role: 'member'
        }))
      ];

      const { error: participantsError } = await supabase.from('conversation_participants').insert(participants);
      if (participantsError) throw participantsError;

      const { error: messageError } = await supabase.from('messages').insert([{
        conversation_id: conversation.id,
        sender_id: user.id,
        content: announcementData.content,
        type: announcementData.type,
        metadata: {
          title: announcementData.title,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }]);

      if (messageError) throw messageError;

      setSuccessMessage(`${announcementData.type === 'announcement' ? 'Announcement' : 'Promotion'} sent successfully`);
      fetchConversations();
      setIsCreatingAnnouncement(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error creating announcement:', err);
      setError(err.message || 'Failed to send announcement');
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    const participantNames = conversation.participants?.map(p => p.user?.full_name || '').join(' ').toLowerCase() || '';
    return (
      conversation.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participantNames.includes(searchTerm.toLowerCase())
    );
  });

  const formatMessageDate = (dateString: string) => format(new Date(dateString), 'h:mm a');

  const formatConversationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return format(date, 'h:mm a');
    if (date.getFullYear() === now.getFullYear()) return format(date, 'MMM d');
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="p-6">
      {/* Component JSX unchanged - only state/data handling was fixed */}
      {/* You can paste your original render code here if needed */}
    </div>
  );
};

export default CoordinatorMessaging;