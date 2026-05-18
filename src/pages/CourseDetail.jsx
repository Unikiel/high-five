import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getCourseByCode } from "@/lib/courseData";
import { ChevronRight, BookOpen, Target, TrendingUp, ChevronDown, ChevronUp, CheckCircle, Circle, Play, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function CourseDetail() {
  const { courseCode } = useParams();
  const { user } = useAuth();
  const course = getCourseByCode(courseCode);
  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState([]);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (course) loadData();
  }, [courseCode]);

  const loadData = async () => {
    try {
      const [u, t, prog] = await Promise.all([
        base44.entities.Unit.filter({ course_id: courseCode }),
        base44.entities.Topic.filter({ course_id: courseCode }),
        base44.entities.Progress.filter({ student_id: user?.email, course_id: courseCode })
      ]);
      setUnits(u.sort((a, b) => a.unit_number - b.unit_number));
      setTopics(t);
      setProgress(prog);
      if (u.length > 0) setExpandedUnit(u[0].id);
    } catch (e) {}
    setLoading(false);
  };

  if (!course) return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Course not found.</p>
      <Link to="/courses"><Button variant="link">Back to Courses</Button></Link>
    </div>
  );

  const getTopicProgress = (topicId) => progress.find(p => p.topic_id === topicId);
  const unitTopics = (unitId) => topics.filter(t => t.unit_id === unitId).sort((a, b) => a.order - b.order);
  const unitCompletion = (unitId) => {
    const ut = unitTopics(unitId);
    if (ut.length === 0) return 0;
    return Math.round((ut.filter(t => getTopicProgress(t.id)?.status === "completed").length / ut.length) * 100);
  };

  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => getTopicProgress(t.id)?.status === "completed").length;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/courses" className="hover:text-foreground">Courses</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{course.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white shadow-md flex-shrink-0"
          style={{ backgroundColor: course.color }}>
          {course.icon}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-foreground">{course.name}</h1>
          <p className="text-muted-foreground mt-1">{course.description}</p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Progress value={overallProgress} className="h-2 flex-1" />
              <span className="text-sm font-medium text-foreground whitespace-nowrap">{overallProgress}%</span>
            </div>
            <span className="text-sm text-muted-foreground">{completedTopics}/{totalTopics} topics</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link to={`/practice?course=${courseCode}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Target className="w-4 h-4" />Practice
            </Button>
          </Link>
        </div>
      </div>

      {/* Units */}
      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-foreground">Course Units</h2>

        {loading ? (
          <div className="space-y-3">
            {course.units.map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : (
          course.units.map((unitDef, idx) => {
            const unit = units.find(u => u.unit_number === unitDef.number);
            const ut = unit ? unitTopics(unit.id) : [];
            const pct = unit ? unitCompletion(unit.id) : 0;
            const isExpanded = expandedUnit === unit?.id;

            return (
              <Card key={unitDef.number} className="border-border/50 overflow-hidden">
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedUnit(isExpanded ? null : unit?.id)}
                >
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: course.color }}>
                      {unitDef.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">Unit {unitDef.number}: {unitDef.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Progress value={pct} className="h-1 flex-1 max-w-[120px]" />
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                        <Badge variant="outline" className="text-xs">{unitDef.weight}</Badge>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/50 divide-y divide-border/30">
                    {ut.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Topics coming soon — content is being added by your instructor.
                      </div>
                    ) : (
                      ut.map(topic => {
                        const tp = getTopicProgress(topic.id);
                        return (
                          <Link to={`/courses/${courseCode}/topic/${topic.id}`} key={topic.id}>
                            <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors ml-14">
                              {tp?.status === "completed" ? (
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className="text-sm text-foreground flex-1">{topic.topic_number} {topic.title}</span>
                              <Play className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}