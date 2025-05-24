// Fallback hashCode implementation
String.prototype.hashCode = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};

const getCrypto = () => {
  // Browser environment
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.subtle || window.crypto.webkitSubtle;
  }
  // Node.js environment (for SSR/SSG)
  if (typeof crypto !== 'undefined') {
    return crypto.subtle;
  }
  return null;
};

export const createSessionChecksum = async (user: any): Promise<string> => {
  if (!user) return '';

  try {
    const crypto = getCrypto();
    const str = JSON.stringify({
      id: user.id,
      email: user.email,
      createdAt: user.created_at
    });
    
    if (crypto) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback to simple hash if crypto is unavailable
    return [
      String(user.id?.hashCode() ?? 0),
      String(user.email?.hashCode() ?? 0),
      String(user.created_at?.hashCode() ?? 0)
    ].join('-');
  } catch (error) {
    console.error('Failed to create session checksum:', error);
    return 'error';
  }
};

export const validateSessionChecksum = async (user: any, checksum: string | null): Promise<boolean> => {
  if (!checksum || !user) return false;
  const newChecksum = await createSessionChecksum(user);
  return newChecksum === checksum;
};