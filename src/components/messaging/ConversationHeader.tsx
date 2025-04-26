import React from 'react';
import { Users, User, MoreVertical } from 'lucide-react';
import type { Conversation } from '../../types/messaging';

interface ConversationHeaderProps {
  conversation: Conversation;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({ conversation }) => {
  return (
    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {conversation.type === 'direct' ? (
            <User className="h-8 w-8 text-gray-400" />
          ) : (
            <Users className="h-8 w-8 text-gray-400" />
          )}
        </div>
        <div className="ml-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {conversation.title || 'Untitled Conversation'}
          </h2>
          <p className="text-sm text-gray-500">
            {conversation.participants?.length || 0} participants
          </p>
        </div>
      </div>
      <button className="p-2 hover:bg-gray-100 rounded-full">
        <MoreVertical className="h-5 w-5 text-gray-500" />
      </button>
    </div>
  );
};