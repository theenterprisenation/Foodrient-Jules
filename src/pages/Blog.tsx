import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, User, Tag, Edit, Trash2 } from 'lucide-react';
import { MainMenu } from '../components/MainMenu';
import { useBlogStore } from '../store/blogStore';
import type { BlogPost } from '../store/blogStore';

const Blog = () => {
  const navigate = useNavigate();
  const { posts, isLoading, error, isAdmin, fetchPosts, deletePost } = useBlogStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      await deletePost(id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Group posts by category
  const postsByCategory = posts.reduce((acc: Record<string, BlogPost[]>, post) => {
    const category = post.category?.name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(post);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <MainMenu />
      
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900">Blog</h1>
            {isAdmin && (
              <button
                onClick={() => navigate('/blog/new')}
                className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Post
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-sm ${
                  !selectedCategory
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {Object.keys(postsByCategory).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedCategory === category
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-12">
              {error}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No blog posts available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(selectedCategory ? postsByCategory[selectedCategory] : posts).map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  {post.featured_image && (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-yellow-600">
                        {post.category?.name || 'Uncategorized'}
                      </span>
                      {isAdmin && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/blog/edit/${post.id}`)}
                            className="text-gray-400 hover:text-yellow-500"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      <a
                        href={`/blog/${post.slug}`}
                        className="hover:text-yellow-600"
                      >
                        {post.title}
                      </a>
                    </h2>
                    
                    {post.excerpt && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(post.published_at || post.created_at)}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {post.author?.full_name}
                      </div>
                    </div>

                    {post.tags && post.tags.length > 0 && (
                      <div className="mt-4 flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Blog;