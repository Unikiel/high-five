import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { COURSES } from "@/lib/courseData";
import { Target, Zap, BookOpen, Brain, ChevronRight, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import BackLink from "@/components/BackLink";

const EXAM_TYPES = [
  { id: "quick", label: "Quick Quiz", description: "10 questions, ~15 min", questions: 10, icon: Zap },
  { id: "unit", label: "Unit Test", description: "20 questions, ~30 min", questions: 20, icon: BookOpen },
  { id: "full", label: "Full Practice", description: "40 questions, ~90 min", questions: 40, icon: Target },
  { id: "adaptive", label: "Adaptive", description: "AI-adjusted difficulty", questions: 20, icon: Brain },
];

export default function Practice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultCourse = searchParams.get("course") || "";

  const [selectedCourse, setSelectedCourse] = useState(defaultCourse);
  const [selectedType, setSelectedType] = useState("quick");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [enrollments, setEnrollments] = useState([]);
  const [recentExams, setRecentExams] = useState([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [enr, exams] = await Promise.all([
        base44.entities.Enrollment.filter({ student_id: user?.email }),
        base44.entities.Exam.filter({ student_id: user?.email }, "-created_date", 10)
      ]);
      setEnrollments(enr);
      setRecentExams(exams);
    } catch (e) {}
  };

  const enrolledCourses = COURSES.filter(c => enrollments.some(e => e.course_id === c.code));
  const course = COURSES.find(c => c.code === selectedCourse);

  const startExam = async () => {
    if (!selectedCourse) return;
    setStarting(true);
    try {
      const examType = EXAM_TYPES.find(t => t.id === selectedType);
      const exam = await base44.entities.Exam.create({
        student_id: user?.email,
        course_id: selectedCourse,
        title: `${course?.name} - ${examType?.label}`,
        type: selectedType === "adaptive" ? "practice" : selectedType === "quick" ? "practice" : "unit",
        status: "in_progress",
        total_questions: examType?.questions,
        adaptive_difficulty: selectedType === "adaptive" ? "adaptive" : "medium",
        started_at: new Date().toISOString(),
        answers: {}
      });
      navigate(`/practice/exam/${exam.id}`);
    } catch (e) {
      console.error(e);
    }
    setStarting(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <BackLink to="/dashboard" label="Back to Dashboard" />
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Practice Exams</h1>
        <p className="text-muted-foreground mt-1">Adaptive practice aligned with College Board standards</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Config panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Select */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Course</CardTitle>
            </CardHeader>
            <CardContent>
              {enrolledCourses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">Enroll in courses first to practice</p>
                  <Button variant="outline" onClick={() => navigate("/courses")}>Browse Courses</Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {enrolledCourses.map(c => (
                    <button
                      key={c.code}
                      onClick={() => setSelectedCourse(c.code)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        selectedCourse === c.code ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/30"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0"
                        style={{ backgroundColor: c.color }}>{c.icon}</div>
                      <span className="text-sm font-medium text-foreground leading-tight">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unit Select */}
          {course && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Focus Area</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units (Full Course)</SelectItem>
                    {course.units.map(u => (
                      <SelectItem key={u.number} value={String(u.number)}>
                        Unit {u.number}: {u.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Exam Type */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Exam Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {EXAM_TYPES.map(({ id, label, description, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedType(id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      selectedType === id ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedType === id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full gap-2 text-base"
            disabled={!selectedCourse || starting}
            onClick={startExam}
          >
            <Play className="w-5 h-5" />
            {starting ? "Starting..." : "Start Exam"}
          </Button>
        </div>

        {/* Recent Exams */}
        <div>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentExams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No exams yet</p>
              ) : (
                recentExams.map(exam => (
                  <div key={exam.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{exam.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(exam.created_date).toLocaleDateString()}</p>
                    </div>
                    {exam.score != null ? (
                      <Badge className={exam.score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-0" : "bg-red-100 text-red-700 border-0"}>
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
        </div>
      </div>
    </div>
  );
}