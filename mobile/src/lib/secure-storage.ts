import * as SecureStore from 'expo-secure-store';

/**
 * Expo SecureStore only accepts /^[\w.-]+$/ keys. Supabase and older Level OS
 * keys may contain ":"; normalizing in one place keeps every caller safe.
 */
function secureKey(key: string): string {
  const normalized = key.replace(/[^\w.-]/g, '_');
  if (!normalized) throw new Error('secure_store_key_invalid');
  return normalized;
}

export const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(secureKey(key)),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(secureKey(key), value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(secureKey(key)),
};
