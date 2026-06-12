/**
 * Shared application configuration.
 *
 * All values are read from Vite environment variables (.env file).
 * Variables MUST be prefixed with VITE_ to be exposed to the client.
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://terabridge-api.onrender.com';
export const API_KEY  = import.meta.env.VITE_API_KEY || '';
