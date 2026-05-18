import { Link } from "react-router-dom";
import { CheckCircle, Target, TrendingUp, Calendar, Brain, Shield, BookOpen, Zap, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COURSES } from "@/lib/courseData";

const LOGO_URL = "https://media.base44.com/images/public/6a0b3929bdfa692726f9ff18/64f6122bc_generated_image.png";

export default function Landing() {
  const features = [
    { icon: BookOpen, title: "10 AP Courses", desc: "Full College Board-aligned content for every AP subject you need.", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { icon: Brain, title: "Adaptive Practice", desc: "AI adjusts difficulty based on your mastery and exam scores.", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
    { icon: Target, title: "Exam Simulator", desc: "Practice exams that mirror real AP format with LaTeX-rendered math.", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { icon: TrendingUp, title: "Progress Tracking", desc: "Detailed analytics to identify strengths and target weak areas.", color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
    { icon: Calendar, title: "1-on-1 Tutoring", desc: "Book personalized sessions with AP-certified tutors.", color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30" },
    { icon: Shield, title: "Content Protection", desc: "Secure platform with anti-copy measures to protect your investment.", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-950/30" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-50">
        <div className="flex items-center gap-2.5">
          <img src={LOGO_URL} alt="High Five" className="w-9 h-9 rounded-xl object-cover" />
          <div>
            <span className="font-display font-bold text-foreground text-lg">High Five</span>
            <p className="text-xs text-muted-foreground leading-none">AP Prep Platform</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/pricing"><Button variant="ghost" size="sm">Pricing</Button></Link>
          <Link to="/login"><Button variant="outline" size="sm">Sign In</Button></Link>
          <Link to="/register"><Button size="sm" className="gap-1.5"><Zap className="w-3.5 h-3.5" />Get Started</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 max-w-6xl mx-auto text-center">
        <Badge className="mb-6 bg-primary/10 text-primary border-0 text-sm px-4 py-1.5">
          <Star className="w-3.5 h-3.5 mr-1.5" />Trusted by 1,000+ AP Students
        </Badge>
        <h1 className="font-display text-5xl md:text-7xl font-black text-foreground mb-6 leading-tight">
          Score a <span className="gradient-text">5</span> on Every<br />AP Exam
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
          High Five is the most comprehensive AP prep platform — aligned with every College Board exam description, 
          with adaptive practice exams and expert tutoring.
        </p>
        <p className="text-base text-muted-foreground italic mb-10">Stay consistent, stay confident.</p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="gap-2 text-base px-8 h-12">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline" className="text-base px-8 h-12">View Pricing</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">7-day free trial • No credit card required</p>
      </section>

      {/* Courses */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-3">10 AP Courses Covered</h2>
          <p className="text-muted-foreground text-center mb-10">Every course strictly aligned with College Board Exam Descriptions</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {COURSES.map(course => (
              <div key={course.code} className="bg-background rounded-2xl p-4 border border-border/50 hover:shadow-md transition-all text-center group">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl text-white shadow-sm group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: course.color }}>
                  {course.icon}
                </div>
                <h3 className="text-xs font-semibold text-foreground leading-tight">{course.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-foreground text-center mb-3">Everything you need to score a 5</h2>
        <p className="text-muted-foreground text-center mb-12">A complete AP prep ecosystem built by educators</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="p-6 rounded-2xl border border-border/50 bg-background hover:shadow-md transition-all card-hover">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="font-display font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <h2 className="font-display text-4xl font-bold text-foreground mb-4">Ready to ace your AP exams?</h2>
        <p className="text-muted-foreground text-lg mb-8">Join thousands of students who earned their 5 with High Five.</p>
        <Link to="/register">
          <Button size="lg" className="gap-2 text-base px-10 h-12">
            <Zap className="w-4 h-4" />Start Your Free Trial
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={LOGO_URL} alt="High Five" className="w-6 h-6 rounded-lg" />
          <span className="font-display font-bold text-foreground">High Five</span>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 High Five AP Prep. All rights reserved.</p>
      </footer>
    </div>
  );
}