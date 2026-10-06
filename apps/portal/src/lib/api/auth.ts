export async function signOut(): Promise<void> {
  const response = await fetch('/api/auth/signout', { method: 'POST' });
  if (!response.ok) throw new Error('Failed to sign out');
}
