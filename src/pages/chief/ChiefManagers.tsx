import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Award,
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Manager {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone_number: string;
  created_at: string;
  assigned_vendors: number;
  total_commissions: number;
}

const ChiefManagers = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {   
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

      if (managersError) {
        throw managersError;
      }

      if (!managersData) {
        throw new Error('No managers found');
      }

      // Fetch all manager assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('manager_assignments')
        .select('manager_id');

      if (assignmentsError) {
        throw assignmentsError;
      }

      // Count assignments per manager
      const assignmentCounts = assignments?.reduce((acc: { [key: string]: number }, curr) => {
        acc[curr.manager_id] = (acc[curr.manager_id] || 0) + 1;
        return acc;
      }, {});

      // Fetch all manager commissions
      const { data: commissions, error: commissionsError } = await supabase
        .from('manager_commissions')
        .select('manager_id, amount');

      if (commissionsError) {
        throw commissionsError;
      }

      // Sum commissions per manager
      const commissionSums = commissions?.reduce((acc: { [key: string]: number }, curr) => {
        acc[curr.manager_id] = (acc[curr.manager_id] || 0) + Number(curr.amount);
        return acc;
      }, {});

      // Combine all data
      const processedManagers = managersData.map(manager => ({
        ...manager,
        assigned_vendors: assignmentCounts?.[manager.id] || 0,
        total_commissions: commissionSums?.[manager.id] || 0
      }));

      setManagers(processedManagers);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this manager?')) {
      return;
    }
    
    try {
      // Update user role to customer
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'customer' })
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccessMessage('Manager has been removed successfully');
      fetchManagers();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error removing manager:', error);
      setError(error.message);
    }
  };

  const handleAddManager = () => {
    setSelectedUser({
      full_name: '',
      email: '',
      phone_number: '',
      role: 'manager'
    });
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isAdding) {
        // Find user by email
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('email', selectedUser.email)
          .single();
          
        if (userError && userError.code !== 'PGRST116') {
          throw userError;
        }
        
        if (!userData) {
          throw new Error('User not found. Please ensure the email is registered.');
        }
        
        // Update user role
        const { error } = await supabase
          .from('profiles')
          .update({ 
            role: 'manager',
            full_name: selectedUser.full_name,
            phone_number: selectedUser.phone_number
          })
          .eq('id', userData.id);
          
        if (error) throw error;
        
        setSuccessMessage('User has been assigned as manager successfully');
      } else if (isEditing) {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: selectedUser.full_name,
            phone_number: selectedUser.phone_number
          })
          .eq('id', selectedUser.id);
          
        if (error) throw error;
        
        setSuccessMessage('Manager information updated successfully');
      }
      
      fetchManagers();
      setIsAdding(false);
      setIsEditing(false);
      setSelectedUser(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error managing staff:', error);
      setError(error.message);
    }
  };

  const filteredManagers = managers.filter(manager => 
    manager.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manager.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Manager Management</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search managers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={handleAddManager}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add Manager
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

      {/* Manager Summary */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Manager Assignment Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredManagers.map(manager => (
            <div key={manager.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-800 font-medium">
                    {manager.full_name.charAt(0)}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{manager.full_name}</p>
                  <p className="text-xs text-gray-500">{manager.email}</p>
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-xs text-gray-500">Assigned Vendors</span>
                <span className="text-sm font-medium text-gray-900">{manager.assigned_vendors}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Managers Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Vendors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Commissions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredManagers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No managers found
                  </td>
                </tr>
              ) : (
                filteredManagers.map((manager) => (
                  <tr key={manager.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-800 font-medium">
                            {manager.full_name?.charAt(0) || 'M'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{manager.full_name}</div>
                          <div className="text-sm text-gray-500">{manager.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {manager.phone_number || 'No phone number'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{manager.assigned_vendors}</div>
                      <div className="text-xs text-gray-500">Vendors</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₦{manager.total_commissions.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Lifetime earnings</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(manager)}
                        className="text-yellow-600 hover:text-yellow-900 mr-4"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(manager.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Manager Modal */}
      {(isAdding || isEditing) && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isAdding ? 'Add New Manager' : 'Edit Manager'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={selectedUser.full_name || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>
              
              {isAdding && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={selectedUser.email || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    User must already have an account with this email
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="text"
                  value={selectedUser.phone_number || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, phone_number: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  {isAdding ? 'Add' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performing Manager</h2>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {/* Top Manager */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Top Manager</h3>
                <p className="text-sm text-gray-500">Highest performing manager this month</p>
              </div>
            </div>
            
            {managers.length > 0 ? (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-800 font-medium">
                        {managers[0].full_name?.charAt(0) || 'M'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{managers[0].full_name}</p>
                      <p className="text-xs text-gray-500">{managers[0].email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">₦{managers[0].total_commissions.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{managers[0].assigned_vendors} vendors</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button className="text-sm text-yellow-600 hover:text-yellow-700 flex items-center">
                    View Performance Details
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-4">No managers available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChiefManagers;