/*
  # Email Templates and Triggers Setup

  1. New Tables
    - email_templates: Stores email templates for different types of notifications
    - email_logs: Tracks sent emails and their status

  2. Security
    - Enable RLS on new tables
    - Add policies for admin access
*/

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT email_templates_type_check CHECK (
    type IN ('welcome', 'verification', 'password_reset', 'order_confirmation')
  )
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  template_id uuid REFERENCES email_templates(id),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT email_logs_status_check CHECK (
    status IN ('pending', 'sent', 'failed')
  )
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Administrators can manage email templates"
  ON email_templates
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

CREATE POLICY "Administrators can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('administrator', 'supervisor')
  );

-- Insert default email templates
INSERT INTO email_templates (type, subject, content) VALUES
('welcome', 'Welcome to Foodrient!', '
Dear {{full_name}},

Welcome to Foodrient! We''re excited to have you join our community.

Here are some quick links to get you started:
- Browse Products: {{base_url}}/products
- Group Buys: {{base_url}}/group-buys
- Featured Deals: {{base_url}}/deals

If you have any questions, our support team is here to help!

Best regards,
The Foodrient Team
'),

('verification', 'Verify your email address', '
Hello {{full_name}},

Please verify your email address by clicking the link below:

{{verification_link}}

This link will expire in 24 hours.

If you didn''t create an account, you can safely ignore this email.

Best regards,
The Foodrient Team
'),

('password_reset', 'Reset your password', '
Hello {{full_name}},

We received a request to reset your password. Click the link below to create a new password:

{{reset_link}}

This link will expire in 1 hour.

If you didn''t request a password reset, you can safely ignore this email.

Best regards,
The Foodrient Team
'),

('order_confirmation', 'Order Confirmation #{{order_id}}', '
Dear {{full_name}},

Thank you for your order! Here are your order details:

Order Reference: {{reference_number}}
Order Date: {{order_date}}

Items:
{{#items}}
- {{quantity}}x {{name}} (₦{{price}})
{{/items}}

Subtotal: ₦{{subtotal}}
{{#peps_used}}
PEPS Used: -₦{{peps_amount}}
{{/peps_used}}
Total: ₦{{total}}

Your order will be processed and delivered according to the selected delivery options.

Track your order: {{base_url}}/orders/{{order_id}}

Thank you for choosing Foodrient!

Best regards,
The Foodrient Team
');