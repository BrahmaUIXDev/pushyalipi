import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="auth-page" data-testid="status-not-found">
      <div className="auth-page-card">
        <span className="brand-mark"><Compass className="size-4" /></span>
        <p className="section-kicker mt-8">THE STARS ARE QUIET HERE</p>
        <h1>This page has<br />drifted away.</h1>
        <p>The reading you are looking for is not part of this chart. Return to the beginning and enter a new birth moment.</p>
        <Button asChild className="w-full">
          <Link href="/" data-testid="link-not-found-home"><ArrowLeft className="size-4" /> Return home</Link>
        </Button>
      </div>
    </div>
  );
}