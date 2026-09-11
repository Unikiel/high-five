import { useState, useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fetchAll } from "@/lib/fetchAll";
import { COURSES } from "@/lib/courseData";
import { getDisplayName, getInitial } from "@/lib/userDisplay";
import {
  Award,
  BookOpen,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import BackLink from "@/components/BackLink";

export default function AdminStudentDetail() {
  const { user } = useAuth();
  const { studentEmail: rawEmail } = useParams();
  const studentEmail = decodeURIComponent(rawEmail || "");

  const [student, setStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!studentEmail) return;
    loadData();
  }, [studentEmail]);

  const loadData = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [users, enr, prog, ex] = await Promise.all([
        fetchAll(base44.entities.User),
        base44.entities.Enrollment.filter({ student_id: studentEmail }),
        base44.entities.Progress.filter({ student_id: studentEmail }),
        base44.entities.Exam.filter({ student_id: studentEmail }, "-created_date", 100),
      ]);
      const match = users.find(
        (u) => (u.email || "").toLowerCase() === studentEmail.toLowerCase()
      );
      if (!match) {
        setNotFound(true);
        setStudent(null);
      } else {
        setStudent(match);
        setEnrollments(enr);
        setProgress(prog);
        setExams(ex);
      }
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  };

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <BackLink to="/admin/students" label="Back to Students" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <BackLink to="/admin/students" label="Back to Students" />
        <Card className="border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            Student not found for <span className="font-mono text-foreground">{studentEmail}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enrolledCourses = COURSES.filter((c) =>
    enrollments.some((e) => e.course_id === c.code)
  );
  const completedExams = exams.filter((e) => e.status === "completed");
  const avgScore =
    completedExams.length > 0
      ? Math.round(
          completedExams.reduce((s, e) => s + (e.score || 0), 0) / completedExams.length
        )
      : null;
  const totalStudyTime = progress.reduce((s, p) => s + (p.time_spent_minutes || 0), 0);

  const courseRows = enrolledCourses.map((course) => {
    const cp = progress.filter((p) => p.course_id === course.code);
    const completed = cp.filter((p) => p.status === "completed").length;
    const total = cp.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { course, completed, total, pct, rows: cp };
  });

  const sortedProgress = [...progress].sort((a, b) => {
    const da = a.last_studied || "";
    const db = b.last_studied || "";
    return db.localeCompare(da);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <BackLink to="/admin/students" label="Back to Students" />

      <div className="flex items-start gap-4">
        {student.avatar_url ? (
          <img
            src={student.avatar_url}
            alt={getDisplayName(student)}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {getInitial(student)}
          </div>
        )}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {getDisplayName(student) || "Unknown"}
          </h1>
          <p className="text-muted-foreground mt-1">{student.email}</p>
          <Badge variant="secondary" className="mt-2 capitalize">
            {student.role || "student"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Courses Enrolled",
            value: enrolledCourses.length,
            icon: BookOpen,
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Exams Completed",
            value: completedExams.length,
            icon: Target,
            color: "text-orange-500",
            bg: "bg-orange-50 dark:bg-orange-950/30",
          },
          {
            label: "Average Score",
            value: avgScore != null ? `${avgScore}%` : "—",
            icon: Award,
            color: "text-green-500",
            bg: "bg-green-50 dark:bg-green-950/30",
          },
          {
            label: "Study Time",
            value: `${Math.round(totalStudyTime / 60)}h`,
            icon: Clock,
            color: "text-purple-500",
            bg: "bg-purple-50 dark:bg-purple-950/30",
          },
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

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Course Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {courseRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No enrollments</p>
          ) : (
            courseRows.map(({ course, completed, total, pct }) => (
              <div key={course.code}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: course.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{course.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {total > 0 ? `${completed}/${total} topics · ${pct}%` : "No progress yet"}
                  </span>
                </div>
                <ProgressBar value={pct} className="h-2" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Topic Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No topic progress yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Course</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Mastery</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Attempts</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Last Studied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sortedProgress.map((row) => {
                    const course = COURSES.find((c) => c.code === row.course_id);
                    return (
                      <tr key={row.id || `${row.course_id}-${row.topic_id}`}>
                        <td className="py-3 px-6">
                          <span className="font-medium text-foreground">
                            {course?.name || row.course_id}
                          </span>
                          {row.topic_id && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[220px]">
                              {row.topic_id}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-6">
                          <Badge variant="secondary" className="capitalize">
                            {(row.status || "not_started").replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-6 text-muted-foreground">
                          {row.mastery_score != null ? `${row.mastery_score}%` : "—"}
                        </td>
                        <td className="py-3 px-6 text-muted-foreground">{row.attempts ?? 0}</td>
                        <td className="py-3 px-6 text-muted-foreground">
                          {row.last_studied
                            ? new Date(row.last_studied).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exam History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {exams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No exams yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Title</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Score</th>
                    <th className="text-left py-3 px-6 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {exams.map((exam) => (
                    <tr key={exam.id}>
                      <td className="py-3 px-6 font-medium text-foreground">
                        {exam.status === "completed" ? (
                          <Link
                            to={`/practice/exam/${exam.id}`}
                            className="hover:underline text-primary"
                          >
                            {exam.title || "Untitled exam"}
                          </Link>
                        ) : (
                          exam.title || "Untitled exam"
                        )}
                      </td>
                      <td className="py-3 px-6 capitalize text-muted-foreground">
                        {exam.type || "—"}
                      </td>
                      <td className="py-3 px-6">
                        <Badge variant="secondary" className="capitalize">
                          {(exam.status || "").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-6">
                        {exam.status === "completed" && exam.score != null ? (
                          <Badge
                            className={`${
                              exam.score >= 70
                                ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                            } border-0`}
                          >
                            {exam.score}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-muted-foreground">
                        {exam.completed_at || exam.started_at
                          ? new Date(exam.completed_at || exam.started_at).toLocaleDateString()
                          : "—"}
                      </td>
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
