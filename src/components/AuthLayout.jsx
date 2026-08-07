import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AuthBrandPanel, { Wordmark } from "@/components/AuthBrandPanel";
import { APP_SLOGAN, LOGO_URL } from "@/lib/brand";

export default function AuthLayout({
  title,
  subtitle,
  footer,
  children,
  panelHeadline = "Stay consistent,",
  panelHighlight = "stay confident.",
  panelBody = "Your streak, your practice sets, and your score trajectory are exactly where you left them.",
}) {
  return (
    <div className="min-h-screen flex bg-background">
      <AuthBrandPanel
        headline={panelHeadline}
        highlight={panelHighlight}
        body={panelBody}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Compact brand band stands in for the panel on small screens */}
        <div className="hf-panel relative lg:hidden px-5 pt-6 pb-8 overflow-hidden">
          <Link
            to="/"
            className="relative inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <div className="relative flex items-center gap-3 mt-6">
            <img
              src={LOGO_URL}
              alt=""
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/15"
            />
            <div>
              <Wordmark className="text-lg" />
              <p className="text-xs text-white/50 mt-0.5">{APP_SLOGAN}</p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex justify-end px-8 pt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10 sm:py-12">
          <div className="w-full max-w-[400px]">
            <header className="mb-8">
              <h1 className="font-display text-3xl sm:text-[2.125rem] font-bold tracking-tight text-foreground leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">
                  {subtitle}
                </p>
              )}
            </header>

            {children}

            {footer && (
              <p className="text-center text-sm text-muted-foreground mt-8 pt-6 border-t border-border">
                {footer}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
