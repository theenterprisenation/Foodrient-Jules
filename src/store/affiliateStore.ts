import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AffiliateState {
  points: number;
  referralCode: string | null;
  referrals: any[];
  pointsHistory: any[];
  isLoading: boolean;
  error: string | null;
  fetchPoints: () => Promise<void>;
  fetchReferrals: () => Promise<void>;
  fetchPointsHistory: () => Promise<void>;
  generateReferralLink: () => string;
}

export const useAffiliateStore = create<AffiliateState>((set, get) => ({
  points: 0,
  referralCode: null,
  referrals: [],
  pointsHistory: [],
  isLoading: false,
  error: null,

  fetchPoints: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('points_balance, referral_code')
        .single();

      if (profileError) throw profileError;

      set({
        points: profile?.points_balance || 0,
        referralCode: profile?.referral_code,
      });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchReferrals: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:referred_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ referrals: referrals || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPointsHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: pointsHistory, error } = await supabase
        .from('affiliate_points')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ pointsHistory: pointsHistory || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  generateReferralLink: () => {
    const { referralCode } = get();
    if (!referralCode) return '';
    return `${window.location.origin}/signup?ref=${referralCode}`;
  },
}));