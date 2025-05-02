import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Store, 
  Link as LinkIcon, 
  Unlink, 
  Search, 
  CheckCircle, 
  AlertTriangle,
  Filter,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Manager {
  id: string;
  full_name: string;
  email: string;
  assigned_vendors: number;
}

interface Vendor {
  id: string;
  business_name: string;
  contact_email: string;
  status: string;
  manager_id: string | null;
  manager_name: string | null;
}

const ChiefVendorAssignment = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [selectedVendorStatus, setSelectedVendorStatus] = useState<string>('all');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentData, setAssignmentData] = useState<{
    manager_id: string;
    vendor_id: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch managers
      const { data: managersData, error: managersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email:auth.users(email)
        `)
        .eq('role', 'manager');
        
      if (managersError) throw managersError;
      
      // Process managers data
      const processedManagers = managersData.map(manager => ({
        id: manager.id,
        full_name: manager.full_name || 'Unnamed Manager',
        email: manager.email?.[0]?.email || 'N/A',
        assigned_vendors: 0 // Will be updated below
      }));
      
      // Fetch manager assignments count
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('manager_assignments')
        .select('manager_id, count')
        .select('manager_id')
        .select('*');
        
      if (assignmentsError) throw assignmentsError;
      
      // Count assignments per manager
      const assignmentCounts = {};
      assignmentsData.forEach(assignment => {
        assignmentCounts[assignment.manager_id] = (assignmentCounts[assignment.manager_id] || 0) + 1;
      });
      
      // Update manager assignments count
      processedManagers.forEach(manager => {
        manager.assigned_vendors = assignmentCounts[manager.id] || 0;
      });
      
      setManagers(processedManagers);
      
      // Fetch vendors with their assigned managers
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          contact_email,
          status,
          manager_assignments(manager_id)
        `);
        
      if (vendorsError) throw vendorsError;
      
      // Get manager names for each assignment
      const managerMap = processedManagers.reduce((acc, manager) => {
        acc[manager.id] = manager.full_name;
        return acc;
      }, {});
      
      // Process vendor data
      const processedVendors = vendorsData.map(vendor => {
        const managerId = vendor.manager_assignments?.[0]?.manager_id || null;
        return {
          id: vendor.id,
          business_name: vendor.business_name,
          contact_email: vendor.contact_email || 'N/A',
          status: vendor.status,
          manager_id: managerId,
          manager_name: managerId ? managerMap[managerId] : null
        };
      });
      
      setVendors(processedVendors);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignVendor = (vendorId: string) => {
    setAssignmentData({
      manager_id: '',
      vendor_id: vendorId
    });
    setIsAssigning(true);
  };

  const handleUnassignVendor = async (vendorId: string) => {
    if (!window.confirm('Are you sure you want to remove this vendor assignment?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('manager_assignments')
        .delete()
        .eq('vendor_id', vendorId);
        
      if (error) throw error;
      
      setSuccessMessage('Vendor unassigned successfully');
      fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error unassigning vendor:', error);
      setError(error.message);
    }
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assignmentData || !assignmentData.manager_id || !assignmentData.vendor_id) {
      setError('Please select a manager');
      return;
    }
    
    try {
      // Check if vendor is already assigned
      const { data: existingAssignment, error: checkError } = await supabase
        .from('manager_assignments')
        .select('id')
        .eq('vendor_id', assignmentData.vendor_id);
        
      if (checkError) throw checkError;
      
      if (existingAssignment && existingAssignment.length > 0) {
        // Update existing assignment
        const { error } = await supabase
          .from('manager_assignments')
          .update({ manager_id: assignmentData.manager_id })
          .eq('vendor_id', assignmentData.vendor_id);
          
        if (error) throw error;
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('manager_assignments')
          .insert([assignmentData]);
          
        if (error) throw error;
      }
      
      setSuccessMessage('Vendor assigned successfully');
      fetchData();
      setIsAssigning(false);
      setAssignmentData(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error assigning vendor:', error);
      setError(error.message);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = 
      vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesManager = selectedManager === '' || vendor.manager_id === selectedManager;
    const matchesStatus = selectedVendorStatus === 'all' || vendor.status === selectedVendorStatus;
    
    return matchesSearch && matchesManager && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Assignment</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
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

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Manager</label>
          <select
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="">All Managers</option>
            <option value="unassigned">Unassigned Vendors</option>
            {managers.map(manager => (
              <option key={manager.id} value={manager.id}>{manager.full_name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Status</label>
          <select
            value={selectedVendorStatus}
            onChange={(e) => setSelectedVendorStatus(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Manager Summary */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Manager Assignment Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {managers.map(manager => (
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

      {/* Vendors Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Manager
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No vendors found
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Store className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vendor.business_name}</div>
                          <div className="text-sm text-gray-500">{vendor.contact_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vendor.status === 'active' ? 'bg-green-100 text-green-800' :
                        vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vendor.manager_name ? (
                        <div className="flex items-center">
                          <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                            <span className="text-green-800 font-medium text-xs">
                              {vendor.manager_name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900">{vendor.manager_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {vendor.manager_id ? (
                        <button
                          onClick={() => handleUnassignVendor(vendor.id)}
                          className="text-red-600 hover:text-red-900 flex items-center justify-end"
                        >
                          <Unlink className="h-5 w-5 mr-1" />
                          Unassign
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssignVendor(vendor.id)}
                          className="text-yellow-600 hover:text-yellow-900 flex items-center justify-end"
                        >
                          <LinkIcon className="h-5 w-5 mr-1" />
                          Assign Manager
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {isAssigning && assignmentData && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Assign Vendor to Manager
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Assigning vendor: <span className="font-medium text-gray-900">
                  {vendors.find(v => v.id === assignmentData.vendor_id)?.business_name}
                </span>
              </p>
            </div>
            
            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Manager</label>
                <select
                  value={assignmentData.manager_id}
                  onChange={(e) => setAssignmentData({ ...assignmentData, manager_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                >
                  <option value="">Select a manager</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.assigned_vendors} vendors)
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssigning(false);
                    setAssignmentData(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiefVendorAssignment;