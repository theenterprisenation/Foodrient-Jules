/*
  # Blog System Implementation

  1. New Tables
    - blog_posts
      - Stores blog articles with content and metadata
      - Tracks author and publication status
    - blog_categories
      - Manages blog post categories
    - blog_tags
      - Manages blog post tags
    - blog_post_tags
      - Junction table for post-tag relationships

  2. Security
    - Enable RLS
    - Add policies for public viewing
    - Restrict posting to administrators and supervisors
*/

-- Create blog_categories table
CREATE TABLE IF NOT EXISTS blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create blog_tags table
CREATE TABLE IF NOT EXISTS blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  excerpt text,
  featured_image text,
  author_id uuid REFERENCES profiles(id),
  category_id uuid REFERENCES blog_categories(id),
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT blog_posts_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

-- Create blog_post_tags junction table
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Enable RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for blog_categories
CREATE POLICY "Anyone can view blog categories"
  ON blog_categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage blog categories"
  ON blog_categories
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Create policies for blog_tags
CREATE POLICY "Anyone can view blog tags"
  ON blog_tags
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage blog tags"
  ON blog_tags
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Create policies for blog_posts
CREATE POLICY "Anyone can view published blog posts"
  ON blog_posts
  FOR SELECT
  TO public
  USING (status = 'published');

CREATE POLICY "Admins can manage all blog posts"
  ON blog_posts
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Create policies for blog_post_tags
CREATE POLICY "Anyone can view blog post tags"
  ON blog_post_tags
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage blog post tags"
  ON blog_post_tags
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Create indexes
CREATE INDEX idx_blog_posts_status_date ON blog_posts (status, published_at DESC);
CREATE INDEX idx_blog_posts_category ON blog_posts (category_id);
CREATE INDEX idx_blog_posts_author ON blog_posts (author_id);
CREATE INDEX idx_blog_posts_slug ON blog_posts (slug);

-- Update function trigger
CREATE TRIGGER update_blog_categories_timestamp
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_blog_posts_timestamp
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();