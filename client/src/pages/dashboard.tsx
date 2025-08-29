import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { StatsCards } from "@/components/stats-cards";
import { ProjectTable } from "@/components/project-table";

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <MobileNav />
        
        <div className="p-6" data-testid="dashboard-content">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's an overview of your projects.</p>
          </div>
          
          <StatsCards />
          <ProjectTable />
        </div>
      </main>
    </div>
  );
}
