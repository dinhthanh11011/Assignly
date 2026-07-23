import { Suspense } from "react";
import { CheckCircle2, Repeat, Shuffle, Bell } from "lucide-react";
import { SignInButton } from "@/components/signin-button";

const features = [
  { icon: Repeat, text: "Recurring & scheduled tasks" },
  { icon: Shuffle, text: "Smart & random assignment" },
  { icon: Bell, text: "Push reminders when unassigned" },
  { icon: CheckCircle2, text: "Reports & completion tracking" },
];

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))] shadow-lg">
            <CheckCircle2 className="size-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Assign<span className="text-primary">ly</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Share and rotate daily tasks with your group.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-xl">
          <ul className="mb-6 space-y-3">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <f.icon className="size-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
          <Suspense>
            <SignInButton />
          </Suspense>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to keep your group tidy. 🙂
          </p>
        </div>
      </div>
    </main>
  );
}
