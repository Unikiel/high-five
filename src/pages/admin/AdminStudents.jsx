import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fetchAll } from "@/lib/fetchAll";
import { filterStudents } from "@/lib/studentRoles";
import { COURSES } from "@/lib/courseData";
import { getDisplayName, getInitial } from "@/lib/userDisplay";
import { Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BackLink from "@/components/BackLink";

export default function AdminStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [exams, setExams] = useState([]);
  const [progress, setProgress] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [u, e, ex, p] = await Promise.all([
        fetchAll(base44.entities.User),
        fetchAll(base44.entities.Enrollment),
        fetchAll(base44.entities.Exam),
        fetchAll(base44.entities.Progress),
      ]);
      setStudents(filterStudents(u));
      setEnrollments(e);
      setExams(ex);
      setProgress(p);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const filtered = students.filter(
    (s) =>
      getDisplayName(s).toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getStudentStats = (email) => {
    const enr = enrollments.filter((e) => e.student_id === email);
    const studentExams = exams.filter((e) => e.student_id === email && e.status === "completed");
    const avgScore =
      studentExams.length > 0
        ? Math.round(studentExams.reduce((s, e) => s + (e.score || 0), 0) / studentExams.length)
        : null;
    const studentProgress = progress.filter((p) => p.student_id === email);
    const studyMinutes = studentProgress.reduce((s, p) => s + (p.time_spent_minutes || 0), 0);
    const completedTopics = studentProgress.filter((p) => p.status === "completed").length;
    const courseProgressPct =
      studentProgress.length > 0
        ? Math.round((completedTopics / studentProgress.length) * 100)
        : null;
    return {
      courses: enr.length,
      exams: studentExams.length,
      avgScore,
      studyMinutes,
      courseProgressPct,
    };
  };

  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <BackLink to="/admin" label="Back to Admin" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">{students.length} registered students</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Student</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Courses</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Exams Taken</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Avg Score</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Study Time</th>
                    <th className="text-left py-4 px-6 font-medium text-muted-foreground">Course Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((student) => {
                    const {
                      courses,
                      exams: examCount,
                      avgScore,
                      studyMinutes,
                      courseProgressPct,
                    } = getStudentStats(student.email);
                    return (
                      <tr key={student.email} className="hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6">
                          <Link
                            to={`/admin/students/${encodeURIComponent(student.email)}`}
                            className="flex items-center gap-3"
                          >
                            {student.avatar_url ? (
                              <img
                                src={student.avatar_url}
                                alt={getDisplayName(student)}
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                                {getInitial(student)}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-foreground hover:underline">
                                {getDisplayName(student) || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <Link to={`/admin/students/${encodeURIComponent(student.email)}`}>
                            <div className="flex flex-wrap gap-1">
                              {enrollments
                                .filter((e) => e.student_id === student.email)
                                .slice(0, 3)
                                .map((enr) => {
                                  const course = COURSES.find((c) => c.code === enr.course_id);
                                  return course ? (
                                    <span
                                      key={enr.course_id}
                                      className="px-2 py-0.5 rounded text-xs text-white"
                                      style={{ backgroundColor: course.color }}
                                    >
                                      {course.code.replace("AP_", "")}
                                    </span>
                                  ) : null;
                                })}
                              {courses > 3 && (
                                <span className="text-xs text-muted-foreground">+{courses - 3}</span>
                              )}
                              {courses === 0 && (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          <Link to={`/admin/students/${encodeURIComponent(student.email)}`}>
                            {examCount}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <Link to={`/admin/students/${encodeURIComponent(student.email)}`}>
                            {avgScore != null ? (
                              <Badge
                                className={`${
                                  avgScore >= 70
                                    ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                } border-0`}
                              >
                                {avgScore}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">No exams</span>
                            )}
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          <Link to={`/admin/students/${encodeURIComponent(student.email)}`}>
                            {studyMinutes > 0
                              ? studyMinutes >= 60
                                ? `${Math.round(studyMinutes / 60)}h`
                                : `${studyMinutes}m`
                              : "—"}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <Link to={`/admin/students/${encodeURIComponent(student.email)}`}>
                            {courseProgressPct != null ? (
                              <span className="text-foreground font-medium">{courseProgressPct}%</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No students found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
