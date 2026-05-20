import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { COURSES } from "@/lib/courseData";

const STATUS_DOTS = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

export default function GoogleStyleSessionCalendar({ title = "Session Calendar", sessions = [], getName, showStudent = false, columns = 3 }) {
  const days = Object.entries(sessions.reduce((grouped, session) => {
    const day = session.scheduled_date;
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(session);
    return grouped;
  }, {})).sort(([a], [b]) => new Date(a) - new Date(b));

  if (days.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      </div>
      <div className={`grid gap-4 ${columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {days.map(([date, daySessions]) => {
          const dateObj = new Date(date);
          const weekday = dateObj.toLocaleDateString(undefined, { weekday: "short" });
          const monthDay = dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          return (
            <Card key={date} className="overflow-hidden border-border/60 shadow-sm">
              <div className="border-b bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{weekday}</p>
                <p className="text-lg font-semibold text-foreground">{monthDay}</p>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {daySessions
                    .sort((a, b) => (a.scheduled_time || "").localeCompare(b.scheduled_time || ""))
                    .map((session) => {
                      const course = COURSES.find(c => c.code === session.course_id);
                      return (
                        <div key={session.id} className="flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="w-14 shrink-0 text-xs font-semibold text-muted-foreground pt-0.5">
                            {session.scheduled_time}
                          </div>
                          <div className="min-w-0 flex-1 border-l-4 rounded-md bg-primary/5 px-3 py-2" style={{ borderColor: course?.color || "#4285F4" }}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">{course?.name || session.course_id}</p>
                              <span className={`mt-1 h-2 w-2 rounded-full ${STATUS_DOTS[session.status] || STATUS_DOTS.pending}`} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {session.scheduled_time}{session.end_time ? ` - ${session.end_time}` : ""}
                            </p>
                            {showStudent && getName && (
                              <p className="mt-1 truncate text-xs text-muted-foreground">{getName(session.student_id)}</p>
                            )}
                            <Badge variant="outline" className="mt-2 h-5 text-[10px] capitalize">{session.status}</Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}