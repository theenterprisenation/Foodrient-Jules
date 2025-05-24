import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Types for better clarity and safety
interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  role: string;
}

interface EnrichedParticipant {
  id: string;
  user_id: string;
  role: string;
  user: {
    full_name: string;
    email: string;
  };
}

interface Conversation {
  id: string;
  updated_at: string;
  participant_ids: string[];
}

interface EnrichedConversation {
  id: string;
  updated_at: string;
  participants: EnrichedParticipant[];
}

const ChiefMessaging = () => {
  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch conversations and participants
  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Fetch conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, updated_at')
        .order('updated_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Step 2: For each conversation, fetch its participants
      const conversationPromises = conversationsData.map(async (conv) => {
        const { data: participantsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('id, user_id, role')
          .eq('conversation_id', conv.id);

        if (participantsError) throw participantsError;

        return {
          id: conv.id,
          updated_at: conv.updated_at,
          participants: participantsData || [],
        };
      });

      const conversationsWithParticipants = await Promise.all(conversationPromises);

      // Step 3: Extract all unique user IDs from all conversations
      const userIds = [...new Set(conversationsWithParticipants.flatMap(conv =>
        conv.participants.map(p => p.user_id)
      ))];

      if (userIds.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Step 4: Fetch profiles with email and full_name
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create map for lookup
      const profileMap = new Map(profilesData?.map(p => [p.id, {
        full_name: p.full_name || 'Unknown User',
        email: p.email || 'N/A'
      }]) || []);

      // Step 5: Combine conversation data with enriched participant info
      const enrichedConversations = conversationsWithParticipants.map(conv => ({
        ...conv,
        participants: conv.participants.map(participant => ({
          ...participant,
          user: profileMap.get(participant.user_id) || {
            full_name: 'Unknown User',
            email: 'N/A'
          }
        }))
      }));

      setConversations(enrichedConversations);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-red-800">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Messaging Dashboard</h1>

      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Conversations</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participants
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conversations.map((conv) => (
                <tr key={conv.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conv.id}</td>
                  <td className="px-6 py-4">
                    {conv.participants.map((p, idx) => (
                      <div key={idx} className="text-sm text-gray-500">
                        {p.user.full_name} ({p.user.email})
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChiefMessaging;