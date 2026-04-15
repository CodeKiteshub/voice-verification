import type { Intent } from '@/lib/types';

const YES = ['yes','yeah','yep','yup','correct','right','sure','ok','okay',
  'haan','ha','ji','bilkul','theek','sahi','confirm','agree',
  'absolutely','definitely','of course','confirmed'];

const NO = ['no','nope','nahi','nahin','na','never','not',
  'wrong','incorrect','disagree','refuse','naa','mat'];

export function extractIntent(transcript: string): Intent {
  if (!transcript?.trim()) return 'UNCLEAR';
  const text = transcript.toLowerCase();
  const hasYes = YES.some(w => text.includes(w));
  const hasNo  = NO.some(w => text.includes(w));
  if (hasYes && !hasNo) return 'YES';
  if (hasNo  && !hasYes) return 'NO';
  return 'UNCLEAR';
}
