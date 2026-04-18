import { MongoClient, ObjectId, Db, Collection } from 'mongodb';
import type {
  Campaign, Contact, CallRecord, DashboardStats, Provider,
  Intent, User, UserWithHash, CampaignType, AgentConfig, VapiStatus,
  AgentEngine, ConversationTurn,
} from './types';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/voice_verification';

let _client: MongoClient | null = null;
let _indexesCreated = false;

async function getClient(): Promise<MongoClient> {
  if (!_client) {
    _client = new MongoClient(MONGODB_URI);
    await _client.connect();
  }
  if (!_indexesCreated) {
    _indexesCreated = true;
    const db = _client.db();
    // Users
    db.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {});
    // Call records: prevent duplicate calls per contact per campaign + perf indexes
    db.collection('call_records').createIndex(
      { campaign_id: 1, contact_id: 1 }, { unique: true }
    ).catch(() => {});
    db.collection('call_records').createIndex({ status: 1, called_at: -1 }).catch(() => {});
    // Campaigns
    db.collection('campaigns').createIndex({ user_id: 1, campaign_type: 1 }).catch(() => {});
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

/** Normalize a raw MongoDB campaign document — ensures campaign_type defaults to 'verification' */
function normalizeCampaign(doc: any): Campaign {
  const { _id, user_id, ...rest } = doc;
  return {
    ...rest,
    id: (_id as ObjectId).toHexString(),
    user_id: (user_id as ObjectId)?.toHexString() ?? '',
    campaign_type: rest.campaign_type ?? 'verification',
  } as Campaign;
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
  const defaults: Record<string, string> = {
    active_provider:       'exotel',
    stt_enabled:           'true',
    tts_voice:             'anushka',
    agent_engine:          'vapi',
    vapi_api_key:          '',
    vapi_phone_number_id:  '',
    vapi_llm_model:        'gpt-4o-mini',
    vapi_tts_voice:        'hi-IN-SwaraNeural',
    vapi_webhook_secret:   '',
    pipecat_server_url:    '',
    pipecat_tts_provider:  'sarvam',
  };
  await Promise.all(
    Object.entries(defaults).map(([key, value]) =>
      c.updateOne(
        { key },
        { $setOnInsert: { key, value } },
        { upsert: true }
      )
    )
  );
}

/** Returns all settings as a flat key→value record */
export async function getAllSettings(): Promise<Record<string, string>> {
  const c = await col<{ key: string; value: string }>('settings');
  const docs = await c.find({}).toArray();
  return Object.fromEntries(docs.map(d => [d.key, d.value]));
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function countUsers(): Promise<number> {
  const c = await col('users');
  return c.countDocuments();
}

export async function createUser(data: {
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  call_limit: number;
  created_by?: string;
  verification_provider?: Provider;
  agent_engine?: AgentEngine;
}): Promise<User> {
  const c = await col('users');
  const doc = {
    email: data.email.toLowerCase().trim(),
    password_hash: data.password_hash,
    name: data.name,
    role: data.role,
    is_active: data.is_active,
    call_limit: data.call_limit,
    calls_used: 0,
    created_at: new Date().toISOString(),
    ...(data.created_by ? { created_by: data.created_by } : {}),
    ...(data.verification_provider ? { verification_provider: data.verification_provider } : {}),
    ...(data.agent_engine ? { agent_engine: data.agent_engine } : {}),
  };
  const result = await c.insertOne(doc);
  const { password_hash, ...rest } = doc;
  return { ...rest, id: result.insertedId.toHexString() } as User;
}

export async function getUserByEmail(email: string): Promise<UserWithHash | null> {
  const c = await col('users');
  const doc = await c.findOne({ email: email.toLowerCase().trim() }) as any;
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: (_id as ObjectId).toHexString() } as UserWithHash;
}

export async function getUserById(id: string): Promise<User | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col('users');
  const doc = await c.findOne({ _id: new ObjectId(id) }) as any;
  if (!doc) return null;
  const { _id, password_hash, ...rest } = doc;
  return { ...rest, id: (_id as ObjectId).toHexString() } as User;
}

export async function getUsers(filter?: { search?: string }): Promise<User[]> {
  const c = await col('users');
  const query: Record<string, any> = {};
  if (filter?.search) {
    const re = new RegExp(filter.search, 'i');
    query.$or = [{ name: re }, { email: re }];
  }
  const docs = await c.find(query).sort({ created_at: -1 }).toArray() as any[];
  return docs.map(({ _id, password_hash, ...rest }) => ({
    ...rest,
    id: (_id as ObjectId).toHexString(),
  })) as User[];
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    password_hash: string;
    role: 'admin' | 'user';
    is_active: boolean;
    call_limit: number;
    verification_provider: Provider;
    agent_engine: AgentEngine;
  }>
): Promise<User | null> {
  if (!ObjectId.isValid(id) || !Object.keys(data).length) return getUserById(id);
  const c = await col('users');
  await c.updateOne({ _id: new ObjectId(id) }, { $set: data });
  return getUserById(id);
}

export async function incrementCallsUsed(userId: string, count: number): Promise<void> {
  if (!ObjectId.isValid(userId) || count <= 0) return;
  const c = await col('users');
  await c.updateOne({ _id: new ObjectId(userId) }, { $inc: { calls_used: count } });
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export async function createCampaign(data: {
  user_id: string;
  name: string;
  question: string;
  provider: Provider;
  stt_enabled: boolean;
  tts_voice?: string;
  campaign_type?: CampaignType;
  agent_config?: AgentConfig;
  vapi_status?: VapiStatus;
}): Promise<Campaign> {
  const c = await col('campaigns');
  const doc: Record<string, any> = {
    user_id: new ObjectId(data.user_id),
    name: data.name,
    question: data.question,
    provider: data.provider,
    stt_enabled: data.stt_enabled,
    tts_voice: data.tts_voice ?? 'anushka',
    campaign_type: data.campaign_type ?? 'verification',
    status: 'draft',
    created_at: new Date().toISOString(),
  };
  if (data.agent_config) doc.agent_config = data.agent_config;
  if (data.vapi_status)  doc.vapi_status  = data.vapi_status;

  const result = await c.insertOne(doc);
  return {
    ...doc,
    id: result.insertedId.toHexString(),
    user_id: data.user_id,
  } as unknown as Campaign;
}

export async function getCampaigns(userId?: string): Promise<Campaign[]> {
  const db = await getDb();
  const matchStage = userId && ObjectId.isValid(userId)
    ? [{ $match: { user_id: new ObjectId(userId) } }]
    : [];
  const docs = await db.collection('campaigns')
    .aggregate([
      ...matchStage,
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
  return docs.map(normalizeCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col('campaigns');
  const doc = await c.findOne({ _id: new ObjectId(id) }) as any;
  if (!doc) return null;
  return normalizeCampaign(doc);
}

export async function updateCampaign(
  id: string,
  data: Partial<{
    name: string;
    question: string;
    provider: Provider;
    stt_enabled: boolean;
    tts_voice: string;
    status: 'draft' | 'active' | 'completed';
    campaign_type: CampaignType;
    agent_config: AgentConfig;
    vapi_assistant_id: string;
    vapi_status: VapiStatus;
    is_running: boolean;
  }>
): Promise<Campaign | null> {
  if (!ObjectId.isValid(id) || !Object.keys(data).length) return getCampaignById(id);
  const c = await col('campaigns');
  const update: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) update[k] = v;
  }
  await c.updateOne({ _id: new ObjectId(id) }, { $set: update });
  return getCampaignById(id);
}

/**
 * Atomically lock a campaign for triggering.
 * Returns true if the lock was acquired, false if already running.
 */
export async function lockCampaignForTrigger(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const result = await db.collection('campaigns').findOneAndUpdate(
    { _id: new ObjectId(id), is_running: { $ne: true } },
    { $set: { is_running: true } },
    { returnDocument: 'after' }
  );
  return result !== null;
}

export async function unlockCampaign(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const db = await getDb();
  await db.collection('campaigns').updateOne(
    { _id: new ObjectId(id) },
    { $set: { is_running: false } }
  );
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
  campaign_id: string;
  contact_id: string;
  user_id: string;
  phone: string;
  provider: Provider;
  campaign_type?: CampaignType;
  contact_name?: string | null;
  agent_engine?: AgentEngine;
}): Promise<CallRecord> {
  const c = await col('call_records');
  const doc: Record<string, any> = {
    campaign_id:   new ObjectId(data.campaign_id),
    contact_id:    new ObjectId(data.contact_id),
    user_id:       new ObjectId(data.user_id),
    phone:         data.phone,
    provider:      data.provider,
    status:        'initiated',
    recording_proxied: false,
    called_at:     new Date().toISOString(),
  };
  if (data.campaign_type !== undefined) doc.campaign_type  = data.campaign_type;
  if (data.contact_name  !== undefined) doc.contact_name   = data.contact_name;
  if (data.agent_engine  !== undefined) doc.agent_engine   = data.agent_engine;

  const result = await c.insertOne(doc);
  return {
    ...doc,
    id:          result.insertedId.toHexString(),
    campaign_id: data.campaign_id,
    contact_id:  data.contact_id,
    user_id:     data.user_id,
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

export async function incrementCallTurnIndex(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const c = await col('call_records');
  await c.updateOne({ _id: new ObjectId(id) }, { $inc: { current_turn_index: 1 } });
}

export async function getCallRecords(filters?: {
  campaign_id?: string;
  user_id?: string;
  status?: string;
  intent?: string;
  limit?: number;
}): Promise<CallRecord[]> {
  const c = await col('call_records');
  const query: Record<string, any> = {};
  if (filters?.campaign_id && ObjectId.isValid(filters.campaign_id)) {
    query.campaign_id = new ObjectId(filters.campaign_id);
  }
  if (filters?.user_id && ObjectId.isValid(filters.user_id)) {
    query.user_id = new ObjectId(filters.user_id);
  }
  if (filters?.status) query.status = filters.status;
  if (filters?.intent) query.intent = filters.intent;

  let cursor = c.find(query).sort({ called_at: -1 });
  if (filters?.limit) cursor = cursor.limit(filters.limit);

  const docs = await cursor.toArray();
  return docs.map(d => {
    const { _id, campaign_id, contact_id, user_id, ...rest } = d as any;
    return {
      ...rest,
      id:          (_id as ObjectId).toHexString(),
      campaign_id: (campaign_id as ObjectId).toHexString(),
      contact_id:  (contact_id as ObjectId).toHexString(),
      user_id:     (user_id as ObjectId)?.toHexString() ?? '',
    } as CallRecord;
  });
}

export async function getCallById(id: string): Promise<CallRecord | null> {
  if (!ObjectId.isValid(id)) return null;
  const c = await col('call_records');
  const doc = await c.findOne({ _id: new ObjectId(id) }) as any;
  if (!doc) return null;
  const { _id, campaign_id, contact_id, user_id, ...rest } = doc;
  return {
    ...rest,
    id:          (_id as ObjectId).toHexString(),
    campaign_id: (campaign_id as ObjectId).toHexString(),
    contact_id:  (contact_id as ObjectId).toHexString(),
    user_id:     (user_id as ObjectId)?.toHexString() ?? '',
  } as CallRecord;
}

/** Find stale in-progress agent-pipecat calls for crash recovery */
export async function getStalePipecatCalls(olderThanMinutes = 30): Promise<CallRecord[]> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
  return getCallRecords({ status: 'answered' });
  // Caller filters by agent_engine + called_at after fetching
}

export async function getDashboardStats(userId?: string): Promise<DashboardStats> {
  const c = await col('call_records');
  const matchStage = userId && ObjectId.isValid(userId)
    ? [{ $match: { user_id: new ObjectId(userId) } }]
    : [];
  const [result] = await c.aggregate([
    ...matchStage,
    {
      $group: {
        _id:       null,
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
