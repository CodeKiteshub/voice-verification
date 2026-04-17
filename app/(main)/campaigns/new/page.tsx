import { CreateCampaignForm } from '@/components/campaigns/CreateCampaignForm';

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">New Campaign</h2>
      <CreateCampaignForm />
    </div>
  );
}
