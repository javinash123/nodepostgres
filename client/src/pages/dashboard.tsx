import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { StatsCards } from "@/components/stats-cards";
import { ProjectTable } from "@/components/project-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { getFinancialYear, getCurrentFinancialYear, formatFinancialYear, isDateInFinancialYear } from "@/lib/utils";
import type { ProjectWithDetails } from "@shared/schema";

export default function Dashboard() {
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>("all");
  
  const { data: projects } = useQuery<ProjectWithDetails[]>({
    queryKey: ['/api/projects'],
  });

  // Generate available financial years from project data
  const availableFinancialYears = useMemo(() => {
    if (!projects) return [];
    
    const financialYears = new Set<string>();
    
    // Add current financial year
    const currentFY = getCurrentFinancialYear();
    financialYears.add(currentFY);
    
    // Add financial years from existing projects
    projects.forEach(project => {
      const projectFY = getFinancialYear(new Date(project.startDate));
      financialYears.add(projectFY);
    });
    
    // Sort financial years in descending order
    return Array.from(financialYears).sort((a, b) => {
      const [aStart] = a.split('-').map(Number);
      const [bStart] = b.split('-').map(Number);
      return bStart - aStart;
    });
  }, [projects]);

  // Filter projects based on selected financial year
  const filteredProjects = useMemo(() => {
    if (!projects || selectedFinancialYear === "all") return projects || [];
    
    return projects.filter(project => 
      isDateInFinancialYear(new Date(project.startDate), selectedFinancialYear)
    );
  }, [projects, selectedFinancialYear]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <MobileNav />
        
        <div className="p-6" data-testid="dashboard-content">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back! Here's an overview of your projects.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="financial-year" className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Financial Year:
                </Label>
                <Select
                  value={selectedFinancialYear}
                  onValueChange={setSelectedFinancialYear}
                  data-testid="select-financial-year"
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select FY" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableFinancialYears.map((fy) => (
                      <SelectItem key={fy} value={fy}>
                        {formatFinancialYear(fy)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <StatsCards selectedFinancialYear={selectedFinancialYear} />
          <ProjectTable projects={filteredProjects} />
        </div>
      </main>
    </div>
  );
}