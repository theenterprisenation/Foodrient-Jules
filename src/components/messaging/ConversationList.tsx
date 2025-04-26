import React from 'react';
import { format } from 'date-fns';
import { MessageSquare, Users, User } from 'lucide-react';
import type { Conversation } from '../../types/messaging';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors duration-150 ${
              selectedId === conversation.id ? 'bg-yellow-50' : ''
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
                    {conversation.last_message
                      ? format(new Date(conversation.last_message.created_at), 'MMM d, h:mm a')
                      : format(new Date(conversation.created_at), 'MMM d, h:mm a')}
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
        ))}
      </div>
    </div>
  );
};