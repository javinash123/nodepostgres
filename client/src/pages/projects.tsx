import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ProjectTable } from "@/components/project-table";

export default function Projects() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <MobileNav />
        
        <div className="p-6" data-testid="projects-content">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Projects</h1>
            <p className="text-muted-foreground">Manage all your IT projects in one place.</p>
          </div>
          
          <ProjectTable />
        </div>
      </main>
    </div>
  );
}
