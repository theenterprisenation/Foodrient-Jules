type UserRole = 'visitor' | 'customer' | 'vendor' | 'support' | 'supervisor' | 'administrator';

interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface SupportTeamMember {
  id: string;
  user_id: string;
  department: string;
  specialization: string | null;
  created_at: string;
  updated_at: string;
}