import { useState } from "react";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FreeResponseCard from "@/components/practice/FreeResponseCard";

/** Steps through a list of written questions one at a time. `questions` is null while loading. */
export default function FreeResponseDeck({ questions }) {
  const [index, setIndex] = useState(0);

  if (questions === null) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border">
        <CardContent className="p-10 text-center">
          <PenLine className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No written questions here yet</h3>
          <p className="text-sm text-muted-foreground">They are still being prepared for this selection. Try another unit or check back soon.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Question {index + 1} of {questions.length}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            <ChevronLeft className="w-4 h-4" />Previous
          </Button>
          <Button variant="outline" size="sm" className="gap-1" disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>
            Next<ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <FreeResponseCard key={questions[index].id} question={questions[index]} />
    </div>
  );
}