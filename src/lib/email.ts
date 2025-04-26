import { supabase } from './supabase';

interface EmailTemplate {
  id: string;
  type: 'welcome' | 'verification' | 'password_reset' | 'order_confirmation';
  subject: string;
  content: string;
}

interface EmailData {
  recipient: {
    email: string;
    full_name?: string;
  };
  template_type: EmailTemplate['type'];
  data: Record<string, any>;
}

export const sendEmail = async ({ recipient, template_type, data }: EmailData) => {
  try {
    // Get the email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', template_type)
      .single();

    if (templateError) throw templateError;

    // Replace template variables
    let subject = template.subject;
    let content = template.content;

    // Replace variables in subject and content
    const variables = {
      ...data,
      full_name: recipient.full_name || 'Valued Customer',
      base_url: window.location.origin,
    };

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value));
      content = content.replace(regex, String(value));
    });

    // Handle arrays (like order items) using simple template syntax
    const arrayRegex = /{{#(\w+)}}([\s\S]*?){{\/\1}}/g;
    content = content.replace(arrayRegex, (match, arrayName, template) => {
      if (!Array.isArray(variables[arrayName])) return '';
      return variables[arrayName]
        .map((item: any) => {
          let result = template;
          Object.entries(item).forEach(([key, value]) => {
            const itemRegex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(itemRegex, String(value));
          });
          return result.trim();
        })
        .join('\n');
    });

    // Log the email
    const { data: log, error: logError } = await supabase
      .from('email_logs')
      .insert({
        user_id: data.user_id,
        template_id: template.id,
        recipient_email: recipient.email,
        subject,
        content,
        metadata: data,
      })
      .select()
      .single();

    if (logError) throw logError;

    // Send email using Supabase's built-in email service
    const { error: emailError } = await supabase.auth.admin.sendEmail(
      recipient.email,
      {
        subject,
        template_data: {
          content,
        },
      }
    );

    if (emailError) throw emailError;

    // Update email log status
    await supabase
      .from('email_logs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', log.id);

    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw error;
  }
};