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
  Bell
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
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

const ManagerMessaging = () => {
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
      // First, fetch conversations with participants
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            id,
            user_id,
            role,
            user:profiles(full_name)
          )
        `)
        .order('updated_at', { ascending: false });
        
      if (conversationsError) throw conversationsError;
      
      // Then, fetch emails for participants
      const userIds = conversationsData?.flatMap(conv => 
        conv.participants?.map(p => p.user_id)
      ) || [];
      
      const { data: emailsData, error: emailsError } = await supabase
        .from('users')
        .select('id, email');
        
      if (emailsError) throw emailsError;
      
      // Map emails to users
      const emailMap = new Map(emailsData?.map(u => [u.id, u.email]));
      
      // Combine the data
      const conversationsWithEmails = conversationsData?.map(conversation => ({
        ...conversation,
        participants: conversation.participants?.map(participant => ({
          ...participant,
          user: {
            ...participant.user,
            email: emailMap.get(participant.user_id) || 'N/A'
          }
        }))
      }));
      
      // Get last message for each conversation
      const conversationsWithLastMessage = await Promise.all((conversationsWithEmails || []).map(async (conversation) => {
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
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(full_name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError(error.message);
    }
  };

  const fetchUsers = async () => {
    try {
      // First, fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
        
      if (profilesError) throw profilesError;
      
      // Then, fetch emails
      const { data: emailsData, error: emailsError } = await supabase
        .from('users')
        .select('id, email');
        
      if (emailsError) throw emailsError;
      
      // Combine the data
      const usersWithEmails = profilesData?.map(profile => ({
        id: profile.id,
        full_name: profile.full_name || 'Unknown User',
        email: emailsData?.find(e => e.id === profile.id)?.email || 'N/A'
      }));
      
      setUsers(usersWithEmails || []);
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
      
      // Optimistically add message to UI
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
      fetchConversations(); // Refresh conversations to update last message
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
      
      // Create conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert([{
          title: newConversationData.title,
          type: newConversationData.type
        }])
        .select()
        .single();
        
      if (conversationError) throw conversationError;
      
      // Add participants
      const participants = [
        // Add current user as owner
        {
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'owner' as const
        },
        // Add selected participants as members
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
      
      // Add initial system message
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation.id,
          sender_id: user.id,
          content: `Conversation "${newConversationData.title}" created`,
          type: 'system'
        }]);
        
      if (messageError) throw messageError;
      
      setSuccessMessage('Conversation created successfully');
      fetchConversations();
      setIsCreatingConversation(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error creating conversation:', error);
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
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    }
    
    // Otherwise show full date
    return format(date, 'MMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Messaging</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={() => setIsCreatingConversation(true)}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Conversation
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center text-green-800">
          <CheckCircle className="h-5 w-5 mr-2" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations found
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors duration-150 ${
                    selectedConversation?.id === conversation.id ? 'bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {conversation.type === 'direct' ? (
                        <User className="h-10 w-10 text-gray-400" />
                      ) : (
                        <Users className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.title || 'Untitled Conversation'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatConversationDate(conversation.updated_at)}
                        </p>
                      </div>
                      <div className="mt-1">
                        {conversation.last_message ? (
                          <p className="text-sm text-gray-600 truncate">
                            <span className="font-medium">
                              {conversation.last_message.sender?.full_name}:
                            </span>{' '}
                            {conversation.last_message.content}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No messages yet</p>
                        )}
                      </div>
                      <div className="mt-1 flex items-center">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        <span className="ml-1 text-xs text-gray-500">
                          {conversation.participants?.length || 0} participants
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col h-[600px]">
              {/* Conversation Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {selectedConversation.type === 'direct' ? (
                      <User className="h-8 w-8 text-gray-400" />
                    ) : (
                      <Users className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedConversation.title || 'Untitled Conversation'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.participants?.length || 0} participants
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isOwnMessage = message.sender_id === supabase.auth.getUser().data.user?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.type === 'system'
                            ? 'bg-gray-100 text-gray-700 mx-auto'
                            : message.type === 'announcement'
                            ? 'bg-blue-100 text-blue-800'
                            : message.type === 'promotion'
                            ? 'bg-green-100 text-green-800'
                            : isOwnMessage
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.type === 'announcement' && (
                          <div className="flex items-center mb-1 text-blue-800">
                            <Bell className="h-4 w-4 mr-1" />
                            <span className="font-medium text-xs">ANNOUNCEMENT</span>
                          </div>
                        )}
                        
                        {!isOwnMessage && message.type !== 'system' && (
                          <p className="text-xs font-medium mb-1">
                            {message.sender?.full_name || 'Unknown User'}
                          </p>
                        )}
                        
                        <p className="text-sm">{message.content}</p>
                        
                        <div className="flex items-center justify-end mt-1 space-x-1">
                          <span className="text-xs opacity-75">
                            {formatMessageDate(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center h-[600px] flex items-center justify-center">
              <div>
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a conversation or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Conversation Modal */}
      {isCreatingConversation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create New Conversation
            </h3>
            <form onSubmit={handleCreateConversation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Conversation Title</label>
                <input
                  type="text"
                  value={newConversationData.title}
                  onChange={(e) => setNewConversationData({ ...newConversationData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Conversation Type</label>
                <select
                  value={newConversationData.type}
                  onChange={(e) => setNewConversationData({ 
                    ...newConversationData, 
                    type: e.target.value as 'direct' | 'group' 
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                >
                  <option value="direct">Direct</option>
                  <option value="group">Group</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Participants</label>
                <select
                  multiple
                  value={newConversationData.participants}
                  onChange={(e) => {
                    const options = e.target.options;
                    const selectedValues = [];
                    for (let i = 0; i < options.length; i++) {
                      if (options[i].selected) {
                        selectedValues.push(options[i].value);
                      }
                    }
                    setNewConversationData({ ...newConversationData, participants: selectedValues });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  size={5}
                  required
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Hold Ctrl (or Cmd) to select multiple users
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreatingConversation(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Create Conversation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerMessaging;