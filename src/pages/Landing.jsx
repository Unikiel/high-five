import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckCircle, Target, TrendingUp, Calendar, Brain, Shield, BookOpen, Zap, Star, ArrowRight, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COURSES } from "@/lib/courseData";
import { base44 } from "@/api/base44Client";
import { getDisplayName, getInitial } from "@/lib/userDisplay";

const LOGO_URL = "https://media.base44.com/images/public/6a0b3929bdfa692726f9ff18/74b6eb74e_image.png";

export default function Landing() {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
    setCurrentUser(null);
    navigate("/");
  };
  const features = [
    { icon: BookOpen, title: "10 Courses", desc: "Full College Board-aligned content for every subject you need.", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { icon: Brain, title: "Adaptive Practice", desc: "AI adjusts difficulty based on your mastery and exam scores.", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
    { icon: Target, title: "Exam Simulator", desc: "Practice exams that mirror real formats with LaTeX-rendered math.", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { icon: TrendingUp, title: "Progress Tracking", desc: "Detailed analytics to identify strengths and target weak areas.", color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
    { icon: Calendar, title: "1-on-1 Tutoring", desc: "Book personalized sessions with certified tutors.", color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30" },
    { icon: Shield, title: "Content Protection", desc: "Secure platform with anti-copy measures to protect your investment.", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-950/30" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-50 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <img src={LOGO_URL} alt="High Five" className="w-9 h-9 sm:w-9 sm:h-9 rounded-xl object-cover flex-shrink-0" />
          <div className="hidden sm:block min-w-0">
            <span className="font-display font-bold text-foreground text-lg leading-tight">High Five</span>
            <p className="text-xs text-muted-foreground leading-none">Exam Prep Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <Link to="/pricing"><Button variant="ghost" size="sm" className="px-2.5 sm:px-3">Pricing</Button></Link>
          {currentUser ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={getDisplayName(currentUser)} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                    {getInitial(currentUser)}
                  </div>
                )}
                <span className="hidden sm:block font-medium text-foreground">{getDisplayName(currentUser)}</span>
              </div>
              <Link to="/dashboard"><Button size="sm" className="gap-1.5 px-3 sm:px-4" aria-label="Dashboard"><LayoutDashboard className="w-3.5 h-3.5" /><span className="hidden sm:inline">Dashboard</span></Button></Link>
              <Button size="sm" variant="ghost" onClick={handleLogout} className="gap-1.5 px-3 sm:px-4" aria-label="Logout"><LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Logout</span></Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="outline" size="sm">Sign In</Button></Link>
              <Link to="/register"><Button size="sm" className="gap-1.5"><Zap className="w-3.5 h-3.5" />Get Started</Button></Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 sm:px-6 py-14 sm:py-16 md:py-20 max-w-6xl mx-auto text-center">
        <Badge className="mb-5 sm:mb-6 bg-primary/10 text-primary border-0 text-xs sm:text-sm px-3 sm:px-4 py-1.5">
          <Star className="w-3.5 h-3.5 mr-1.5" />Trusted by 1,000+ Students
        </Badge>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-5 sm:mb-6 leading-[1.05] tracking-tight">
          Score a <span className="gradient-text">5</span> on Every<br className="hidden sm:block" /> Exam
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
          High Five is the most comprehensive exam prep platform — aligned with every College Board and international exam descriptions, 
          with adaptive practice exams and expert tutoring.
        </p>
        <p className="text-sm sm:text-base text-muted-foreground italic mb-8 sm:mb-10">Stay consistent, stay confident.</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-none mx-auto">
          <Link to="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto gap-2 text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/pricing" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12">View Pricing</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">7-day free trial • No credit card required</p>

        {/* Social proof avatars */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <div className="flex -space-x-3">
            {[
              { initial: "A", color: "bg-blue-500" },
              { initial: "M", color: "bg-purple-500" },
              { initial: "J", color: "bg-emerald-500" },
              { initial: "S", color: "bg-orange-500" },
              { initial: "L", color: "bg-pink-500" },
            ].map((student, i) => (
              <div
                key={i}
                className={`w-9 h-9 rounded-full border-2 border-background ${student.color} flex items-center justify-center text-white text-xs font-display font-bold shadow-sm`}
                aria-label="Student success avatar"
              >
                {student.initial}
              </div>
            ))}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">1,000+ students</span> scored a 5</p>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="px-4 sm:px-6 py-12 sm:py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">10 Courses Covered</h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center mb-8 sm:mb-10">Comprehensive content for all major exam curricula</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
      <section className="px-4 sm:px-6 py-12 sm:py-16 max-w-6xl mx-auto">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-3">Everything you need to score a 5</h2>
        <p className="text-sm sm:text-base text-muted-foreground text-center mb-8 sm:mb-12">A complete AP prep ecosystem built by educators</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
      <section className="px-4 sm:px-6 py-14 sm:py-20 text-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">Ready to ace your exams?</h2>
        <p className="text-sm sm:text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Join thousands of students who mastered their exams with High Five.</p>
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
        <p className="text-sm text-muted-foreground">© 2026 High Five. All rights reserved.</p>
      </footer>
    </div>
  );
}