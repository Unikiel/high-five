import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Dashboard from "@/pages/Dashboard";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import TopicLesson from "@/pages/TopicLesson";
import Practice from "@/pages/Practice";
import PracticeExam from "@/pages/PracticeExam";
import ProgressPage from "@/pages/ProgressPage";
import Tutoring from "@/pages/Tutoring";
import Settings from "@/pages/Settings";

// Admin Pages
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminReports from "@/pages/admin/AdminReports";
import AdminSessions from "@/pages/admin/AdminSessions";
import AdminBilling from "@/pages/admin/AdminBilling";

// Auth Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import Layout from "@/components/Layout";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected student + staff routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseCode" element={<CourseDetail />} />
          <Route path="/courses/:courseCode/topic/:topicId" element={<TopicLesson />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/practice/exam/:examId" element={<PracticeExam />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/tutoring" element={<Tutoring />} />
          <Route path="/settings" element={<Settings />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/courses" element={<Courses />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/sessions" element={<AdminSessions />} />
          <Route path="/admin/billing" element={<AdminBilling />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;