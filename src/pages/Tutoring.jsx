import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getDisplayName } from "@/lib/userDisplay";
import { COURSES } from "@/lib/courseData";
import { Calendar, Clock, User, Plus, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import BackLink from "@/components/BackLink";
import GoogleStyleSessionCalendar from "@/components/tutoring/GoogleStyleSessionCalendar";

const STATUS_CONFIG = {
  pending: { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400", icon: AlertCircle },
  confirmed: { color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400", icon: CheckCircle },
  completed: { color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400", icon: CheckCircle },
  cancelled: { color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400", icon: XCircle },
};

export default function Tutoring() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    course_id: "",
    scheduled_date: "",
    scheduled_time: "",
    end_time: "",
    notes: "",
    tutor_id: ""
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, u] = await Promise.all([
        base44.entities.TutoringSession.filter({ student_id: user?.email }),
        base44.entities.User.list()
      ]);
      setSessions(s.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)));
      setTutors(u.filter(u => u.role === "tutor" || u.role === "admin" || u.role === "assistant"));
    } catch (e) {}
    setLoading(false);
  };

  const getDurationMinutes = (start, end) => {
    if (!start || !end) return 0;
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    return endTotal > startTotal ? endTotal - startTotal : 0;
  };

  const durationMinutes = getDurationMinutes(form.scheduled_time, form.end_time);

  const handleBook = async () => {
    if (!form.course_id || !form.scheduled_date || !form.scheduled_time || !form.end_time || durationMinutes <= 0) return;
    setSubmitting(true);
    try {
      await base44.entities.TutoringSession.create({
        student_id: user?.email,
        tutor_id: form.tutor_id || "pending",
        course_id: form.course_id,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        end_time: form.end_time,
        duration_minutes: durationMinutes,
        notes: form.notes,
        status: "pending"
      });
      setOpen(false);
      setForm({ course_id: "", scheduled_date: "", scheduled_time: "", end_time: "", notes: "", tutor_id: "" });
      loadData();
    } catch (e) {}
    setSubmitting(false);
  };

  const upcoming = sessions.filter(s => s.status !== "cancelled" && s.status !== "completed" && new Date(s.scheduled_date) >= new Date());
  const past = sessions.filter(s => s.status === "completed" || new Date(s.scheduled_date) < new Date());
  const calendarDays = Object.entries(upcoming.reduce((days, session) => {
    const day = session.scheduled_date;
    if (!days[day]) days[day] = [];
    days[day].push(session);
    return days;
  }, {})).sort(([a], [b]) => new Date(a) - new Date(b));

  const SessionCard = ({ session }) => {
    const { color, icon: Icon } = STATUS_CONFIG[session.status] || STATUS_CONFIG.pending;
    const course = COURSES.find(c => c.code === session.course_id);
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-display font-bold text-white flex-shrink-0"
            style={{ backgroundColor: course?.color || "#6366f1" }}>
            {course?.icon || "AP"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground text-sm">{course?.name || session.course_id}</h3>
              <Badge className={`${color} border-0 text-xs flex-shrink-0`}>
                <Icon className="w-3 h-3 mr-1" />{session.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(session.scheduled_date).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.scheduled_time}{session.end_time ? ` - ${session.end_time}` : ""} ({session.duration_minutes} min)</span>
              {session.tutor_id && session.tutor_id !== "pending" && (
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{(() => { const t = tutors.find(t => t.email === session.tutor_id); return t ? getDisplayName(t) : "Assigned Tutor"; })()}</span>
              )}
            </div>
            {session.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{session.notes}</p>}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <BackLink to="/dashboard" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">1-on-1 Tutoring</h1>
          <p className="text-muted-foreground mt-1">Book personalized sessions with expert tutors</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Book Session</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Book a Tutoring Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Course *</Label>
                <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" className="mt-1" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} min={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <Label>Start Time *</Label>
                  <Input type="time" className="mt-1" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>End Time *</Label>
                  <Input type="time" className="mt-1" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
                <div>
                  <Label>Duration</Label>
                  <div className="mt-1 h-9 rounded-md border border-input bg-muted px-3 flex items-center text-sm">
                    {durationMinutes > 0 ? `${durationMinutes} minutes` : "Set start and end"}
                  </div>
                </div>
              </div>
              {tutors.length > 0 && (
                <div>
                  <Label>Preferred Tutor (optional)</Label>
                  <Select value={form.tutor_id} onValueChange={v => setForm(f => ({ ...f, tutor_id: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Any available tutor" /></SelectTrigger>
                    <SelectContent>
                      {tutors.map(t => <SelectItem key={t.email} value={t.email}>{getDisplayName(t)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Topics / Notes</Label>
                <Textarea className="mt-1" placeholder="Topics you'd like to cover, questions, etc." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleBook} disabled={submitting || !form.course_id || !form.scheduled_date || !form.scheduled_time || !form.end_time || durationMinutes <= 0}>
                {submitting ? "Booking..." : "Book Session"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <GoogleStyleSessionCalendar sessions={upcoming} columns={2} />

      {/* Upcoming */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Upcoming Sessions</h2>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
        ) : upcoming.length === 0 ? (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="p-10 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">No upcoming sessions</h3>
              <p className="text-sm text-muted-foreground mb-4">Book a 1-on-1 session with an expert tutor</p>
              <Button onClick={() => setOpen(true)}>Book Now</Button>
            </CardContent>
          </Card>
        ) : (
          upcoming.map(s => <SessionCard key={s.id} session={s} />)
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Past Sessions</h2>
          {past.map(s => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
    </div>
  );
}