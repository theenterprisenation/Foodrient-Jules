import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { UserRoleEnum, ALL_USER_ROLES } from '../../types/UserRoleEnum';
import { useAuth } from '../../components/AuthProvider'; // Assuming path is correct

interface ManagedUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRoleEnum | null;
}

interface UpdateStatus {
  type: 'success' | 'error';
  message: string;
}

const CustomerManagementPage: React.FC = () => {
  const { user: adminUser } = useAuth(); // Get current admin user details
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State for managing role changes
  const [editingUserRoles, setEditingUserRoles] = useState<{ [userId: string]: UserRoleEnum }>({});
  const [rowLoadingStates, setRowLoadingStates] = useState<{ [userId: string]: boolean }>({});
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  const adminProfile = users.find(u => u.id === adminUser?.id); // Get admin's profile from the fetched list

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_all_customer_profiles');
      if (rpcError) throw new Error(`Failed to fetch customer profiles: ${rpcError.message}`);
      setUsers(data || []);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleSelectChange = (userId: string, newRole: UserRoleEnum) => {
    setEditingUserRoles(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleUpdateRole = async (userIdToUpdate: string) => {
    const newRole = editingUserRoles[userIdToUpdate];
    if (!newRole) {
      setUpdateStatus({ type: 'error', message: 'No new role selected.' });
      return;
    }

    setRowLoadingStates(prev => ({ ...prev, [userIdToUpdate]: true }));
    setUpdateStatus(null);

    try {
      const { data: success, error: rpcError } = await supabase.rpc('admin_update_user_role', {
        target_user_id: userIdToUpdate,
        new_role: newRole,
      });

      if (rpcError) throw new Error(rpcError.message);

      if (success) {
        setUpdateStatus({ type: 'success', message: `User role updated successfully to ${newRole}.` });
        // Refresh user list or update locally
        // For simplicity, re-fetch the whole list. For better UX, update locally.
        // Option 1: Re-fetch
        await fetchUsers();
        // Option 2: Update locally (if RPC guarantees success and returns the updated user or similar)
        // setUsers(prevUsers =>
        //   prevUsers.map(u => u.id === userIdToUpdate ? { ...u, role: newRole } : u)
        // );
        setEditingUserRoles(prev => {
            const newState = {...prev};
            delete newState[userIdToUpdate];
            return newState;
        });

      } else {
        // If RPC returns false, it means the update was not permitted by the function's logic
        throw new Error('Failed to update user role. You may not have the required permissions or the operation is disallowed.');
      }
    } catch (e: any) {
      setUpdateStatus({ type: 'error', message: e.message || 'An error occurred while updating the role.' });
    } finally {
      setRowLoadingStates(prev => ({ ...prev, [userIdToUpdate]: false }));
    }
  };

  const filteredUsers = users.filter(user =>
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Customer Management</h1>
      </header>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {updateStatus && (
        <div className={`p-4 mb-4 text-sm rounded-lg ${
          updateStatus.type === 'success'
            ? 'bg-green-100 dark:bg-green-700 text-green-700 dark:text-green-100'
            : 'bg-red-100 dark:bg-red-700 text-red-700 dark:text-red-100'
          }`}
          role="alert"
        >
          <span className="font-medium">{updateStatus.type === 'success' ? 'Success!' : 'Error!'}</span> {updateStatus.message}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
          <p className="ml-4 text-lg text-gray-600 dark:text-gray-300">Loading users...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative shadow-md" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Full Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">New Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === adminUser?.id;
                    const targetUserIsChief = user.role === 'chief';
                    const adminIsCoordinator = adminProfile?.role === 'coordinator';
                    const disableRoleChange = isSelf || (adminIsCoordinator && targetUserIsChief);
                    const selectedRoleForUser = editingUserRoles[user.id] || user.role;


                    return (
                      <tr key={user.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.full_name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'chief' ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100' :
                            user.role === 'coordinator' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' :
                            user.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100' :
                            user.role === 'vendor' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' :
                            user.role === 'customer' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-100' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                          }`}>
                            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {isSelf ? (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Cannot change own role</span>
                          ) : (adminIsCoordinator && targetUserIsChief) ? (
                             <span className="text-xs text-gray-400 dark:text-gray-500">Coordinator cannot change Chief</span>
                          ) : (
                            <select
                              value={selectedRoleForUser || ''}
                              onChange={(e) => handleRoleSelectChange(user.id, e.target.value as UserRoleEnum)}
                              disabled={disableRoleChange || rowLoadingStates[user.id]}
                              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            >
                              {ALL_USER_ROLES.map(roleValue => (
                                <option key={roleValue} value={roleValue}
                                  // A coordinator cannot assign 'chief' to anyone if they are not already a chief.
                                  // However, the backend function `admin_update_user_role` should be the primary source of truth for this logic.
                                  // For UI, we primarily disable changing an *existing* chief's role by a coordinator.
                                  // For simplicity, allow selecting any role here and let backend validate if a coordinator tries to elevate someone TO chief.
                                >
                                  {roleValue.charAt(0).toUpperCase() + roleValue.slice(1)}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {!isSelf && !(adminIsCoordinator && targetUserIsChief) && (
                            <button
                              onClick={() => handleUpdateRole(user.id)}
                              disabled={disableRoleChange || rowLoadingStates[user.id] || !editingUserRoles[user.id] || editingUserRoles[user.id] === user.role}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150
                                ${rowLoadingStates[user.id] ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' :
                                (!editingUserRoles[user.id] || editingUserRoles[user.id] === user.role) ? 'bg-gray-200 dark:bg-gray-500 text-gray-400 dark:text-gray-600 cursor-not-allowed' :
                                'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800'}`}
                            >
                              {rowLoadingStates[user.id] ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-r-2 border-white mx-auto"></div>
                              ) : 'Update'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      {users.length === 0 ? "No users found." : "No users match your search criteria."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagementPage;
