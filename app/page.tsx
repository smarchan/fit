import App from "@/components/App";
import { devAuth } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default function Page() {
  return <App devAuth={devAuth()} />;
}
