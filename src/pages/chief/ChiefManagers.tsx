// Update the fetchStaff function
const fetchStaff = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    // Fetch managers
    const { data: managersData, error: managersError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        role,
        phone_number,
        created_at
      `)
      .eq('role', 'manager');
      
    if (managersError) throw managersError;
    
    // Fetch manager emails
    const { data: managerEmails, error: emailsError } = await supabase
      .from('users')
      .select('id, email')
      .in('id', managersData?.map(m => m.id) || []);
      
    if (emailsError) throw emailsError;
    
    // Fetch assigned vendors count
    const { data: vendorCounts, error: vendorsError } = await supabase
      .from('manager_assignments')
      .select('manager_id, count')
      .in('manager_id', managersData?.map(m => m.id) || [])
      .select('count(*)')
      .group('manager_id');
      
    if (vendorsError) throw vendorsError;
    
    // Fetch manager commissions
    const { data: managerCommissions, error: commissionsError } = await supabase
      .from('manager_commissions')
      .select('manager_id, amount')
      .in('manager_id', managersData?.map(m => m.id) || []);
      
    if (commissionsError) throw commissionsError;
    
    // Create lookup maps
    const emailMap = new Map(managerEmails?.map(u => [u.id, u.email]));
    const vendorCountMap = new Map(vendorCounts?.map(v => [v.manager_id, parseInt(v.count)]));
    const commissionMap = managerCommissions?.reduce((acc, curr) => {
      acc.set(curr.manager_id, (acc.get(curr.manager_id) || 0) + curr.amount);
      return acc;
    }, new Map());
    
    // Combine all data
    const processedManagers = managersData?.map(manager => ({
      ...manager,
      email: emailMap.get(manager.id) || 'N/A',
      assigned_vendors: vendorCountMap.get(manager.id) || 0,
      total_commissions: commissionMap?.get(manager.id) || 0
    }));
    
    setManagers(processedManagers || []);
    
    // Fetch coordinators with similar approach
    const { data: coordinatorsData, error: coordinatorsError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        role,
        phone_number,
        created_at
      `)
      .eq('role', 'coordinator');
      
    if (coordinatorsError) throw coordinatorsError;
    
    // Fetch coordinator emails
    const { data: coordinatorEmails, error: coordEmailsError } = await supabase
      .from('users')
      .select('id, email')
      .in('id', coordinatorsData?.map(c => c.id) || []);
      
    if (coordEmailsError) throw coordEmailsError;
    
    // Fetch coordinator commissions
    const { data: coordinatorCommissions, error: coordCommissionsError } = await supabase
      .from('coordinator_commissions')
      .select('coordinator_id, amount')
      .in('coordinator_id', coordinatorsData?.map(c => c.id) || []);
      
    if (coordCommissionsError) throw coordCommissionsError;
    
    // Create lookup maps for coordinators
    const coordEmailMap = new Map(coordinatorEmails?.map(u => [u.id, u.email]));
    const coordCommissionMap = coordinatorCommissions?.reduce((acc, curr) => {
      acc.set(curr.coordinator_id, (acc.get(curr.coordinator_id) || 0) + curr.amount);
      return acc;
    }, new Map());
    
    // Combine coordinator data
    const processedCoordinators = coordinatorsData?.map(coordinator => ({
      ...coordinator,
      email: coordEmailMap.get(coordinator.id) || 'N/A',
      managed_managers: 0, // This would need a separate query to calculate
      total_commissions: coordCommissionMap?.get(coordinator.id) || 0
    }));
    
    setCoordinators(processedCoordinators || []);
    
  } catch (error: any) {
    console.error('Error fetching staff:', error);
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};

export default fetchStaff