import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface GroupBuy {
  id: string;
  name: string;
  image: string;
  location: string;
  members: number;
  timeLeft: string;
  progress: number;
  remaining: number;
}

export const useGroupBuyStats = () => {
  const [activeGroups, setActiveGroups] = useState<GroupBuy[]>([]);
  const [recommendedGroups, setRecommendedGroups] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupStats = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setActiveGroups([]);
          setRecommendedGroups([]);
          return;
        }

        // Fetch active groups user is part of
        const { data: userGroupsData } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        if (userGroupsData && userGroupsData.length > 0) {
          const groupIds = userGroupsData.map(g => g.group_id);
          const { data: groupsData } = await supabase
            .from('groups')
            .select(`
              id,
              name,
              image_url,
              location,
              current_members,
              max_members,
              end_date
            `)
            .in('id', groupIds)
            .gte('end_date', new Date().toISOString());

          const formattedActiveGroups = groupsData?.map(group => ({
            id: group.id,
            name: group.name,
            image: group.image_url || '/images/group-default.png',
            location: group.location,
            members: group.current_members,
            timeLeft: formatTimeLeft(group.end_date),
            progress: Math.round((group.current_members / group.max_members) * 100),
            remaining: group.max_members - group.current_members
          })) || [];

          setActiveGroups(formattedActiveGroups);
        }

        // Fetch recommended groups
        const { data: recommendedData } = await supabase
          .from('groups')
          .select(`
            id,
            name,
            image_url,
            location,
            current_members,
            max_members,
            end_date
          `)
          .gte('end_date', new Date().toISOString())
          .order('current_members', { ascending: false })
          .limit(3);

        const formattedRecommendedGroups = recommendedData?.map(group => ({
          id: group.id,
          name: group.name,
          image: group.image_url || '/images/group-default.png',
          location: group.location,
          members: group.current_members,
          timeLeft: formatTimeLeft(group.end_date),
          progress: Math.round((group.current_members / group.max_members) * 100),
          remaining: group.max_members - group.current_members
        })) || [];

        setRecommendedGroups(formattedRecommendedGroups);
      } catch (err) {
        console.error('Error fetching group stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch group stats');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupStats();
  }, []);

  const formatTimeLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days > 1 ? `${days} days` : 'Less than 1 day';
  };

  return { activeGroups, recommendedGroups, loading, error };
};