import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import type { Message } from '../../types/messaging';
import { useAuthStore } from '../../store/authStore';

interface MessageListProps {
  messages: Message[];
  onMarkAsRead: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onMarkAsRead }) => {
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getMessageStatus = (message: Message) => {
    if (!message.status?.length) return 'sent';
    const allRead = message.status.every(status => status === 'read');
    return allRead ? 'read' : 'delivered';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.sender_id === user?.id;
        const status = getMessageStatus(message);

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                isOwnMessage
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {!isOwnMessage && (
                <p className="text-xs font-medium mb-1">
                  {message.sender?.full_name}
                  <span className="text-gray-500 ml-2">
                    {message.sender?.role}
                  </span>
                </p>
              )}
              <p className="text-sm">{message.content}</p>
              <div className="flex items-center justify-end mt-1 space-x-1">
                <span className="text-xs opacity-75">
                  {format(new Date(message.created_at), 'h:mm a')}
                </span>
                {isOwnMessage && (
                  status === 'read' ? (
                    <CheckCheck className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};