import { Suspense } from "react";
import { PasswordReset } from "@/features/auth/password-reset";
export default function Page() { return <Suspense fallback={null}><PasswordReset /></Suspense>; }
