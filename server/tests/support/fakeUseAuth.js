// Test stand-in for src/hooks/useAuth.js: the value is set by the test via globalThis.__fakeAuth.
export const useAuth = () => globalThis.__fakeAuth;
