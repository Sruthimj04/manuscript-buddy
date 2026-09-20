import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Loader2, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { LoremMark } from "@/components/pub/LoremMark";
import { ROLE_HOME } from "@/components/pub/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/store/app-store";
import * as otpService from "@/services/otpService";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Author Signup — LOREM" },
      { name: "description", content: "Create your author account and verify your phone number to start submitting manuscripts." },
      { property: "og:title", content: "Author Signup — LOREM" },
      { property: "og:description", content: "Sign up as an author with phone OTP verification." },
    ],
  }),
  component: SignupPage,
});

type Phase = "details" | "otp";

const RESEND_COOLDOWN = 30;

function SignupPage() {
  const { role: activeRole, loading } = useApp();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && activeRole) void navigate({ to: ROLE_HOME[activeRole], replace: true });
  }, [loading, activeRole, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const normalizePhone = (v: string) => {
    let cleaned = v.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+") && !cleaned.startsWith("91") && cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    }
    if (!cleaned.startsWith("+")) cleaned = "+" + cleaned;
    return cleaned;
  };

  function validateDetails(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e["fullName"] = "Full name is required.";
    if (!email.trim()) e["email"] = "Email is required.";
    else if (!validateEmail(email.trim())) e["email"] = "Please enter a valid email address.";
    if (!phone.trim()) e["phone"] = "Phone number is required.";
    else {
      const normalized = normalizePhone(phone.trim());
      const digitsOnly = normalized.replace(/\D/g, "");
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        e["phone"] = "Please enter a valid phone number with country code.";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSendOtp() {
    if (!validateDetails()) return;
    setSending(true);
    setErrors({});
    try {
      const normalized = normalizePhone(phone.trim());
      await otpService.sendOtp(normalized, fullName.trim(), email.trim());
      setPhase("otp");
      setResendTimer(RESEND_COOLDOWN);
      toast.success("OTP sent to your phone number");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP. Please try again.";
      setErrors({ general: message });
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) {
      setVerifyError("Please enter the complete 6-digit OTP.");
      return;
    }
    setVerifying(true);
    setVerifyError(null);
    try {
      const normalized = normalizePhone(phone.trim());
      const result = await otpService.verifyOtp(normalized, otp);
      if (result.success && result.user) {
        toast.success("Phone verified! Welcome to LOREM.");
        // The backend established the session — reload user info
        // Navigate to dashboard after a short delay to let the session settle
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      } else {
        setVerifyError("Verification failed. Please try again.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid OTP. Please try again.";
      setVerifyError(message);
    } finally {
      setVerifying(false);
    }
  }

  const handleResend = useCallback(async () => {
    if (resendTimer > 0) return;
    try {
      const normalized = normalizePhone(phone.trim());
      await otpService.resendOtp(normalized);
      setResendTimer(RESEND_COOLDOWN);
      setVerifyError(null);
      toast.success("OTP resent to your phone number");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend OTP.";
      setVerifyError(message);
    }
  }, [phone, resendTimer]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-background">
            <LoremMark className="size-5" />
          </span>
          <span className="text-lg font-semibold uppercase tracking-[0.3em]">LOREM</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {phase === "details" ? (
            <>
              <h1 className="font-serif text-3xl font-normal leading-tight tracking-tight">
                Start your publishing journey
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your author account. We'll verify your phone number with a one-time code.
              </p>

              <div className="mt-6 space-y-4">
                {errors["general"] && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {errors["general"]}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    aria-invalid={!!errors["fullName"]}
                  />
                  {errors["fullName"] && <p className="text-xs text-destructive">{errors["fullName"]}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={!!errors["email"]}
                  />
                  {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="pl-10"
                      aria-invalid={!!errors["phone"]}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +91 for India)
                  </p>
                  {errors["phone"] && <p className="text-xs text-destructive">{errors["phone"]}</p>}
                </div>

                <Button onClick={handleSendOtp} className="w-full" disabled={sending}>
                  {sending && <Loader2 className="size-4 animate-spin" />}
                  {sending ? "Sending OTP…" : "Get OTP"}
                </Button>
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setPhase("details");
                  setOtp("");
                  setVerifyError(null);
                }}
                className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>

              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-foreground/10">
                  <ShieldCheck className="size-5 text-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Verify your phone</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to <span className="font-medium text-foreground">{normalizePhone(phone.trim())}</span>
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {verifyError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {verifyError}
                  </div>
                )}

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerifyOtp}
                  className="w-full"
                  disabled={verifying || otp.length < 6}
                >
                  {verifying && <Loader2 className="size-4 animate-spin" />}
                  {verifying ? "Verifying…" : "Verify & Create Account"}
                </Button>

                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Resend OTP in <span className="font-medium tabular-nums">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={() => void handleResend()}
                      className="text-xs font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
