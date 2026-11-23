import Link from "next/link";
import { Logo } from "./icons";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-brand">
        <span className="brand-mark"><Logo size={20} /></span>
        <span>Fit</span>
      </div>
      <p className="auth-lead">Calorías que suben con tus pasos y entrenos. Escanea lo que comes.</p>
      {children}
      <p className="auth-foot">
        <Link href="/privacidad">Privacidad</Link>
      </p>
    </main>
  );
}
