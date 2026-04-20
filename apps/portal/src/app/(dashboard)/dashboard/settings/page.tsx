import { redirect } from 'next/navigation';
import { requireCreator } from '@/lib/server/auth';
import { getCreatorProfile } from '@/lib/queries/creators';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  let user, creator;
  try {
    ({ user, creator } = await requireCreator());
  } catch {
    redirect('/login');
  }

  const profile = await getCreatorProfile(creator.id);

  return (
    <SettingsClient
      creatorId={creator.id}
      email={user.email || ''}
      initialProfile={{
        display_name: profile?.display_name || '',
        bio: profile?.bio || '',
        avatar_url: profile?.avatar_url || null,
        country: profile?.country || null,
        timezone: profile?.timezone || null,
      }}
    />
  );
}
