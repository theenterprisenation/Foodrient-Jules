import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface BlogPost {
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
    role: string;
  };
  category?: {
    name: string;
    slug: string;
  };
  tags?: {
    id: string;
    name: string;
    slug: string;
  }[];
}

interface BlogState {
  posts: BlogPost[];
  categories: any[];
  tags: any[];
  isLoading: boolean;
  error: string | null;
  fetchPosts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  createPost: (post: Partial<BlogPost>) => Promise<void>;
  updatePost: (id: string, post: Partial<BlogPost>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  isAdmin: boolean;
}

export const useBlogStore = create<BlogState>((set, get) => ({
  posts: [],
  categories: [],
  tags: [],
  isLoading: false,
  error: null,
  isAdmin: false,

  fetchPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Check if user is admin
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const isAdmin = userProfile?.role === 'administrator' || userProfile?.role === 'supervisor';
        set({ isAdmin });
      }

      // Fetch posts with related data
      const { data: posts, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:profiles(full_name, role),
          category:blog_categories(name, slug),
          tags:blog_post_tags(
            tag:blog_tags(id, name, slug)
          )
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;

      // Transform tags data structure
      const transformedPosts = posts?.map(post => ({
        ...post,
        tags: post.tags?.map((t: any) => t.tag)
      }));

      set({ posts: transformedPosts || [] });
    } catch (error: any) {
      console.error('Error fetching blog posts:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ categories: data || [] });
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  },

  fetchTags: async () => {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ tags: data || [] });
    } catch (error: any) {
      console.error('Error fetching tags:', error);
    }
  },

  createPost: async (post) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert([post])
        .select()
        .single();

      if (error) throw error;
      await get().fetchPosts();
    } catch (error: any) {
      console.error('Error creating blog post:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  updatePost: async (id, post) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update(post)
        .eq('id', id);

      if (error) throw error;
      await get().fetchPosts();
    } catch (error: any) {
      console.error('Error updating blog post:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  deletePost: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await get().fetchPosts();
    } catch (error: any) {
      console.error('Error deleting blog post:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));