import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { StatsCards } from "@/components/stats-cards";
import { ProjectTable } from "@/components/project-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, BarChart3, DollarSign } from "lucide-react";
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

  // Generate month-on-month sales data
  const salesData = useMemo(() => {
    if (!filteredProjects?.length) return [];

    const monthlyData = new Map<string, { month: string, sales: number, projectCount: number }>();
    
    // Find date range from all projects to include all project months
    const allProjectDates = filteredProjects.flatMap(project => {
      const dates = [new Date(project.startDate)];
      if (project.completionDate) {
        dates.push(new Date(project.completionDate));
      }
      return dates;
    });
    
    if (allProjectDates.length === 0) return [];

    // Get min and max dates from projects
    const minDate = new Date(Math.min(...allProjectDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allProjectDates.map(d => d.getTime())));
    
    // Extend range to include at least last 12 months and future months if projects exist
    const now = new Date();
    const startDate = new Date(Math.min(minDate.getTime(), now.getTime() - 11 * 30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(Math.max(maxDate.getTime(), now.getTime()));

    // Generate all months in the range
    const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (currentDate <= finalDate) {
      const monthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM format
      const monthName = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      monthlyData.set(monthKey, {
        month: monthName,
        sales: 0,
        projectCount: 0
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Aggregate sales by month based on project START date (as requested by user)
    filteredProjects.forEach(project => {
      // Always use start date for monthly chart display
      const projectDate = new Date(project.startDate);
      const monthKey = projectDate.toISOString().slice(0, 7);
      
      if (monthlyData.has(monthKey)) {
        const data = monthlyData.get(monthKey)!;
        data.sales += parseFloat(project.totalCost); // Use total cost including extensions
        data.projectCount += 1;
        monthlyData.set(monthKey, data);
      }
    });

    return Array.from(monthlyData.values()).sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.month + ' 1');
      const dateB = new Date(b.month + ' 1');
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredProjects]);

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
          
          {/* Revenue Counter by Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Revenue Breakdown - {selectedFinancialYear === "all" ? "All Time" : formatFinancialYear(selectedFinancialYear)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Completed Projects */}
                <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1" data-testid="text-completed-revenue">
                    ₹{filteredProjects
                      ?.filter(p => p.status === 'completed')
                      .reduce((sum, project) => sum + parseFloat(project.totalCost), 0)
                      .toLocaleString('en-IN') || '0'
                    }
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">Completed</p>
                  <p className="text-xs text-muted-foreground">
                    {filteredProjects?.filter(p => p.status === 'completed').length || 0} projects
                  </p>
                </div>

                {/* In Progress Projects */}
                <div className="text-center p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1" data-testid="text-in-progress-revenue">
                    ₹{filteredProjects
                      ?.filter(p => p.status === 'in-progress')
                      .reduce((sum, project) => sum + parseFloat(project.totalCost), 0)
                      .toLocaleString('en-IN') || '0'
                    }
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">In Progress</p>
                  <p className="text-xs text-muted-foreground">
                    {filteredProjects?.filter(p => p.status === 'in-progress').length || 0} projects
                  </p>
                </div>

                {/* On Hold Projects */}
                <div className="text-center p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1" data-testid="text-on-hold-revenue">
                    ₹{filteredProjects
                      ?.filter(p => p.status === 'on-hold')
                      .reduce((sum, project) => sum + parseFloat(project.totalCost), 0)
                      .toLocaleString('en-IN') || '0'
                    }
                  </div>
                  <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">On Hold</p>
                  <p className="text-xs text-muted-foreground">
                    {filteredProjects?.filter(p => p.status === 'on-hold').length || 0} projects
                  </p>
                </div>

                {/* Cancelled Projects */}
                <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1" data-testid="text-cancelled-revenue">
                    ₹{filteredProjects
                      ?.filter(p => p.status === 'cancelled')
                      .reduce((sum, project) => sum + parseFloat(project.totalCost), 0)
                      .toLocaleString('en-IN') || '0'
                    }
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">Cancelled</p>
                  <p className="text-xs text-muted-foreground">
                    {filteredProjects?.filter(p => p.status === 'cancelled').length || 0} projects
                  </p>
                </div>

                {/* Expected Revenue (Total) */}
                <div className="text-center p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="text-2xl font-bold text-primary mb-1" data-testid="text-expected-revenue">
                    ₹{filteredProjects
                      ?.reduce((sum, project) => sum + parseFloat(project.totalCost), 0)
                      .toLocaleString('en-IN') || '0'
                    }
                  </div>
                  <p className="text-xs text-primary font-semibold">Expected Revenue</p>
                  <p className="text-xs text-muted-foreground">
                    {filteredProjects?.length || 0} total projects
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Sales Chart - Full Width */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Month-on-Month Sales & Project Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={salesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    yAxisId="sales"
                    orientation="left"
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="projects"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'sales' ? `₹${value.toLocaleString('en-IN')}` : value,
                      name === 'sales' ? 'Revenue' : 'Projects'
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    yAxisId="sales"
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    yAxisId="projects"
                    type="monotone" 
                    dataKey="projectCount" 
                    stroke="#82ca9d" 
                    strokeWidth={3}
                    dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <ProjectTable projects={filteredProjects} />
        </div>
      </main>
    </div>
  );
}