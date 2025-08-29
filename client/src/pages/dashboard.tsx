import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { StatsCards } from "@/components/stats-cards";
import { ProjectTable } from "@/components/project-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
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
    const now = new Date();
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      monthlyData.set(monthKey, {
        month: monthName,
        sales: 0,
        projectCount: 0
      });
    }

    // Aggregate sales by month based on project completion or start date
    filteredProjects.forEach(project => {
      // Use completion date if available, otherwise use start date
      const projectDate = project.completionDate ? new Date(project.completionDate) : new Date(project.startDate);
      const monthKey = projectDate.toISOString().slice(0, 7);
      
      if (monthlyData.has(monthKey)) {
        const data = monthlyData.get(monthKey)!;
        data.sales += parseFloat(project.budget);
        data.projectCount += 1;
        monthlyData.set(monthKey, data);
      }
    });

    return Array.from(monthlyData.values());
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
          
          {/* Sales Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Month-on-Month Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [
                        `₹${value.toLocaleString('en-IN')}`, 
                        'Sales'
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ fill: '#8884d8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Projects Completed by Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Projects']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Bar dataKey="projectCount" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <ProjectTable projects={filteredProjects} />
        </div>
      </main>
    </div>
  );
}