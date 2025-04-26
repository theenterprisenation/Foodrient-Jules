import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAdvertisementStore, Advertisement } from '../store/advertisementStore';
import { format } from 'date-fns';

const AdminAdvertisements = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { ads, isLoading, error, fetchAds, createAd, updateAd, deleteAd } = useAdvertisementStore();
  const [isAddingAd, setIsAddingAd] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Partial<Advertisement> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // Fetch ads for all pages
    Promise.all([
      fetchAds('products'),
      fetchAds('group_buys'),
      fetchAds('featured_deals')
    ]);
  }, [user, navigate, fetchAds]);

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAd) return;

    try {
      await createAd(selectedAd as any);
      setIsAddingAd(false);
      setSelectedAd(null);
    } catch (error) {
      console.error('Failed to add advertisement:', error);
    }
  };

  const handleEditAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAd?.id) return;

    try {
      await updateAd(selectedAd.id, selectedAd);
      setIsEditing(false);
      setSelectedAd(null);
    } catch (error) {
      console.error('Failed to update advertisement:', error);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this advertisement?')) {
      try {
        await deleteAd(id);
      } catch (error) {
        console.error('Failed to delete advertisement:', error);
      }
    }
  };

  const AdForm = ({ onSubmit, initialData = {}, isEdit = false }) => (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            required
            value={selectedAd?.title || ''}
            onChange={(e) => setSelectedAd({ ...selectedAd, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Image URL</label>
          <input
            type="url"
            required
            value={selectedAd?.image_url || ''}
            onChange={(e) => setSelectedAd({ ...selectedAd, image_url: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Link URL</label>
          <input
            type="url"
            required
            value={selectedAd?.link_url || ''}
            onChange={(e) => setSelectedAd({ ...selectedAd, link_url: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Page</label>
          <select
            required
            value={selectedAd?.page || ''}
            onChange={(e) => setSelectedAd({ ...selectedAd, page: e.target.value as Advertisement['page'] })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="">Select a page</option>
            <option value="products">Products</option>
            <option value="group_buys">Group Buys</option>
            <option value="featured_deals">Featured Deals</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Position</label>
          <select
            required
            value={selectedAd?.position || ''}
            onChange={(e) => setSelectedAd({ ...selectedAd, position: e.target.value as Advertisement['position'] })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="">Select a position</option>
            <option value="top">Top</option>
            <option value="middle">Middle</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="datetime-local"
            required
            value={selectedAd?.start_date?.slice(0, 16) || ''}
            onChange={(e) => setSelectedAd({ ...selectedAd, start_date: new Date(e.target.value).toISOString() })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="datetime-local"
            required
            value={selectedAd?.end_date?.slice(0, 16) || ''}
            onChange={(e) => setSelectedAd({ ...selectedAd, end_date: new Date(e.target.value).toISOString() })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            required
            value={selectedAd?.status || ''}
            onChange={(e) => setSelectedAd({ ...selectedAd, status: e.target.value as Advertisement['status'] })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setIsAddingAd(false);
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
          {isEdit ? 'Update Advertisement' : 'Add Advertisement'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Advertisement Management</h1>
          <button
            onClick={() => {
              setSelectedAd({
                status: 'active',
                start_date: new Date().toISOString(),
                end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              });
              setIsAddingAd(true);
            }}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Advertisement
          </button>
        </div>

        {/* Add/Edit Advertisement Modal */}
        {(isAddingAd || isEditing) && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full m-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {isEditing ? 'Edit Advertisement' : 'Add New Advertisement'}
              </h3>
              <AdForm
                onSubmit={isEditing ? handleEditAd : handleAddAd}
                initialData={selectedAd}
                isEdit={isEditing}
              />
            </div>
          </div>
        )}

        {/* Advertisement List */}
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
                {ads.map((ad) => (
                  <tr key={ad.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="h-10 w-10 rounded object-cover"
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
                      <div className="text-sm text-gray-900">{ad.page}</div>
                      <div className="text-sm text-gray-500">{ad.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(ad.start_date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        to {format(new Date(ad.end_date), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ad.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : ad.status === 'expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedAd(ad);
                          setIsEditing(true);
                        }}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAdvertisements;