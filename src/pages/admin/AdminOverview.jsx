import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, BookOpen, Target, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COURSES } from "@/lib/courseData";

export default function AdminOverview() {
  const [users, setUsers] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [exams, setExams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [u, e, ex, s] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Enrollment.list(),
        base44.entities.Exam.list(),
        base44.entities.TutoringSession.list()
      ]);
      setUsers(u);
      setEnrollments(e);
      setExams(ex);
      setSessions(s);
    } catch (err) {}
    setLoading(false);
  };

  const students = users.filter(u => u.role === "student" || u.role === "user" || !u.role);
  const completedExams = exams.filter(e => e.status === "completed");
  const avgScore = completedExams.length > 0
    ? Math.round(completedExams.reduce((s, e) => s + (e.score || 0), 0) / completedExams.length)
    : 0;
  const pendingSessions = sessions.filter(s => s.status === "pending");

  const stats = [
    { label: "Total Students", value: students.length, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", link: "/admin/students" },
    { label: "Enrollments", value: enrollments.length, icon: BookOpen, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30", link: "/admin/courses" },
    { label: "Avg Score", value: avgScore ? `${avgScore}%` : "—", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30", link: "/admin/reports" },
    { label: "Pending Sessions", value: pendingSessions.length, icon: Calendar, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30", link: "/admin/sessions" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">Platform statistics and management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, link }) => (
          <Link to={link} key={label}>
            <Card className="border-border/50 hover:shadow-md transition-all card-hover cursor-pointer">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="font-display text-2xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Students */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Students</CardTitle>
            <Link to="/admin/students" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {students.slice(0, 5).map(student => (
              <div key={student.email} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {student.full_name?.[0] || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                </div>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {enrollments.filter(e => e.student_id === student.email).length} courses
                </Badge>
              </div>
            ))}
            {students.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No students yet</p>}
          </CardContent>
        </Card>

        {/* Pending Sessions */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pending Sessions</CardTitle>
            <Link to="/admin/sessions" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSessions.slice(0, 5).map(s => {
              const course = COURSES.find(c => c.code === s.course_id);
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm flex-shrink-0"
                    style={{ backgroundColor: course?.color || "#6366f1" }}>
                    {course?.icon || "📚"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.student_id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.scheduled_date).toLocaleDateString()} · {s.scheduled_time}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 border-0 text-xs">Pending</Badge>
                </div>
              );
            })}
            {pendingSessions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No pending sessions</p>}
          </CardContent>
        </Card>
      </div>

      {/* Course Stats */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Course Enrollment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {COURSES.map(course => {
              const count = enrollments.filter(e => e.course_id === course.code).length;
              return (
                <div key={course.code} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: course.color }}>
                    {course.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{course.name.replace("AP ", "")}</p>
                    <p className="text-lg font-bold text-foreground">{count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}