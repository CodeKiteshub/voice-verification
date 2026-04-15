import { MongoClient, ObjectId, Db, Collection } from 'mongodb';
import type { Campaign, Contact, CallRecord, DashboardStats, Provider, Intent } from './types';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/voice_verification';

let _client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (!_client) {
    _client = new MongoClient(MONGODB_URI);
    await _client.connect();
  }
  return _client;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db();
}

async function col<T extends object>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

function toObj<T extends { id: string }>(doc: any): T | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: (_id as ObjectId).toHexString() } as T;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const c = await col<{ key: string; value: string }>('settings');
  const doc = await c.findOne({ key });
  return doc?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const c = await col<{ key: string; value: string }>('settings');
  await c.updateOne({ key }, { $set: { key, value } }, { upsert: true });
}

export async function initSettings(): Promise<void> {
  const c = await col<{ key: string; value: string }>('settings');
  await Promise.all([
    c.updateOne(
      { key: 'active_provider' },
      { $setOnInsert: { key: 'active_provider', value: 'exotel' } },
      { upsert: true }
    ),
    c.updateOne(
      { key: 'stt_enabled' },
      { $setOnInsert: { key: 'stt_enabled', value: 'true' } },
      { upsert: true }
    ),
    c.updateOne(
      { key: 'tts_voice' },
      { $setOnInsert: { key: 'tts_voice', value: 'anushka' } },
      { upsert: true }
    ),
  ]);
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export async function createCampaign(data: {
  name: string; question: string; provider: Provider; stt_enabled: boolean;
}): Promise<Campaign> {
  const c = await col('campaigns');
  const doc = {
    name: data.name,
    question: data.question,
    provider: data.provider,
    stt_enabled: data.stt_enabled,
    status: 'draft',
    created_at: new Date().toISOString(),
  };
  const result = await c.insertOne(doc);
  return toObj<Campaign>({ _id: result.insertedId, ...doc })!;
}

export async function getCampaigns(): Promise<Campaign[]> {
  const db = await getDb();
  const docs = await db.collection('campaigns')
    .aggregate([
      {
        $lookup: {
          from: 'call_records',
          localField: '_id',
          foreignField: 'campaign_id',
          as: 'calls',
        },
      },
      { $addFields: { call_count: { $size: '$calls' } } },
      { $project: { calls: 0 } },
      { $sort: { created_at: -1 } },
    ])
    .toArray();
  return docs.map(d => {
    const { _id, ...rest } = d;
    return { ...rest, id: (_id as ObjectId).toHexString() } as Campaign;
  });
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col('campaigns');
  const doc = await c.findOne({ _id: new ObjectId(id) });
  return toObj<Campaign>(doc);
}

export async function deleteCampaign(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const db = await getDb();
  const oid = new ObjectId(id);
  await Promise.all([
    db.collection('campaigns').deleteOne({ _id: oid }),
    db.collection('contacts').deleteMany({ campaign_id: oid }),
    db.collection('call_records').deleteMany({ campaign_id: oid }),
  ]);
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function addContacts(
  campaignId: string,
  contacts: { phone: string; name?: string }[]
): Promise<void> {
  if (!ObjectId.isValid(campaignId) || !contacts.length) return;
  const c = await col('contacts');
  const docs = contacts.map(ct => ({
    campaign_id: new ObjectId(campaignId),
    phone: ct.phone,
    name: ct.name ?? null,
  }));
  await c.insertMany(docs);
}

export async function getContacts(campaignId: string): Promise<Contact[]> {
  if (!ObjectId.isValid(campaignId)) return [];
  const c = await col('contacts');
  const docs = await c.find({ campaign_id: new ObjectId(campaignId) }).toArray();
  return docs.map(d => {
    const { _id, campaign_id, ...rest } = d as any;
    return {
      ...rest,
      id: (_id as ObjectId).toHexString(),
      campaign_id: (campaign_id as ObjectId).toHexString(),
    } as Contact;
  });
}

// ─── Call Records ─────────────────────────────────────────────────────────────

export async function createCallRecord(data: {
  campaign_id: string; contact_id: string; phone: string; provider: Provider;
}): Promise<CallRecord> {
  const c = await col('call_records');
  const doc = {
    campaign_id: new ObjectId(data.campaign_id),
    contact_id: new ObjectId(data.contact_id),
    phone: data.phone,
    provider: data.provider,
    status: 'initiated',
    recording_proxied: false,
    called_at: new Date().toISOString(),
  };
  const result = await c.insertOne(doc);
  return {
    ...doc,
    id: result.insertedId.toHexString(),
    campaign_id: data.campaign_id,
    contact_id: data.contact_id,
  } as unknown as CallRecord;
}

export async function updateCallRecord(
  id: string,
  data: Partial<Record<string, any>>
): Promise<void> {
  if (!ObjectId.isValid(id) || !Object.keys(data).length) return;
  const c = await col('call_records');
  await c.updateOne({ _id: new ObjectId(id) }, { $set: data });
}

export async function getCallRecords(filters?: {
  campaign_id?: string; status?: string; intent?: string; limit?: number;
}): Promise<CallRecord[]> {
  const c = await col('call_records');
  const query: Record<string, any> = {};
  if (filters?.campaign_id && ObjectId.isValid(filters.campaign_id)) {
    query.campaign_id = new ObjectId(filters.campaign_id);
  }
  if (filters?.status) query.status = filters.status;
  if (filters?.intent) query.intent = filters.intent;

  let cursor = c.find(query).sort({ called_at: -1 });
  if (filters?.limit) cursor = cursor.limit(filters.limit);

  const docs = await cursor.toArray();
  return docs.map(d => {
    const { _id, campaign_id, contact_id, ...rest } = d as any;
    return {
      ...rest,
      id: (_id as ObjectId).toHexString(),
      campaign_id: (campaign_id as ObjectId).toHexString(),
      contact_id: (contact_id as ObjectId).toHexString(),
    } as CallRecord;
  });
}

export async function getCallById(id: string): Promise<CallRecord | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col('call_records');
  const doc = await c.findOne({ _id: new ObjectId(id) }) as any;
  if (!doc) return null;
  const { _id, campaign_id, contact_id, ...rest } = doc;
  return {
    ...rest,
    id: (_id as ObjectId).toHexString(),
    campaign_id: (campaign_id as ObjectId).toHexString(),
    contact_id: (contact_id as ObjectId).toHexString(),
  } as CallRecord;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const c = await col('call_records');
  const [result] = await c.aggregate([
    {
      $group: {
        _id: null,
        total:     { $sum: 1 },
        answered:  { $sum: { $cond: [{ $in: ['$status', ['answered', 'completed']] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        yes:       { $sum: { $cond: [{ $eq: ['$intent', 'YES'] }, 1, 0] } },
        no:        { $sum: { $cond: [{ $eq: ['$intent', 'NO'] }, 1, 0] } },
        unclear:   { $sum: { $cond: [{ $eq: ['$intent', 'UNCLEAR'] }, 1, 0] } },
        failed:    { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        pending:   { $sum: { $cond: [{ $in: ['$status', ['initiated', 'ringing']] }, 1, 0] } },
      },
    },
  ]).toArray();

  return result
    ? {
        total: result.total, answered: result.answered, completed: result.completed,
        yes: result.yes, no: result.no, unclear: result.unclear,
        failed: result.failed, pending: result.pending,
      }
    : { total: 0, answered: 0, completed: 0, yes: 0, no: 0, unclear: 0, failed: 0, pending: 0 };
}
