import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getProjectsByUser } from "@/lib/db";
import Header from "@/components/Header";
import ProjectGrid from "@/components/ProjectGrid";

export default async function ProjectsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const projects = await getProjectsByUser(user.id);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--klad-paper)" }}>
      <Header email={user.email ?? ""} />
      <main>
        <ProjectGrid initialProjects={projects} />
      </main>
    </div>
  );
}
