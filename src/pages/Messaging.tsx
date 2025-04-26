import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useMessagingStore } from '../store/messagingStore';
import { ConversationList } from '../components/messaging/ConversationList';
import { MessageList } from '../components/messaging/MessageList';
import { MessageInput } from '../components/messaging/MessageInput';
import { ConversationHeader } from '../components/messaging/ConversationHeader';
import type { Conversation } from '../types/messaging';

const Messaging = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    subscribeToMessages,
    unsubscribeFromMessages
  } = useMessagingStore();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isNewConversation, setIsNewConversation] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchConversations();
  }, [user, navigate, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      subscribeToMessages(selectedConversation.id);
    }
    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedConversation, fetchMessages, subscribeToMessages, unsubscribeFromMessages]);

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setIsNewConversation(false);
  };

  const handleSendMessage = async (content: string) => {
    if (selectedConversation) {
      await sendMessage(selectedConversation.id, content);
    }
  };

  const handleNewConversation = () => {
    setIsNewConversation(true);
    setSelectedConversation(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <button
            onClick={handleNewConversation}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Conversation
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id || null}
              onSelect={handleConversationSelect}
            />
          </div>

          <div className="lg:col-span-2">
            {selectedConversation ? (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col h-[600px]">
                <ConversationHeader conversation={selectedConversation} />
                <MessageList
                  messages={messages}
                  onMarkAsRead={markAsRead}
                />
                <MessageInput onSend={handleSendMessage} />
              </div>
            ) : isNewConversation ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Start a New Conversation
                </h2>
                {/* Add new conversation form here */}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                Select a conversation or start a new one
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messaging;