import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { COURSES } from "@/lib/courseData";
import { getDisplayName, getInitial } from "@/lib/userDisplay";
import { TrendingUp, Users, Target, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3B82F6", "#8B5CF6", "#EF4444", "#F97316", "#10B981", "#F59E0B", "#6366F1", "#DC2626", "#059669", "#EC4899"];

export default function AdminReports() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [exams, setExams] = useState([]);
  const [progress, setProgress] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [u, e, ex, p] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Enrollment.list(),
        base44.entities.Exam.list(),
        base44.entities.Progress.list()
      ]);
      setStudents(u.filter(u => u.role === "user" || !u.role));
      setEnrollments(e);
      setExams(ex);
      setProgress(p);
    } catch (err) {}
    setLoading(false);
  };

  const completedExams = exams.filter(e => e.status === "completed");
  const filteredExams = selectedCourse === "all" ? completedExams : completedExams.filter(e => e.course_id === selectedCourse);

  // Enrollment by course
  const enrollmentData = COURSES.map((c, i) => ({
    name: c.code.replace("AP_", ""),
    students: enrollments.filter(e => e.course_id === c.code).length,
    fill: COLORS[i % COLORS.length]
  })).filter(d => d.students > 0);

  // Score distribution
  const scoreRanges = [
    { range: "90-100%", min: 90, max: 100, count: 0 },
    { range: "80-89%", min: 80, max: 89, count: 0 },
    { range: "70-79%", min: 70, max: 79, count: 0 },
    { range: "60-69%", min: 60, max: 69, count: 0 },
    { range: "<60%", min: 0, max: 59, count: 0 },
  ];
  filteredExams.forEach(e => {
    const s = e.score || 0;
    const range = scoreRanges.find(r => s >= r.min && s <= r.max);
    if (range) range.count++;
  });

  const avgScore = filteredExams.length > 0
    ? Math.round(filteredExams.reduce((s, e) => s + (e.score || 0), 0) / filteredExams.length)
    : 0;

  const passRate = filteredExams.length > 0
    ? Math.round((filteredExams.filter(e => e.score >= 70).length / filteredExams.length) * 100)
    : 0;

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Platform-wide performance and engagement analytics</p>
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {COURSES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: students.length, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Total Exams", value: filteredExams.length, icon: Target, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Avg Score", value: avgScore ? `${avgScore}%` : "—", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Pass Rate", value: passRate ? `${passRate}%` : "—", icon: Award, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enrollment by course */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Enrollment by Course</CardTitle>
          </CardHeader>
          <CardContent>
            {enrollmentData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No enrollment data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="students" radius={[4, 4, 0, 0]}>
                    {enrollmentData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExams.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No exam data</div>
            ) : (
              <div className="space-y-3 pt-2">
                {scoreRanges.map(({ range, count }) => {
                  const pct = filteredExams.length > 0 ? Math.round((count / filteredExams.length) * 100) : 0;
                  return (
                    <div key={range}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{range}</span>
                        <span className="text-muted-foreground">{count} exams ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top performing students */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top Performing Students</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const studentStats = students.map(s => {
              const studentExams = completedExams.filter(e => e.student_id === s.email);
              const avg = studentExams.length > 0
                ? Math.round(studentExams.reduce((acc, e) => acc + (e.score || 0), 0) / studentExams.length)
                : 0;
              return { ...s, avgScore: avg, examCount: studentExams.length };
            }).filter(s => s.examCount > 0).sort((a, b) => b.avgScore - a.avgScore).slice(0, 10);

            return studentStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No exam data available</p>
            ) : (
              <div className="space-y-3">
                {studentStats.map((s, i) => (
                  <div key={s.email} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={getDisplayName(s)} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {getInitial(s)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{getDisplayName(s)}</p>
                      <p className="text-xs text-muted-foreground">{s.examCount} exams</p>
                    </div>
                    <Badge className={`${s.avgScore >= 70 ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"} border-0`}>
                      {s.avgScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}