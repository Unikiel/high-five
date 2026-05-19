import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { COURSES } from "@/lib/courseData";
import { BookOpen, CheckCircle, Lock, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import BackLink from "@/components/BackLink";

export default function Courses() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [enr, prog] = await Promise.all([
        base44.entities.Enrollment.filter({ student_id: user?.email }),
        base44.entities.Progress.filter({ student_id: user?.email })
      ]);
      setEnrollments(enr);
      setProgress(prog);
    } catch (e) {}
    setLoading(false);
  };

  const handleEnroll = async (courseCode) => {
    try {
      await base44.entities.Enrollment.create({
        student_id: user?.email,
        course_id: courseCode,
        enrolled_at: new Date().toISOString(),
      });
      loadData();
    } catch (e) {}
  };

  const filtered = COURSES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const isEnrolled = (code) => enrollments.some(e => e.course_id === code);

  const getCourseProgress = (code) => {
    const cp = progress.filter(p => p.course_id === code);
    const completed = cp.filter(p => p.status === "completed").length;
    return cp.length > 0 ? Math.round((completed / cp.length) * 100) : 0;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <BackLink to="/dashboard" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">AP Courses</h1>
          <p className="text-muted-foreground mt-1">Browse and enroll in AP courses aligned with College Board standards</p>
        </div>
        <Badge variant="secondary" className="text-sm">{COURSES.length} courses available</Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map(course => {
          const enrolled = isEnrolled(course.code);
          const pct = getCourseProgress(course.code);
          return (
            <Card key={course.code} className="border-border/50 hover:shadow-lg transition-all card-hover overflow-hidden">
              {/* Color bar */}
              <div className="h-1.5 w-full" style={{ backgroundColor: course.color }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md"
                    style={{ backgroundColor: course.color }}>
                    <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
                      {course.icon}
                    </span>
                  </div>
                  {enrolled ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-0 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />Enrolled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Available</Badge>
                  )}
                </div>

                <h3 className="font-display font-bold text-foreground text-sm leading-tight mb-1">{course.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{course.description}</p>

                <div className="text-xs text-muted-foreground mb-4">
                  <span className="font-medium text-foreground">{course.units.length}</span> units
                </div>

                {enrolled ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <Link to={`/courses/${course.code}`}>
                      <Button size="sm" className="w-full mt-2" style={{ backgroundColor: course.color, borderColor: course.color }}>
                        Continue Learning
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full hover:text-white transition-colors"
                    onClick={() => handleEnroll(course.code)}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = course.color; e.currentTarget.style.borderColor = course.color; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = ""; e.currentTarget.style.borderColor = ""; e.currentTarget.style.color = ""; }}
                  >
                    Enroll Now
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}