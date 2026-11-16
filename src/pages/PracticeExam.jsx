import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { byCourseCode } from "@/lib/legacyFields";
import { ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import MathText from "@/components/MathText";
import shuffle from "lodash/shuffle";
import { Textarea } from "@/components/ui/textarea";
import ExamWrittenReview from "@/components/practice/ExamWrittenReview";

const isWritten = (q) => q.type === "free_response";

// A multiple-choice question is worth one point; a written question is worth one point per scoring-guide point.
const tally = (questions, answers, written) => {
  const choice = questions.filter(q => !isWritten(q));
  const essays = questions.filter(isWritten);
  const correct = choice.filter(q => answers[q.id] === q.ans).length;
  const earned = essays.reduce((sum, q) => sum + (written[q.id]?.score || 0), 0);
  const possible = essays.reduce((sum, q) => sum + q.rubric.length, 0);
  const score = Math.round(((correct + earned) / (choice.length + possible)) * 100);
  return { choice, essays, correct, earned, possible, score };
};

// Sample question generator (in production, questions come from DB via LLM)
const generateSampleQuestions = (count, courseId) => {
  const templates = [
    {
      q: "Which of the following statements about limits is true?",
      opts: ["A limit must equal the function value at that point", "A limit can exist even if the function is undefined at that point", "Limits only exist for continuous functions", "If f(a) = L, then lim(x→a) f(x) = L always"],
      ans: "B",
      exp: "A limit describes the behavior of a function near a point, not necessarily at the point itself."
    },
    {
      q: "If f(x) = 3x² - 2x + 1, what is f'(x)?",
      opts: ["6x - 2", "3x - 2", "6x + 1", "3x² - 2"],
      ans: "A",
      exp: "Using the power rule: d/dx[3x²] = 6x, d/dx[-2x] = -2, d/dx[1] = 0. So f'(x) = 6x - 2."
    },
    {
      q: "Which data display is most appropriate for showing the distribution of a quantitative variable?",
      opts: ["Bar chart", "Pie chart", "Histogram", "Scatter plot"],
      ans: "C",
      exp: "A histogram shows the distribution of a single quantitative variable by grouping data into intervals."
    },
    {
      q: "What is the probability that two independent events A and B both occur?",
      opts: ["P(A) + P(B)", "P(A) × P(B)", "P(A) + P(B) - P(A∩B)", "P(A|B) × P(B)"],
      ans: "B",
      exp: "For independent events, P(A and B) = P(A) × P(B)."
    },
    {
      q: "Which statement best describes Newton's Second Law?",
      opts: ["Objects at rest stay at rest", "For every action there is an equal and opposite reaction", "Force equals mass times acceleration", "The net work done equals the change in kinetic energy"],
      ans: "C",
      exp: "Newton's Second Law states F = ma, meaning force equals mass times acceleration."
    }
  ];

  return Array.from({ length: count }, (_, i) => {
    const t = templates[i % templates.length];
    return { id: i + 1, ...t, answered: null };
  });
};

export default function PracticeExam() {
  const { examId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [written, setWritten] = useState({});
  const [grading, setGrading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadExam();
    return () => clearInterval(timerRef.current);
  }, [examId]);

  const loadExam = async () => {
    try {
      const e = await base44.entities.Exam.filter({ id: examId });
      if (e.length > 0) {
        setExam(e[0]);
        const questionBank = await base44.entities.Question.filter({ ...byCourseCode(e[0].course_code ?? e[0].course_id), is_active: true }, "created_date", 2000);
        const filteredBank = e[0].unit_id ? questionBank.filter(q => q.unit_id === e[0].unit_id) : questionBank;
        let picked;
        if (e[0].questions?.length) {
          // Resume: keep the same question set already assigned to this exam
          const byId = new Map(questionBank.map(q => [q.id, q]));
          picked = e[0].questions.map(id => byId.get(id)).filter(Boolean);
        } else {
          // New exam: a random draw from the bank, multiple choice first, then the written section
          picked = [
            ...shuffle(filteredBank.filter(q => !isWritten(q))).slice(0, e[0].total_questions || 10),
            ...shuffle(filteredBank.filter(isWritten)).slice(0, e[0].free_response_count || 0),
          ];
          if (picked.length) {
            base44.entities.Exam.update(e[0].id, { questions: picked.map(q => q.id) }).catch(() => {});
          }
        }
        const selectedQuestions = picked
          .map((q, index) => ({
            id: q.id,
            q: q.question_text,
            opts: q.options || [],
            ans: q.correct_answer,
            exp: q.explanation,
            type: q.type,
            rubric: q.rubric || [],
            answered: null,
            number: index + 1
          }));
        setQuestions(selectedQuestions);
        const mins = e[0].time_limit_minutes || (e[0].total_questions <= 10 ? 15 : e[0].total_questions <= 20 ? 30 : 90);
        setTimeLeft(mins * 60);
        setAnswers(e[0].answers || {});
        timerRef.current = setInterval(() => {
          setTimeLeft(t => {
            if (t <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
            return t - 1;
          });
        }, 1000);
      }
    } catch (e) {}
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    setShowExplanation(false);
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    setGrading(true);
    // Written answers are scored by AI; an unanswered one scores zero without a grading call.
    const essays = questions.filter(isWritten);
    const graded = await Promise.allSettled(essays.map(q =>
      answers[q.id]?.trim()
        ? base44.functions.invoke("gradeFreeResponse", { question_id: q.id, answer: answers[q.id] }).then(res => res.data)
        : { score: 0, max: q.rubric.length, points: [], feedback: "" }
    ));
    const results = {};
    essays.forEach((q, i) => {
      if (graded[i].status === "fulfilled") results[q.id] = graded[i].value;
    });
    try {
      await base44.entities.Exam.update(examId, {
        status: "completed",
        score: tally(questions, answers, results).score,
        answers,
        free_response_results: results,
        completed_at: new Date().toISOString()
      });
    } catch (e) {}
    setWritten(results);
    setGrading(false);
    setSubmitted(true);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!exam) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
        <h2 className="font-display text-2xl font-bold text-foreground">No questions available yet</h2>
        <p className="text-muted-foreground">The question bank is still being prepared for this course or unit.</p>
        <Button onClick={() => navigate("/practice")}>Back to Practice</Button>
      </div>
    );
  }

  if (grading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Scoring your exam...</p>
      </div>
    );
  }

  if (submitted) {
    const { choice, essays, correct, earned, possible, score } = tally(questions, answers, written);
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${score >= 70 ? "bg-green-100 dark:bg-green-950/30" : "bg-red-100 dark:bg-red-950/30"}`}>
              {score >= 70
                ? <CheckCircle className="w-10 h-10 text-green-500" />
                : <AlertCircle className="w-10 h-10 text-red-500" />}
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground mb-1">{score}%</h2>
            <p className="text-muted-foreground">
              {correct}/{choice.length} questions correct
              {essays.length > 0 && ` · ${earned}/${possible} written points`}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold text-green-500">{correct}</p><p className="text-xs text-muted-foreground">Correct</p></div>
              <div><p className="text-2xl font-bold text-red-500">{choice.length - correct}</p><p className="text-xs text-muted-foreground">Incorrect</p></div>
              <div><p className="text-2xl font-bold text-foreground">{score >= 70 ? "Pass" : "Retry"}</p><p className="text-xs text-muted-foreground">Result</p></div>
            </div>
            <div className="flex gap-3 mt-8">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/practice")}>New Exam</Button>
              <Button className="flex-1" onClick={() => navigate("/progress")}>View Progress</Button>
            </div>
          </CardContent>
        </Card>

        {/* Review */}
        <h3 className="font-display text-xl font-semibold">Review Answers</h3>
        <div className="space-y-4">
          {choice.map((q, i) => {
            const userAns = answers[q.id];
            const correct = userAns === q.ans;
            return (
              <Card key={q.id} className={`border-2 ${correct ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {correct ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground mb-2">Q{i + 1}. <MathText text={q.q} /></div>
                      <p className="text-xs text-muted-foreground">Your answer: <span className={correct ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{userAns || "Not answered"}</span></p>
                      {!correct && <p className="text-xs text-muted-foreground">Correct: <span className="text-green-600 font-medium">{q.ans}</span></p>}
                      <div className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded"><MathText text={q.exp} /></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {essays.length > 0 && (
          <>
            <h3 className="font-display text-xl font-semibold">Written Answers</h3>
            <div className="space-y-4">
              {essays.map((q, i) => (
                <ExamWrittenReview key={q.id} question={q} number={choice.length + i + 1} answer={answers[q.id]} result={written[q.id]} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  const q = questions[current];
  const answered = answers[q.id];
  const progress = Math.round(((current + 1) / questions.length) * 100);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur px-6 py-3 flex items-center gap-4">
        <Link to="/practice" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <ChevronLeft className="w-4 h-4" />Exit
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Question {current + 1}/{questions.length}</span>
            <Progress value={progress} className="h-1.5 flex-1 max-w-xs" />
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-mono font-medium ${timeLeft < 120 ? "text-red-500" : "text-foreground"}`}>
          <Clock className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-6">
        {/* Question navigator dots */}
        <div className="flex flex-wrap gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                i === current ? "bg-primary text-white" :
                answers[questions[i].id] ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" :
                flagged.has(i) ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400" :
                "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="text-foreground font-medium leading-relaxed"><MathText text={q.q} /></div>
              <button
                onClick={() => setFlagged(prev => { const n = new Set(prev); n.has(current) ? n.delete(current) : n.add(current); return n; })}
                className={`flex-shrink-0 ${flagged.has(current) ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {isWritten(q) ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Written response. Show your work; it is scored by AI when you submit the exam.</p>
                <Textarea
                  value={answered || ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder="Type your answer, labelling each part (a), (b), (c)..."
                  className="min-h-56"
                />
              </div>
            ) : (
            <div className="space-y-3">
              {q.opts.map((opt, i) => {
                const letter = ["A", "B", "C", "D"][i];
                return (
                  <button
                    key={letter}
                    onClick={() => handleAnswer(q.id, letter)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                      answered === letter
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      answered === letter ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {letter}
                    </span>
                    <span className="text-sm text-foreground pt-0.5"><MathText text={opt} /></span>
                  </button>
                );
              })}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} className="gap-2">
            <ChevronLeft className="w-4 h-4" />Previous
          </Button>
          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent(c => c + 1)} className="gap-2">
              Next<ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4" />Finish Exam
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}