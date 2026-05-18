import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { COURSES } from "@/lib/courseData";
import { TrendingUp, Target, Clock, Award, BarChart2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function ProgressPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState([]);
  const [exams, setExams] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [prog, e, enr] = await Promise.all([
        base44.entities.Progress.filter({ student_id: user?.email }),
        base44.entities.Exam.filter({ student_id: user?.email }, "-created_date", 20),
        base44.entities.Enrollment.filter({ student_id: user?.email })
      ]);
      setProgress(prog);
      setExams(e);
      setEnrollments(enr);
    } catch (err) {}
    setLoading(false);
  };

  const enrolledCourses = COURSES.filter(c => enrollments.some(e => e.course_id === c.code));
  const completedExams = exams.filter(e => e.status === "completed");
  const avgScore = completedExams.length > 0
    ? Math.round(completedExams.reduce((s, e) => s + (e.score || 0), 0) / completedExams.length)
    : 0;
  const totalStudyTime = progress.reduce((s, p) => s + (p.time_spent_minutes || 0), 0);

  // Chart data
  const scoreData = completedExams.slice(-10).map((e, i) => ({
    name: `Exam ${i + 1}`,
    score: e.score || 0,
  }));

  const courseProgressData = enrolledCourses.map(course => {
    const cp = progress.filter(p => p.course_id === course.code);
    const completed = cp.filter(p => p.status === "completed").length;
    const total = cp.length || 1;
    return {
      name: course.name.replace("AP ", ""),
      progress: Math.round((completed / total) * 100),
      color: course.color
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">My Progress</h1>
        <p className="text-muted-foreground mt-1">Track your learning journey across all AP courses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Exams Taken", value: completedExams.length, icon: Target, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Average Score", value: avgScore ? `${avgScore}%` : "—", icon: Award, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
          { label: "Study Time", value: `${Math.round(totalStudyTime / 60)}h`, icon: Clock, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { label: "Courses Active", value: enrolledCourses.length, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
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
        {/* Score Trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Exam Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No exam data yet — start practicing!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Course Progress */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Course Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courseProgressData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Enroll in courses to see progress
              </div>
            ) : (
              <div className="space-y-4">
                {courseProgressData.map(({ name, progress: pct, color }) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-foreground font-medium truncate max-w-[180px]">{name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Exams Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exam History</CardTitle>
        </CardHeader>
        <CardContent>
          {completedExams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No completed exams yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Exam</th>
                    <th className="pb-3 font-medium text-muted-foreground">Type</th>
                    <th className="pb-3 font-medium text-muted-foreground">Score</th>
                    <th className="pb-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {completedExams.map(exam => (
                    <tr key={exam.id}>
                      <td className="py-3 font-medium text-foreground">{exam.title || "Practice Exam"}</td>
                      <td className="py-3 capitalize text-muted-foreground">{exam.type}</td>
                      <td className="py-3">
                        <Badge className={`${exam.score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"} border-0`}>
                          {exam.score}%
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{new Date(exam.completed_at || exam.created_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}