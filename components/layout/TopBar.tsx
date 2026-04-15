import { getSetting, initSettings } from '@/lib/db';
import { ProviderToggle } from '@/components/settings/ProviderToggle';
import { STTToggle } from '@/components/settings/STTToggle';
import type { Provider } from '@/lib/types';

export async function TopBar() {
  let activeProvider: string = 'exotel';
  let sttStr: string = 'true';

  try {
    await initSettings();
    const [p, s] = await Promise.all([
      getSetting('active_provider'),
      getSetting('stt_enabled'),
    ]);
    activeProvider = p ?? 'exotel';
    sttStr = s ?? 'true';
  } catch {
    // use defaults when DB is unavailable (e.g. during build)
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end gap-6 px-6">
      <STTToggle initial={sttStr !== 'false'} />
      <div className="w-px h-6 bg-gray-200" />
      <ProviderToggle initial={(activeProvider ?? 'exotel') as Provider} />
    </header>
  );
}
