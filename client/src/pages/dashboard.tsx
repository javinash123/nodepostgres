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

  // Filter for recent projects - show only in-progress projects
  const recentInProgressProjects = useMemo(() => {
    if (!filteredProjects) return [];
    
    return filteredProjects.filter(project => project.status === 'in-progress');
  }, [filteredProjects]);

  // Generate month-on-month sales data
  const salesData = useMemo(() => {
    if (!filteredProjects?.length) return [];

    const monthlyData = new Map<string, { month: string, sales: number, projectCount: number }>();
    
    let startDate: Date;
    let endDate: Date;
    const now = new Date();
    
    if (selectedFinancialYear === "all") {
      // For "All Years", show from oldest project start date to current month
      // Parse dates safely to avoid timezone issues
      const parseProjectDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return { year, month: month - 1 }; // Convert to 0-indexed month
      };
      
      const projectStartDates = filteredProjects.map(project => {
        const startDateStr = typeof project.startDate === 'string' ? project.startDate : project.startDate.toISOString().split('T')[0];
        return parseProjectDate(startDateStr);
      });
      
      if (projectStartDates.length === 0) return [];
      
      // Find oldest year and month
      const oldestYearMonth = projectStartDates.reduce((oldest, current) => {
        if (current.year < oldest.year || (current.year === oldest.year && current.month < oldest.month)) {
          return current;
        }
        return oldest;
      });
      
      startDate = new Date(oldestYearMonth.year, oldestYearMonth.month, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // For specific financial year, show April to March of that FY
      const [startYear] = selectedFinancialYear.split('-').map(Number);
      startDate = new Date(startYear, 3, 1); // April (month 3 in 0-indexed)
      endDate = new Date(startYear + 1, 2, 1); // March of next year (month 2 in 0-indexed)
    }

    // Generate all months in the range - fix the month iteration
    const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const finalMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (currentMonth <= finalMonth) {
      // Use local date formatting to avoid timezone issues
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
      const monthKey = `${year}-${month}`; // YYYY-MM format
      const monthName = currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      monthlyData.set(monthKey, {
        month: monthName,
        sales: 0,
        projectCount: 0
      });
      
      // Move to next month
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Aggregate sales by month based on project START date (as requested by user)
    filteredProjects.forEach(project => {
      // Parse the start date safely to avoid timezone issues  
      const startDateStr = typeof project.startDate === 'string' ? project.startDate : project.startDate.toISOString().split('T')[0];
      const dateParts = startDateStr.split('-');
      if (dateParts.length !== 3) {
        console.warn('Invalid start date format for project:', project.id, project.startDate);
        return;
      }
      
      const [yearStr, monthStr, dayStr] = dateParts;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      
      // Skip invalid dates
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        console.warn('Invalid start date values for project:', project.id, project.startDate);
        return;
      }
      
      const monthKey = `${year}-${monthStr.padStart(2, '0')}`; // YYYY-MM format
      
      if (monthlyData.has(monthKey)) {
        const data = monthlyData.get(monthKey)!;
        // Ensure totalCost is properly parsed - handle both string and number
        const totalCost = typeof project.totalCost === 'string' ? parseFloat(project.totalCost) : project.totalCost;
        data.sales += isNaN(totalCost) ? 0 : totalCost;
        data.projectCount += 1;
        monthlyData.set(monthKey, data);
      } else {
        // If month key doesn't exist, add it dynamically (shouldn't happen but safety net)
        const reconstructedDate = new Date(year, month - 1, 1);
        const monthName = reconstructedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const totalCost = typeof project.totalCost === 'string' ? parseFloat(project.totalCost) : project.totalCost;
        monthlyData.set(monthKey, {
          month: monthName,
          sales: isNaN(totalCost) ? 0 : totalCost,
          projectCount: 1
        });
      }
    });

    // Convert to array and sort by date (not by month string)
    const result = Array.from(monthlyData.entries())
      .map(([key, value]) => ({ ...value, sortKey: key }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ sortKey, ...rest }) => rest);

    return result;
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
          
          <ProjectTable projects={recentInProgressProjects} title="In-Progress Projects" />
        </div>
      </main>
    </div>
  );
}