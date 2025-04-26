import { createHmac } from 'crypto';

export const generateOTP = (secret: string) => {
  const getCode = () => {
    const now = Math.floor(Date.now() / 30000); // 30-second window
    const hmac = createHmac('sha1', secret);
    const data = Buffer.alloc(8);
    data.writeBigInt64BE(BigInt(now));
    hmac.update(data);
    const hash = hmac.digest();
    const offset = hash[hash.length - 1] & 0xf;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);
    return (binary % 1000000).toString().padStart(6, '0');
  };

  const verify = (code: string) => {
    const validCode = getCode();
    return code === validCode;
  };

  return {
    generate: getCode,
    verify
  };
};