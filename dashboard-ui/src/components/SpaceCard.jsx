import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const getStatusBadgeVariant = (status) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "default";
    case "archived":
      return "secondary";
    case "paused":
      return "outline";
    default:
      return "secondary";
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-green-500 text-white";
    case "archived":
      return "bg-slate-400 text-white";
    case "paused":
      return "bg-yellow-500 text-slate-900";
    default:
      return "bg-slate-200 text-slate-900";
  }
};

const formatLastUpdated = (timestamp) => {
  if (!timestamp) return "Never";

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

const SpaceCard = ({ space, onClick }) => {
  if (!space) return null;

  const {
    name,
    slug,
    status = "active",
    description,
    tasksCount = 0,
    docsCount = 0,
    lastUpdated,
  } = space;

  const statusColorClass = getStatusColor(status);
  const handleClick = () => onClick?.(space);

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{name}</CardTitle>
            <CardDescription className="text-xs text-slate-500 truncate">
              {slug}
            </CardDescription>
          </div>
          <Badge
            variant="default"
            className={`flex-shrink-0 ${statusColorClass}`}
          >
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-4">
            {description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Tasks
            </p>
            <p className="text-2xl font-bold text-slate-900">{tasksCount}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Docs
            </p>
            <p className="text-2xl font-bold text-slate-900">{docsCount}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          Updated {formatLastUpdated(lastUpdated)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className="text-slate-600 hover:text-slate-900"
        >
          View
        </Button>
      </CardFooter>
    </Card>
  );
};

SpaceCard.displayName = "SpaceCard";

export default SpaceCard;
