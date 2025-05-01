import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Calendar, 
  User, 
  Tag, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  author_id: string;
  category_id: string;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
  };
  category?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

const ChiefBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Partial<BlogPost> | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBlogData();
  }, []);

  const fetchBlogData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch blog posts
      const { data: postsData, error: postsError } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:profiles(full_name),
          category:blog_categories(name)
        `)
        .order('created_at', { ascending: false });
        
      if (postsError) throw postsError;
      setPosts(postsData || []);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name');
        
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
      
      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name');
        
      if (tagsError) throw tagsError;
      setTags(tagsData || []);
      
    } catch (error: any) {
      console.error('Error fetching blog data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPost = () => {
    setSelectedPost({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      featured_image: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      status: 'draft'
    });
    setIsAdding(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setIsEditing(true);
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccessMessage('Blog post deleted successfully');
      fetchBlogData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error deleting post:', error);
      setError(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPost) return;
    
    try {
      if (isAdding) {
        // Generate slug if not provided
        if (!selectedPost.slug) {
          selectedPost.slug = selectedPost.title
            .toLowerCase()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '-');
        }
        
        // Add author_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const newPost = {
          ...selectedPost,
          author_id: user.id,
          published_at: selectedPost.status === 'published' ? new Date().toISOString() : null
        };
        
        const { error } = await supabase
          .from('blog_posts')
          .insert([newPost]);
          
        if (error) throw error;
        
        setSuccessMessage('Blog post created successfully');
      } else if (isEditing && selectedPost.id) {
        // Update post
        const updates = {
          ...selectedPost,
          published_at: selectedPost.status === 'published' && !selectedPost.published_at 
            ? new Date().toISOString() 
            : selectedPost.published_at
        };
        
        const { error } = await supabase
          .from('blog_posts')
          .update(updates)
          .eq('id', selectedPost.id);
          
        if (error) throw error;
        
        setSuccessMessage('Blog post updated successfully');
      }
      
      fetchBlogData();
      setIsAdding(false);
      setIsEditing(false);
      setSelectedPost(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving post:', error);
      setError(error.message);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = selectedCategory === 'all' || post.category_id === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || post.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Blog Management</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={handleAddPost}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Post
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
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
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Blog Posts Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Post
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Published
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No blog posts found
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {post.featured_image ? (
                          <img 
                            src={post.featured_image} 
                            alt={post.title}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{post.title}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {post.excerpt || post.content.substring(0, 100)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-4 w-4 mr-1" />
                        {post.author?.full_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Tag className="h-4 w-4 mr-1" />
                        {post.category?.name || 'Uncategorized'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        post.status === 'published' ? 'bg-green-100 text-green-800' :
                        post.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(post.published_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEditPost(post)}
                        className="text-yellow-600 hover:text-yellow-900 mr-3"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
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

      {/* Add/Edit Post Modal */}
      {(isAdding || isEditing) && selectedPost && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isAdding ? 'Create New Blog Post' : 'Edit Blog Post'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={selectedPost.title || ''}
                  onChange={(e) => setSelectedPost({ ...selectedPost, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Slug</label>
                <input
                  type="text"
                  value={selectedPost.slug || ''}
                  onChange={(e) => setSelectedPost({ ...selectedPost, slug: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  placeholder="Leave blank to auto-generate from title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Featured Image URL</label>
                <input
                  type="url"
                  value={selectedPost.featured_image || ''}
                  onChange={(e) => setSelectedPost({ ...selectedPost, featured_image: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={selectedPost.category_id || ''}
                  onChange={(e) => setSelectedPost({ ...selectedPost, category_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Excerpt</label>
                <textarea
                  value={selectedPost.excerpt || ''}
                  onChange={(e) => setSelectedPost({ ...selectedPost, excerpt: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  placeholder="Brief summary of the post"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <textarea
                  value={selectedPost.content || ''}
                  onChange={(e) => setSelectedPost({ ...selectedPost, content: e.target.value })}
                  rows={10}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={selectedPost.status || 'draft'}
                  onChange={(e) => setSelectedPost({ ...selectedPost, status: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                    setSelectedPost(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  {isAdding ? 'Create Post' : 'Update Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Categories</h2>
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{category.name}</p>
                  <p className="text-xs text-gray-500">Slug: {category.slug}</p>
                </div>
                <div className="flex space-x-2">
                  <button className="text-yellow-600 hover:text-yellow-900">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <button className="mt-2 text-sm text-yellow-600 hover:text-yellow-700 flex items-center">
              <Plus className="h-4 w-4 mr-1" />
              Add Category
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <div key={tag.id} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700 flex items-center">
                {tag.name}
                <button className="ml-2 text-gray-500 hover:text-red-500">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700 flex items-center">
              <Plus className="h-3 w-3 mr-1" />
              Add Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChiefBlog;