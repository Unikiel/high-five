import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import shuffle from "lodash/shuffle";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { COURSES } from "@/lib/courseData";
import { byCourseCode, byCourseCodeAndUnit, byStudent, courseCodeOf } from "@/lib/legacyFields";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import BackLink from "@/components/BackLink";
import FreeResponseDeck from "@/components/practice/FreeResponseDeck";

export default function FreeResponse() {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState(null);
  const [courseCode, setCourseCode] = useState("");
  const [unitNumber, setUnitNumber] = useState("all");
  const [questions, setQuestions] = useState(null);

  useEffect(() => {
    base44.entities.Enrollment.filter(byStudent(user)).then((enrollments) => {
      const enrolled = COURSES.filter((c) => enrollments.some((e) => courseCodeOf(e) === c.code));
      setEnrolledCourses(enrolled);
      setCourseCode(enrolled[0]?.code || "");
    });
  }, []);

  useEffect(() => {
    if (!courseCode) return;
    let cancelled = false;
    setQuestions(null);
    (async () => {
      const filter = { ...byCourseCode(courseCode), type: "free_response", is_active: true };
      if (unitNumber !== "all") {
        const units = await base44.entities.Unit.filter(byCourseCodeAndUnit(courseCode, Number(unitNumber)));
        filter.unit_id = units[0]?.id || "__none__";
      }
      const rows = await base44.entities.Question.filter(filter, "created_date", 500);
      if (!cancelled) setQuestions(shuffle(rows));
    })();
    return () => { cancelled = true; };
  }, [courseCode, unitNumber]);

  const course = COURSES.find((c) => c.code === courseCode);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <BackLink to="/dashboard" label="Back to Dashboard" />
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Free-Response Practice</h1>
        <p className="text-muted-foreground mt-1">Write out full answers and get them scored against an AP-style scoring guide</p>
      </div>

      {enrolledCourses === null && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {enrolledCourses?.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground mb-3">Enroll in courses first to practice</p>
          <Button variant="outline" asChild><Link to="/courses">Browse Courses</Link></Button>
        </div>
      )}

      {enrolledCourses?.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Select value={courseCode} onValueChange={(code) => { setCourseCode(code); setUnitNumber("all"); }}>
              <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
              <SelectContent>
                {enrolledCourses.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={unitNumber} onValueChange={setUnitNumber}>
              <SelectTrigger><SelectValue placeholder="Select unit..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {(course?.units || []).map((u) => (
                  <SelectItem key={u.number} value={String(u.number)}>Unit {u.number}: {u.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FreeResponseDeck key={`${courseCode}-${unitNumber}`} questions={questions} />
        </>
      )}
    </div>
  );
}