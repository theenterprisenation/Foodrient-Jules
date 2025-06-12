import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Users, 
  Send, 
  Search, 
  Plus, 
  CheckCircle, 
  AlertTriangle,
  Bell,
  Shield,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Conversation {
  id: string;
  title: string | null;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  participants: {
    id: string;
    user_id: string;
  role: 'owner' | 'admin' | 'member';
    // role: 'owner' | 'admin' | 'chief' | 'coordinator' | 'manager' | 'vendor' | 'customer';
    user: {
      full_name: string;
      email: string;
    };
  }[];
  last_message?: {
    content: string;
    created_at: string;
    sender: {
      full_name: string;
    };
  };
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  type: 'text' | 'system' | 'announcement' | 'promotion';
  metadata?: any;
  sender?: {
    full_name: string;
    role?: string;
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
}

const ChiefInbox = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    title: '',
    type: 'direct' as 'direct' | 'group',
    participants: [] as string[]
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (conversationsError) throw conversationsError;
      if (!conversationsData) return;

      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('*');

      if (participantsError) throw participantsError;

      const participantUserIds = participantsData?.map(p => p.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', participantUserIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(profile => [profile.id, profile]));

      const enrichedConversations = conversationsData.map(conversation => {
        const conversationParticipants = participantsData?.filter(p => p.conversation_id === conversation.id) || [];
        
        const enrichedParticipants = conversationParticipants.map(participant => {
          const userProfile = profilesMap.get(participant.user_id);
          return {
            ...participant,
            user: {
              full_name: userProfile?.full_name || 'Unknown',
              email: userProfile?.email || 'N/A',
              role: userProfile?.role || 'member'
            }
          };
        });

        return {
          ...conversation,
          participants: enrichedParticipants
        };
      });

      const conversationsWithLastMessage = await Promise.all(
        enrichedConversations.map(async conversation => {
          const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messagesError) throw messagesError;

          const lastMessage = messagesData?.[0];
          if (!lastMessage) return conversation;

          const senderProfile = profilesMap.get(lastMessage.sender_id);
          return {
            ...conversation,
            last_message: {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              sender: {
                full_name: senderProfile?.full_name || 'Unknown'
              }
            }
          };
        })
      );

      setConversations(conversationsWithLastMessage);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      if (!messagesData) return;

      const senderIds = messagesData.map(m => m.sender_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', senderIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(profile => [profile.id, profile]));

      const enrichedMessages = messagesData.map(message => ({
        ...message,
        sender: {
          full_name: profilesMap.get(message.sender_id)?.full_name || 'Unknown',
          role: profilesMap.get(message.sender_id)?.role || 'member'
        }
      }));

      setMessages(enrichedMessages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError(error.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');

      if (profilesError) throw profilesError;

      setUsers(profilesData || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message);
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
          full_name: 'You (Chief)',
          role: 'chief'
        }
      }]);
      setNewMessage('');
      fetchConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message);
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
        .insert([{
          title: newConversationData.title,
          type: newConversationData.type
        }])
        .select()
        .single();
      if (conversationError) throw conversationError;

      const participants = [
        {
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'owner' as const
        },
        ...newConversationData.participants.map(userId => ({
          conversation_id: conversation.id,
          user_id: userId,
          role: 'member' as const
        }))
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);
      if (participantsError) throw participantsError;

      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation.id,
          sender_id: user.id,
          content: `Conversation "${newConversationData.title}" created by Chief`,
          type: 'system'
        }]);
      if (messageError) throw messageError;

      setSuccessMessage('Conversation created successfully');
      fetchConversations();
      setIsCreatingConversation(false);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      setError(error.message);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return;
    
    try {
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);
      if (messagesError) throw messagesError;

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId);
      if (participantsError) throw participantsError;

      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      if (conversationError) throw conversationError;

      setSuccessMessage('Conversation deleted successfully');
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      fetchConversations();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      setError(error.message);
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    const participantNames = conversation.participants?.map(p => p.user?.full_name).join(' ');
    const participantEmails = conversation.participants?.map(p => p.user?.email).join(' ');
    return (
      conversation.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participantNames?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participantEmails?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatMessageDate = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const formatConversationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }

    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    }

    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-1/4 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Chief Inbox</h2>
            <button 
              onClick={() => setIsAdminView(!isAdminView)}
              className="p-1 rounded-full hover:bg-gray-100"
              title={isAdminView ? 'Switch to regular view' : 'Switch to admin view'}
            >
              <Shield size={18} className={isAdminView ? 'text-blue-600' : 'text-gray-500'} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => setIsCreatingConversation(true)}
          >
            <Plus size={16} />
            New Conversation
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : error ? (
            <div className="p-4 text-red-500">{error}</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations found</div>
          ) : (
            filteredConversations.map(conversation => (
              <div
                key={conversation.id}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">
                    {conversation.title || conversation.participants.map(p => p.user.full_name).join(', ')}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {conversation.last_message && formatConversationDate(conversation.last_message.created_at)}
                  </span>
                </div>
                {conversation.last_message && (
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    <span className="font-medium">
                      {conversation.last_message.sender.full_name}:
                    </span> {conversation.last_message.content}
                  </p>
                )}
                {isAdminView && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conversation.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete conversation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {selectedConversation.title || selectedConversation.participants.map(p => p.user.full_name).join(', ')}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedConversation.participants.length} participant
                  {selectedConversation.participants.length !== 1 ? 's' : ''}
                  {isAdminView && (
                    <>
                      {' • '}
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        Conversation ID: {selectedConversation.id}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-full hover:bg-gray-100">
                  <Users size={20} />
                </button>
                <button className="p-2 rounded-full hover:bg-gray-100">
                  <Bell size={20} />
                </button>
                {isAdminView && (
                  <button
                    onClick={() => handleDeleteConversation(selectedConversation.id)}
                    className="p-2 rounded-full hover:bg-red-100 text-red-500"
                    title="Delete conversation"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`mb-4 ${message.sender?.full_name === 'You (Chief)' ? 'text-right' : ''}`}
                  >
                    <div
                      className={`inline-block p-3 rounded-lg max-w-xs lg:max-w-md ${message.sender?.full_name === 'You (Chief)' ? 'bg-blue-500 text-white' : message.sender?.role === 'admin' ? 'bg-purple-100 border border-purple-200' : 'bg-white border border-gray-200'}`}
                    >
                      {message.sender?.full_name !== 'You (Chief)' && (
                        <p className="font-medium text-sm mb-1">
                          {message.sender?.full_name}
                          {message.sender?.role === 'admin' && (
                            <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                        </p>
                      )}
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${message.sender?.full_name === 'You (Chief)' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatMessageDate(message.created_at)}
                        {isAdminView && (
                          <span className="ml-2">• Message ID: {message.id}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
                  onClick={handleSendMessage}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Select a conversation</h3>
              <p className="text-gray-500 mt-1">Or create a new one to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {isCreatingConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">New Conversation</h3>
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="mb-4 p-2 bg-green-100 text-green-700 rounded-md flex items-center gap-2">
                <CheckCircle size={16} />
                {successMessage}
              </div>
            )}

            <form onSubmit={handleCreateConversation}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newConversationData.title}
                  onChange={(e) => setNewConversationData({
                    ...newConversationData,
                    title: e.target.value
                  })}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newConversationData.type}
                  onChange={(e) => setNewConversationData({
                    ...newConversationData,
                    type: e.target.value as 'direct' | 'group'
                  })}
                >
                  <option value="direct">Direct Message</option>
                  <option value="group">Group Chat</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participants
                </label>
                <select
                  multiple
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 h-auto min-h-[100px]"
                  value={newConversationData.participants}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    setNewConversationData({
                      ...newConversationData,
                      participants: options
                    });
                  }}
                  required
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email}) {user.role === 'admin' && '(Admin)'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsCreatingConversation(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiefInbox;