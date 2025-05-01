// Update the fetchConversations function
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
          user:profiles(
            full_name
          )
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
      .select('id, email')
      .in('id', userIds);
      
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
    
    setConversations(conversationsWithEmails || []);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};

// Update the fetchUsers function
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
      .select('id, email')
      .in('id', profilesData?.map(p => p.id) || []);
      
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

export default fetchUsers