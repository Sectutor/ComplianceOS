import { trpc } from "@/lib/trpc";

interface ActionCenterBadgeProps {
  clientId: number;
}

export function ActionCenterBadge({ clientId }: ActionCenterBadgeProps) {
  const { data } = trpc.actionCenter.getActionCount.useQuery(
    { clientId },
    {
      enabled: clientId > 0,
      refetchInterval: 120000, // every 2 minutes
    }
  );

  if (!data || data.total === 0) return null;

  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white ml-auto">
      {data.total > 99 ? '99+' : data.total}
    </span>
  );
}
