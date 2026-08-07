import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      window.location.href = "/login?message=password_set";
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        title="This link won't work"
        subtitle="The reset link is incomplete or has expired."
        panelHeadline="One dead link,"
        panelHighlight="not a dead end."
        panelBody="Request a fresh reset email and you'll be back in your courses in a couple of minutes."
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Request a new link
          </Link>
        }
      >
        <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary text-sm text-foreground leading-relaxed">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>Reset links are single-use and expire after an hour. Request a new one to continue.</span>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose something you'll remember on exam morning."
      panelHeadline="New password,"
      panelHighlight="same streak."
      panelBody="Nothing you've completed is lost. Set a new password and your progress picks up exactly where it stopped."
    >
      {error && (
        <div role="alert" className="mb-5 p-3.5 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="hf-field pl-11 h-12 rounded-xl"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="hf-field pl-11 h-12 rounded-xl"
              required
            />
          </div>
        </div>
        <Button
          type="submit"
          className="hf-cta w-full h-12 rounded-xl text-[15px] font-semibold"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving
            </>
          ) : (
            "Save new password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}