import { supabase } from './supabase';
import { generateOTP } from './otp';
import { sendEmail } from './email';

interface SecurityEvent {
  userId: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export const logSecurityEvent = async ({
  userId,
  eventType,
  ipAddress,
  userAgent,
  metadata
}: SecurityEvent) => {
  try {
    await supabase.rpc('log_security_event', {
      p_user_id: userId,
      p_event_type: eventType,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_metadata: metadata
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

export const enable2FA = async (userId: string, email: string) => {
  try {
    // Generate backup codes
    const { data: backupCodes } = await supabase.rpc('generate_backup_codes');
    
    // Store 2FA settings
    const { error } = await supabase
      .from('two_factor_auth')
      .upsert({
        user_id: userId,
        is_enabled: true,
        backup_codes: backupCodes
      });

    if (error) throw error;

    // Send backup codes to user's email
    await sendEmail({
      recipient: { email },
      template_type: 'verification',
      data: {
        backup_codes: backupCodes,
        user_id: userId
      }
    });

    return { success: true, backupCodes };
  } catch (error) {
    console.error('Failed to enable 2FA:', error);
    throw error;
  }
};

export const verify2FA = async (userId: string, code: string) => {
  try {
    // Get user's email for OTP verification
    const { data: user } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    // Verify OTP code
    const isValid = await generateOTP(user.email).verify(code);
    if (!isValid) throw new Error('Invalid verification code');

    return { success: true };
  } catch (error) {
    console.error('2FA verification failed:', error);
    throw error;
  }
};

export const submitVendorKYC = async (
  vendorId: string,
  documents: {
    type: string;
    number: string;
  }[]
) => {
  try {
    const { error } = await supabase
      .from('vendor_kyc')
      .insert(
        documents.map(doc => ({
          vendor_id: vendorId,
          document_type: doc.type,
          document_number: doc.number
        }))
      );

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to submit vendor KYC:', error);
    throw error;
  }
};

export const verifyVendorKYC = async (
  vendorId: string,
  verifierId: string,
  status: 'verified' | 'rejected'
) => {
  try {
    const { error } = await supabase
      .from('vendor_kyc')
      .update({
        verification_status: status,
        verified_at: new Date().toISOString(),
        verified_by: verifierId
      })
      .eq('vendor_id', vendorId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to verify vendor KYC:', error);
    throw error;
  }
};