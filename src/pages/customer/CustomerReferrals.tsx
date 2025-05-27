import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  Calendar, 
  User,
  Facebook,
  Twitter,
  Mail,
  Smartphone
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: 'pending' | 'completed' | 'expired';
  points_earned: number;
  created_at: string;
  completed_at: string | null;
  referred: {
    full_name: string;
    email: string;
  };
}

const CustomerReferrals = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string>('');
  const [metrics, setMetrics] = useState({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalPointsEarned: 0
  });

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch user's referral code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      const code = profile?.referral_code;
      setReferralCode(code);
      
      if (code) {
        setReferralLink(`${window.location.origin}/signup?ref=${code}`);
      } else {
        // Generate a referral code if none exists
        await generateReferralCode(user.id);
      }
      
      // Fetch referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:referred_id(
            full_name,
            email:auth.users!profiles_id_fkey(email)
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
        
      if (referralsError) throw referralsError;
      
      // Process referrals
      const processedReferrals = referralsData?.map(referral => ({
        ...referral,
        referred: {
          ...referral.referred,
          email: referral.referred?.email?.[0]?.email || 'N/A'
        }
      })) || [];
      
      setReferrals(processedReferrals);
      
      // Calculate metrics
      const totalReferrals = processedReferrals.length;
      const completedReferrals = processedReferrals.filter(r => r.status === 'completed').length;
      const pendingReferrals = processedReferrals.filter(r => r.status === 'pending').length;
      const totalPointsEarned = processedReferrals.reduce((sum, r) => sum + (r.points_earned || 0), 0);
      
      setMetrics({
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        totalPointsEarned
      });
    } catch (error: any) {
      console.error('Error fetching referral data:', error);
      setError('Failed to load referral data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateReferralCode = async (userId: string) => {
    try {
      // Generate a random code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Update user profile with the code
      const { error } = await supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', userId);
        
      if (error) throw error;
      
      setReferralCode(code);
      setReferralLink(`${window.location.origin}/signup?ref=${code}`);
    } catch (error: any) {
      console.error('Error generating referral code:', error);
      setError('Failed to generate referral code');
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setSuccessMessage('Referral link copied to clipboard');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const shareViaEmail = () => {
    const subject = 'Join me on Foodrient!';
    const body = `I'm using Foodrient to save money on food through group buying. Use my referral link to sign up and we both get rewards: ${referralLink}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareViaWhatsApp = () => {
    const text = `Join me on Foodrient! I'm using it to save money on food through group buying. Use my referral link to sign up: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareViaTwitter = () => {
    const text = `Join me on Foodrient! I'm using it to save money on food through group buying. Use my referral link to sign up: ${referralLink}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Referral Program</h1>
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <>
          {/* Referral Metrics */}
          <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 mr-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Referrals</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.totalReferrals}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 mr-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.completedReferrals}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 mr-4">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.pendingReferrals}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 mr-4">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">PEPS Earned</p>
                  <p className="text-2xl font-semibold text-gray-900">{metrics.totalPointsEarned}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Link Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Your Referral Link</h2>
            <p className="text-gray-600 mb-4">
              Share this link with friends and earn PEPS when they sign up and make their first purchase.
            </p>
            
            <div className="flex items-center mb-6">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 rounded-l-md border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <button
                onClick={copyReferralLink}
                className="px-4 py-2 bg-yellow-500 text-white rounded-r-md hover:bg-yellow-600 flex items-center"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy
              </button>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Share via:</p>
              <div className="flex space-x-4">
                <button
                  onClick={shareViaEmail}
                  className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"
                  title="Share via Email"
                >
                  <Mail className="h-6 w-6" />
                </button>
                <button
                  onClick={shareViaWhatsApp}
                  className="p-2 bg-green-100 rounded-full text-green-600 hover:bg-green-200"
                  title="Share via WhatsApp"
                >
                  <Smartphone className="h-6 w-6" />
                </button>
                <button
                  onClick={shareViaFacebook}
                  className="p-2 bg-blue-100 rounded-full text-blue-600 hover:bg-blue-200"
                  title="Share via Facebook"
                >
                  <Facebook className="h-6 w-6" />
                </button>
                <button
                  onClick={shareViaTwitter}
                  className="p-2 bg-blue-100 rounded-full text-blue-400 hover:bg-blue-200"
                  title="Share via Twitter"
                >
                  <Twitter className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Share2 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-md font-medium text-gray-900 mb-2">1. Share Your Link</h3>
                <p className="text-sm text-gray-600">
                  Share your unique referral link with friends and family.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-md font-medium text-gray-900 mb-2">2. Friends Sign Up</h3>
                <p className="text-sm text-gray-600">
                  When they sign up using your link, they're connected to your account.
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-md font-medium text-gray-900 mb-2">3. Earn Rewards</h3>
                <p className="text-sm text-gray-600">
                  Earn 0.5% of their first purchase value in PEPS points.
                </p>
              </div>
            </div>
          </div>

          {/* Referral History */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Referral History</h2>
            </div>
            
            {referrals.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p>You haven't referred anyone yet</p>
                <p className="text-sm mt-2">Share your referral link to start earning rewards!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PEPS Earned
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {referrals.map((referral) => (
                      <tr key={referral.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{referral.referred.full_name}</div>
                              <div className="text-sm text-gray-500">{referral.referred.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(referral.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            referral.status === 'completed' ? 'bg-green-100 text-green-800' :
                            referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {referral.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-medium ${
                            referral.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {referral.status === 'completed' ? referral.points_earned : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerReferrals;