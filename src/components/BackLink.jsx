import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

/**
 * Small "back to parent" link, used on non-home pages.
 * Usage: <BackLink to="/courses" label="Back to Courses" />
 */
export default function BackLink({ to, label = "Back" }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </Link>
  );
}