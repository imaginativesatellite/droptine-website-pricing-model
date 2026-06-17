import { redirect } from "next/navigation";

export default function Home() {
  // Signed-in users go to the dashboard; everyone else is bounced to login.
  redirect("/dashboard");
}
