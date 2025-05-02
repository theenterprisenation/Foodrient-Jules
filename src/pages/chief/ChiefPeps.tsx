{/* Update the fetchUsers function */}
const fetchUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email:auth.users(email)
      `)
      .order('full_name');
      
    if (error) throw error;
    
    const processedUsers = data.map(user => ({
      id: user.id,
      full_name: user.full_name || 'Unknown User',
      email: user.email?.[0]?.email || 'N/A'
    }));
    
    setUsers(processedUsers);
  } catch (error: any) {
    console.error('Error fetching users:', error);
  }
};

export default fetchUsers