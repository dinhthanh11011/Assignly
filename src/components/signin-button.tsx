"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="gradient"
      size="lg"
      className="w-full"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl });
      }}
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path
          fill="currentColor"
          d="M12.24 10.4V14h5.06c-.22 1.4-1.6 4.1-5.06 4.1-3.05 0-5.54-2.52-5.54-5.6s2.49-5.6 5.54-5.6c1.73 0 2.9.73 3.56 1.36l2.43-2.34C16.9 4.02 14.79 3 12.24 3 7.03 3 2.8 7.2 2.8 12.5S7.03 22 12.24 22c6.05 0 8.99-4.25 8.99-8.5 0-.57-.06-1-.14-1.44l-8.85-.66z"
        />
      </svg>
      {loading ? "Đang chuyển hướng…" : "Tiếp tục với Google"}
    </Button>
  );
}
