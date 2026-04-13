export const encryptMessage = (message: string, key: string): string => {
  const encoded = btoa(unescape(encodeURIComponent(message)));
  let result = '';
  for (let i = 0; i < encoded.length; i++) {
    result += String.fromCharCode(encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
};

export const decryptMessage = (encrypted: string, key: string): string => {
  try {
    const decoded = atob(encrypted);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decodeURIComponent(escape(atob(result)));
  } catch {
    return encrypted;
  }
};

export const generateEncryptionKey = (userId1: string, userId2: string): string => {
  return btoa([userId1, userId2].sort().join('-')).substring(0, 32);
};