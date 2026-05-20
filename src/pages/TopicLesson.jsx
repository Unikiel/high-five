import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ChevronLeft, CheckCircle, BookOpen, FileText, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackLink from "@/components/BackLink";

export default function TopicLesson() {
  const { courseCode, topicId } = useParams();
  const { user } = useAuth();
  const [topic, setTopic] = useState(null);
  const [unit, setUnit] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState(null);

  useEffect(() => { loadData(); }, [topicId]);

  const loadData = async () => {
    try {
      const topics = await base44.entities.Topic.filter({ id: topicId });
      if (topics.length > 0) {
        setTopic(topics[0]);
        if (topics[0].lesson_content || topics[0].cheatsheet || topics[0].worked_examples?.length) {
          setContent({
            explanation: topics[0].lesson_content || topics[0].description,
            formulas: topics[0].latex_formulas || [],
            cheatsheet: topics[0].cheatsheet ? topics[0].cheatsheet.split("\n") : topics[0].key_concepts || [],
            examples: topics[0].worked_examples || []
          });
        }
        const units = await base44.entities.Unit.filter({ id: topics[0].unit_id });
        if (units.length > 0) setUnit(units[0]);
      }
      const prog = await base44.entities.Progress.filter({ student_id: user?.email, topic_id: topicId });
      if (prog.length > 0) setProgress(prog[0]);
    } catch (e) {}
    setLoading(false);
  };

  const generateContent = async () => {
    if (!topic) return;
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert AP teacher. Generate comprehensive lesson content for the AP topic: "${topic.title}" (from ${courseCode}).
        
        Provide:
        1. A clear explanation of the key concepts (3-4 paragraphs)
        2. Key formulas or concepts (use LaTeX notation where appropriate, enclosed in $ signs)
        3. A quick cheat sheet summary (5-7 bullet points)
        4. 2-3 example problems with solutions
        
        Format as JSON with keys: explanation, formulas (array of strings with LaTeX), cheatsheet (array of strings), examples (array of {problem, solution})`,
        response_json_schema: {
          type: "object",
          properties: {
            explanation: { type: "string" },
            formulas: { type: "array", items: { type: "string" } },
            cheatsheet: { type: "array", items: { type: "string" } },
            examples: { type: "array", items: { type: "object", properties: { problem: { type: "string" }, solution: { type: "string" } } } }
          }
        }
      });
      setContent(result);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const markComplete = async () => {
    try {
      if (progress?.id) {
        await base44.entities.Progress.update(progress.id, { status: "completed", mastery_score: 100 });
      } else {
        await base44.entities.Progress.create({
          student_id: user?.email,
          course_id: courseCode,
          unit_id: topic?.unit_id,
          topic_id: topicId,
          status: "completed",
          mastery_score: 100,
          last_studied: new Date().toISOString()
        });
      }
      loadData();
    } catch (e) {}
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!topic) return <div className="p-6 text-center text-muted-foreground">Topic not found</div>;

  const isCompleted = progress?.status === "completed";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <BackLink to={`/courses/${courseCode}`} label="Back to Course" />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`/courses/${courseCode}`} className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />{courseCode}
        </Link>
        <span>/ Unit {unit?.unit_number}</span>
        <span>/ {topic.topic_number}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{topic.topic_number}</p>
          <h1 className="font-display text-3xl font-bold text-foreground mt-1">{topic.title}</h1>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {isCompleted ? (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-0 gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />Completed
            </Badge>
          ) : (
            <Button onClick={markComplete} size="sm" variant="outline" className="gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />Mark Complete
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="lesson">
        <TabsList>
          <TabsTrigger value="lesson" className="gap-2"><BookOpen className="w-4 h-4" />Lesson</TabsTrigger>
          <TabsTrigger value="cheatsheet" className="gap-2"><FileText className="w-4 h-4" />Cheat Sheet</TabsTrigger>
          <TabsTrigger value="examples" className="gap-2"><Lightbulb className="w-4 h-4" />Examples</TabsTrigger>
        </TabsList>

        {!content && !generating && (
          <div className="mt-6">
            <Card className="border-dashed border-2 border-border">
              <CardContent className="p-10 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">Lesson content not yet loaded</h3>
                <p className="text-sm text-muted-foreground mb-4">Generate AI-powered lesson content for this topic</p>
                <Button onClick={generateContent} className="gap-2">
                  <Lightbulb className="w-4 h-4" />Generate Lesson
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {generating && (
          <div className="mt-6 flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Generating lesson content...</p>
            </div>
          </div>
        )}

        {content && (
          <>
            <TabsContent value="lesson" className="mt-4">
              <Card className="border-border/50">
                <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap">{content.explanation}</div>
                  {content.formulas?.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-display font-semibold text-foreground mb-3">Key Formulas</h3>
                      <div className="space-y-2">
                        {content.formulas.map((f, i) => (
                          <div key={i} className="bg-muted/50 rounded-lg px-4 py-3 font-mono text-sm text-foreground">
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cheatsheet" className="mt-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Reference — {topic.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {content.cheatsheet?.length > 0 ? (
                    <ul className="space-y-3">
                      {content.cheatsheet.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                          <p className="text-sm text-foreground leading-relaxed">{item}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">No cheat sheet available.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="examples" className="mt-4 space-y-4">
              {content.examples?.length > 0 ? (
                content.examples.map((ex, i) => (
                  <Card key={i} className="border-border/50">
                    <CardContent className="p-5">
                      <div className="mb-3">
                        <Badge variant="secondary" className="text-xs mb-2">Example {i + 1}</Badge>
                        <p className="text-sm font-medium text-foreground">{ex.problem}</p>
                      </div>
                      <div className="border-t border-border/50 pt-3">
                        <p className="text-xs text-muted-foreground font-medium mb-1.5">Solution:</p>
                        <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{ex.solution}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : <p className="text-sm text-muted-foreground">No examples available.</p>}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}