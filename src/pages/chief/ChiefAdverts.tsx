import React, { useState, useEffect } from 'react';
import { 
  Image, 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Advertisement {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  position: 'top' | 'middle' | 'bottom';
  page: 'products' | 'group_buys' | 'featured_deals';
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
}

const ChiefAdverts = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Partial<Advertisement> | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAdvertisements();
  }, []);

  const fetchAdvertisements = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setAds(data || []);
    } catch (error: any) {
      console.error('Error fetching advertisements:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAd = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    setSelectedAd({
      title: '',
      image_url: '',
      link_url: '',
      position: 'top',
      page: 'products',
      start_date: new Date().toISOString(),
      end_date: nextWeek.toISOString(),
      status: 'active'
    });
    setIsAdding(true);
  };

  const handleEditAd = (ad: Advertisement) => {
    setSelectedAd(ad);
    setIsEditing(true);
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccessMessage('Advertisement deleted successfully');
      fetchAdvertisements();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error deleting advertisement:', error);
      setError(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAd) return;
    
    try {
      if (isAdding) {
        const { error } = await supabase
          .from('advertisements')
          .insert([selectedAd]);
          
        if (error) throw error;
        
        setSuccessMessage('Advertisement created successfully');
      } else if (isEditing && selectedAd.id) {
        const { error } = await supabase
          .from('advertisements')
          .update(selectedAd)
          .eq('id', selectedAd.id);
          
        if (error) throw error;
        
        setSuccessMessage('Advertisement updated successfully');
      }
      
      fetchAdvertisements();
      setIsAdding(false);
      setIsEditing(false);
      setSelectedAd(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving advertisement:', error);
      setError(error.message);
    }
  };

  const filteredAds = ads.filter(ad => {
    const matchesSearch = 
      ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.link_url.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesPage = selectedPage === 'all' || ad.page === selectedPage;
    const matchesStatus = selectedStatus === 'all' || ad.status === selectedStatus;
    
    return matchesSearch && matchesPage && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Advertisement Management</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search advertisements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={handleAddAd}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Advertisement
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

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Page</label>
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="all">All Pages</option>
            <option value="products">Products</option>
            <option value="group_buys">Group Buys</option>
            <option value="featured_deals">Featured Deals</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Advertisements Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advertisement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page & Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
              ) : filteredAds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No advertisements found
                  </td>
                </tr>
              ) : (
                filteredAds.map((ad) => (
                  <tr key={ad.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="h-10 w-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=Error';
                          }}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{ad.title}</div>
                          <a
                            href={ad.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-500 flex items-center hover:text-yellow-500"
                          >
                            View Link
                            <ExternalLink className="h-4 w-4 ml-1" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{ad.page.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-500 capitalize">{ad.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>
                          {formatDate(ad.start_date)} to {formatDate(ad.end_date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ad.status === 'active' ? 'bg-green-100 text-green-800' :
                        ad.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditAd(ad)}
                        className="text-yellow-600 hover:text-yellow-900 mr-4"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
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

      {/* Add/Edit Advertisement Modal */}
      {(isAdding || isEditing) && selectedAd && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isAdding ? 'Create New Advertisement' : 'Edit Advertisement'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={selectedAd.title || ''}
                    onChange={(e) => setSelectedAd({ ...selectedAd, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Image URL</label>
                  <input
                    type="url"
                    value={selectedAd.image_url || ''}
                    onChange={(e) => setSelectedAd({ ...selectedAd, image_url: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  />
                  {selectedAd.image_url && (
                    <div className="mt-2">
                      <img 
                        src={selectedAd.image_url} 
                        alt="Preview" 
                        className="h-20 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x80?text=Invalid+Image+URL';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Link URL</label>
                  <input
                    type="url"
                    value={selectedAd.link_url || ''}
                    onChange={(e) => setSelectedAd({ ...selectedAd, link_url: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Page</label>
                  <select
                    value={selectedAd.page || 'products'}
                    onChange={(e) => setSelectedAd({ ...selectedAd, page: e.target.value as any })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  >
                    <option value="products">Products</option>
                    <option value="group_buys">Group Buys</option>
                    <option value="featured_deals">Featured Deals</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <select
                    value={selectedAd.position || 'top'}
                    onChange={(e) => setSelectedAd({ ...selectedAd, position: e.target.value as any })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  >
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={selectedAd.start_date ? new Date(selectedAd.start_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedAd({ 
                      ...selectedAd, 
                      start_date: new Date(e.target.value).toISOString() 
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={selectedAd.end_date ? new Date(selectedAd.end_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedAd({ 
                      ...selectedAd, 
                      end_date: new Date(e.target.value).toISOString() 
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={selectedAd.status || 'active'}
                    onChange={(e) => setSelectedAd({ ...selectedAd, status: e.target.value as any })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                    setSelectedAd(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  {isAdding ? 'Create Advertisement' : 'Update Advertisement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advertisement Metrics */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Active Ads by Page</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Products</span>
              <span className="text-sm font-medium text-gray-900">
                {ads.filter(ad => ad.page === 'products' && ad.status === 'active').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Group Buys</span>
              <span className="text-sm font-medium text-gray-900">
                {ads.filter(ad => ad.page === 'group_buys' && ad.status === 'active').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Featured Deals</span>
              <span className="text-sm font-medium text-gray-900">
                {ads.filter(ad => ad.page === 'featured_deals' && ad.status === 'active').length}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Ads by Position</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Top</span>
              <span className="text-sm font-medium text-gray-900">
                {ads.filter(ad => ad.position === 'top').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Middle</span>
              <span className="text-sm font-medium text-gray-900">
                {ads.filter(ad => ad.position === 'middle').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bottom</span>
              <span className="text-sm font-medium text-gray-900">
                {ads.filter(ad => ad.position === 'bottom').length}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Ad Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active</span>
              <span className="text-sm font-medium text-green-600">
                {ads.filter(ad => ad.status === 'active').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Inactive</span>
              <span className="text-sm font-medium text-gray-600">
                {ads.filter(ad => ad.status === 'inactive').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Expired</span>
              <span className="text-sm font-medium text-red-600">
                {ads.filter(ad => ad.status === 'expired').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChiefAdverts;