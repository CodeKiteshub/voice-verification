import { getSetting } from '@/lib/db';
import { exotelProvider } from './exotel';
import { vobizProvider } from './vobiz';
import type { Provider } from '@/lib/types';

export interface TelephonyProvider {
  initiateCall(params: {
    to: string;
    campaignId: string;
    contactId: string;
    callRecordId: string;
    question: string;
  }): Promise<{ providerCallId: string }>;
}

export async function getProvider(override?: Provider): Promise<TelephonyProvider> {
  const active = override ?? ((await getSetting('active_provider')) as Provider) ?? 'exotel';
  return active === 'vobiz' ? vobizProvider : exotelProvider;
}
