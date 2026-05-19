import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { COURSES } from "@/lib/courseData";
import { getDisplayName } from "@/lib/userDisplay";
import { Calendar, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BackLink from "@/components/BackLink";

export default function AdminSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, u] = await Promise.all([
        base44.entities.TutoringSession.list("-created_date"),
        base44.entities.User.list()
      ]);
      setSessions(s);
      setUsers(u);
    } catch (e) {}
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await base44.entities.TutoringSession.update(id, { status });
      loadData();
    } catch (e) {}
  };

  const filtered = filter === "all" ? sessions : sessions.filter(s => s.status === filter);

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const getName = (email) => {
    const u = users.find(u => u.email === email);
    return u ? (getDisplayName(u) || email) : email;
  };

  const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <BackLink to="/admin" label="Back to Admin" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Tutoring Sessions</h1>
          <p className="text-muted-foreground mt-1">Manage and schedule 1-on-1 tutoring sessions</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No sessions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(s => {
            const course = COURSES.find(c => c.code === s.course_id);
            return (
              <Card key={s.id} className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-display font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: course?.color || "#6366f1" }}>
                      {course?.icon || "AP"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{course?.name || s.course_id}</h3>
                          <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Student: {getName(s.student_id)}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(s.scheduled_date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{s.scheduled_time} ({s.duration_minutes} min)</span>
                          </div>
                          {s.notes && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.notes}</p>}
                        </div>
                        <Badge className={`${STATUS_COLORS[s.status]} border-0 flex-shrink-0`}>{s.status}</Badge>
                      </div>
                      {s.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" onClick={() => updateStatus(s.id, "confirmed")} className="gap-1.5 bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-3.5 h-3.5" />Confirm
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, "cancelled")} className="gap-1.5 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
                            <XCircle className="w-3.5 h-3.5" />Cancel
                          </Button>
                        </div>
                      )}
                      {s.status === "confirmed" && (
                        <Button size="sm" onClick={() => updateStatus(s.id, "completed")} className="mt-3 gap-1.5" variant="outline">
                          <CheckCircle className="w-3.5 h-3.5" />Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}