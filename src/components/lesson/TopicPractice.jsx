import { useState, useEffect } from "react";
import shuffle from "lodash/shuffle";
import { Target } from "lucide-react";
import { base44 } from "@/api/base44Client";
import QuickCheckQuestion from "@/components/practice/QuickCheckQuestion";
import FreeResponseCard from "@/components/practice/FreeResponseCard";

const CHOICE_COUNT = 3;
const WRITTEN_COUNT = 1;

/** End-of-lesson practice: a few multiple-choice questions and a written one, drawn at random from this topic. */
export default function TopicPractice({ topicId }) {
  const [questions, setQuestions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setQuestions(null);
    base44.entities.Question.filter({ topic_id: topicId, is_active: true }, "created_date", 50).then((rows) => {
      if (cancelled) return;
      const mixed = shuffle(rows);
      setQuestions([
        ...mixed.filter((q) => q.type === "multiple_choice").slice(0, CHOICE_COUNT),
        ...mixed.filter((q) => q.type === "free_response").slice(0, WRITTEN_COUNT),
      ]);
    });
    return () => { cancelled = true; };
  }, [topicId]);

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" /> Check Your Understanding
      </h2>
      {questions === null && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {questions?.length === 0 && (
        <p className="text-sm text-muted-foreground">Practice questions for this topic are still being prepared.</p>
      )}
      {questions?.map((question, index) => (
        question.type === "free_response"
          ? <FreeResponseCard key={question.id} question={question} />
          : <QuickCheckQuestion key={question.id} question={question} number={index + 1} />
      ))}
    </section>
  );
}