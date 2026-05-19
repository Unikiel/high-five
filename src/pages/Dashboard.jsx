import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getDisplayName } from "@/lib/userDisplay";
import { COURSES } from "@/lib/courseData";
import {
  BookOpen, Target, TrendingUp, Calendar, ChevronRight,
  Flame, Award, Clock, Zap, ArrowRight, Star
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [enr, prog, exams] = await Promise.all([
        base44.entities.Enrollment.filter({ student_id: user?.email }),
        base44.entities.Progress.filter({ student_id: user?.email }),
        base44.entities.Exam.filter({ student_id: user?.email }, "-created_date", 5)
      ]);
      setEnrollments(enr);
      setProgress(prog);
      setRecentExams(exams);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const enrolledCourses = COURSES.filter(c => enrollments.some(e => e.course_id === c.code));
  const totalStudyTime = progress.reduce((s, p) => s + (p.time_spent_minutes || 0), 0);
  const avgScore = recentExams.filter(e => e.score != null).length > 0
    ? Math.round(recentExams.filter(e => e.score != null).reduce((s, e) => s + e.score, 0) / recentExams.filter(e => e.score != null).length)
    : 0;

  const stats = [
    { label: "Courses Enrolled", value: enrolledCourses.length || 0, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Practice Exams", value: recentExams.length, icon: Target, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { label: "Avg Score", value: avgScore ? `${avgScore}%` : "—", icon: Award, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
    { label: "Study Time", value: `${Math.round(totalStudyTime / 60)}h`, icon: Clock, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {greeting}, {getDisplayName(user)?.split(" ")[0] || "Student"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">Stay consistent, stay confident — keep up the great work!</p>
        </div>
        <Link to="/practice">
          <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
            <Zap className="w-4 h-4" />
            Quick Practice
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-border/50 shadow-sm">
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Enrolled Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-foreground">My Courses</h2>
            <Link to="/courses" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : enrolledCourses.length === 0 ? (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="p-10 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">No courses yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Browse and enroll in courses to get started</p>
                <Link to="/courses">
                  <Button>Browse Courses</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {enrolledCourses.map(course => {
                const courseProgress = progress.filter(p => p.course_id === course.code);
                const completed = courseProgress.filter(p => p.status === "completed").length;
                const total = courseProgress.length || 1;
                const pct = Math.round((completed / total) * 100);
                return (
                  <Link to={`/courses/${course.code}`} key={course.code}>
                    <Card className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer card-hover">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: course.color }}>
                          {course.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-sm truncate">{course.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground flex-shrink-0">{pct}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{course.units.length} units · {completed}/{total} topics done</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent Exams */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                Recent Exams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentExams.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No exams taken yet</p>
                  <Link to="/practice">
                    <Button size="sm" variant="outline">Start Practice</Button>
                  </Link>
                </div>
              ) : (
                recentExams.slice(0, 4).map(exam => (
                  <div key={exam.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{exam.title || "Practice Exam"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{exam.type}</p>
                    </div>
                    {exam.score != null ? (
                      <Badge variant={exam.score >= 70 ? "default" : "destructive"} className="text-xs">
                        {exam.score}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">In Progress</Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Motivation */}
          <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-5 text-center">
              <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="font-display font-semibold text-foreground">Keep the streak going!</p>
              <p className="text-sm text-muted-foreground mt-1">Consistent practice is the key to a 5.</p>
              <Link to="/practice" className="mt-3 block">
                <Button size="sm" className="w-full gap-2">
                  <Star className="w-3.5 h-3.5" />
                  Practice Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}