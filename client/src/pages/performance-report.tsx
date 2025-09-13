import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Search, TrendingUp, Users, DollarSign, Calendar, BarChart3, PieChart, LineChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, LineChart as RechartsLineChart, Line, Area, AreaChart } from "recharts";
import type { Employee, ProjectWithDetails } from "@shared/schema";

// Types for Profit/Loss Analysis
type ProfitLossAnalysis = {
  overallProfit: number;
  totalRevenue: number;
  totalCosts: number;
  profitMargin: number;
  projectAnalysis: Array<{
    projectId: string;
    projectName: string;
    revenue: number;
    employeeCosts: number;
    profit: number;
    profitMargin: number;
    duration: number;
    status: string;
    financialYear: string;
  }>;
  employeeAnalysis: Array<{
    employeeId: string;
    employeeName: string;
    totalSalaryCost: number;
    projectsWorked: number;
    revenueGenerated: number;
    profitContribution: number;
    utilizationRate: number;
  }>;
  financialYearBreakdown: Array<{
    financialYear: string;
    revenue: number;
    costs: number;
    profit: number;
    profitMargin: number;
    projectCount: number;
  }>;
};

export default function PerformanceReport() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const { data: projects } = useQuery<ProjectWithDetails[]>({
    queryKey: ['/api/projects'],
  });

  const { data: profitLossAnalysis, isLoading: analysisLoading, isError: analysisError, error } = useQuery<ProfitLossAnalysis>({
    queryKey: ['/api/analysis/profit-loss'],
  });

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!employees || !searchTerm.trim()) return employees || [];
    
    const searchLower = searchTerm.toLowerCase();
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(searchLower) ||
      employee.employeeCode.toLowerCase().includes(searchLower) ||
      employee.designation.toLowerCase().includes(searchLower)
    );
  }, [employees, searchTerm]);

  // Calculate performance metrics for each employee
  const employeePerformanceData = useMemo(() => {
    if (!filteredEmployees || !projects) return [];

    return filteredEmployees.map(employee => {
      const employeeProjects = projects.filter(project => 
        project.assignedEmployees.some(emp => emp.id === employee.id)
      );

      const totalProjectValue = employeeProjects.reduce((sum, project) => 
        sum + parseFloat(project.totalCost), 0
      );

      const completedProjects = employeeProjects.filter(p => p.status === 'completed').length;
      const inProgressProjects = employeeProjects.filter(p => p.status === 'in-progress').length;
      const totalProjects = employeeProjects.length;

      return {
        employee,
        totalProjects,
        completedProjects,
        inProgressProjects,
        totalProjectValue,
        avgProjectValue: totalProjects > 0 ? totalProjectValue / totalProjects : 0,
        completionRate: totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0,
      };
    });
  }, [filteredEmployees, projects]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  if (employeesLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <MobileNav />
          <div className="p-6 flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading performance data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <MobileNav />
        
        <div className="p-6" data-testid="performance-content">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Performance Report</h1>
            <p className="text-muted-foreground">Analyze employee performance and project involvement metrics.</p>
          </div>

          {/* Search Bar */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Employee Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, employee code, or designation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-employees"
                />
              </div>
            </CardContent>
          </Card>

          {/* Employee Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employeePerformanceData.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No employees found matching your search." : "No employees found. Add employees to view performance data."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              employeePerformanceData.map(({ employee, totalProjects, completedProjects, inProgressProjects, totalProjectValue, avgProjectValue, completionRate }) => (
                <Card key={employee.id} className="hover:shadow-md transition-shadow" data-testid={`employee-card-${employee.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-card-foreground truncate" data-testid={`text-employee-name-${employee.id}`}>
                          {employee.name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">{employee.designation}</p>
                        <p className="text-xs text-muted-foreground">{employee.employeeCode}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Project Statistics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid={`text-total-projects-${employee.id}`}>
                          {totalProjects}
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">Total Projects</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400" data-testid={`text-completed-projects-${employee.id}`}>
                          {completedProjects}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300">Completed</div>
                      </div>
                    </div>

                    {/* Current Salary */}
                    {employee.salary && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          Current Salary:
                        </span>
                        <span className="font-medium" data-testid={`text-salary-${employee.id}`}>
                          {formatCurrency(parseFloat(employee.salary))}
                        </span>
                      </div>
                    )}

                    {/* Project Value */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Project Value:</span>
                      <span className="font-medium" data-testid={`text-project-value-${employee.id}`}>
                        {formatCurrency(totalProjectValue)}
                      </span>
                    </div>

                    {/* Completion Rate */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Completion Rate:</span>
                        <Badge variant={completionRate >= 80 ? "default" : completionRate >= 60 ? "secondary" : "destructive"} data-testid={`badge-completion-rate-${employee.id}`}>
                          {completionRate.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(completionRate, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* In Progress Projects */}
                    {inProgressProjects > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          In Progress:
                        </span>
                        <span className="font-medium text-orange-600 dark:text-orange-400" data-testid={`text-in-progress-${employee.id}`}>
                          {inProgressProjects} projects
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* AI-Powered Profit/Loss Analysis */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                AI-Powered Profit/Loss Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Calculating profit/loss analytics...</p>
                </div>
              ) : analysisError ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Unable to load analysis data</p>
                  <p className="text-sm text-muted-foreground">
                    {error?.message?.includes('401') || error?.message?.includes('Not authenticated') 
                      ? 'Please sign in to view profit/loss analytics.' 
                      : 'There was an error loading the analysis. Please try again later.'}
                  </p>
                  {error?.message?.includes('401') && (
                    <button 
                      onClick={() => window.location.href = '/login'}
                      className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                      data-testid="button-login"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              ) : profitLossAnalysis ? (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                    <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
                    <TabsTrigger value="employees" data-testid="tab-employees">Employees</TabsTrigger>
                    <TabsTrigger value="financial" data-testid="tab-financial">By Year</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6">
                    {/* Overall Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                              <p className="text-2xl font-bold text-green-600" data-testid="text-total-revenue">
                                {formatCurrency(profitLossAnalysis.totalRevenue)}
                              </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Costs</p>
                              <p className="text-2xl font-bold text-red-600" data-testid="text-total-costs">
                                {formatCurrency(profitLossAnalysis.totalCosts)}
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-red-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Overall Profit</p>
                              <p className={`text-2xl font-bold ${profitLossAnalysis.overallProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-overall-profit">
                                {formatCurrency(profitLossAnalysis.overallProfit)}
                              </p>
                            </div>
                            <BarChart3 className={`h-8 w-8 ${profitLossAnalysis.overallProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                              <p className={`text-2xl font-bold ${profitLossAnalysis.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-profit-margin">
                                {profitLossAnalysis.profitMargin.toFixed(1)}%
                              </p>
                            </div>
                            <PieChart className={`h-8 w-8 ${profitLossAnalysis.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Financial Year Breakdown Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Financial Year Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={profitLossAnalysis.financialYearBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="financialYear" />
                            <YAxis />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                            <Bar dataKey="costs" fill="#ef4444" name="Costs" />
                            <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="projects" className="space-y-4">
                    <div className="grid gap-4">
                      {profitLossAnalysis.projectAnalysis.map((project, index) => (
                        <Card key={project.projectId} data-testid={`project-analysis-${index}`}>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg">{project.projectName}</h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Status: <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>{project.status}</Badge></span>
                                  <span>Duration: {project.duration} days</span>
                                  <span>FY: {project.financialYear}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(project.profit)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {project.profitMargin.toFixed(1)}% margin
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Revenue</p>
                                <p className="font-medium text-green-600">{formatCurrency(project.revenue)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Employee Costs</p>
                                <p className="font-medium text-red-600">{formatCurrency(project.employeeCosts)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Profit</p>
                                <p className={`font-medium ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(project.profit)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="employees" className="space-y-4">
                    <div className="grid gap-4">
                      {profitLossAnalysis.employeeAnalysis.map((emp, index) => (
                        <Card key={emp.employeeId} data-testid={`employee-analysis-${index}`}>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg">{emp.employeeName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {emp.projectsWorked} projects • {emp.utilizationRate.toFixed(1)}% utilization
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${emp.profitContribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(emp.profitContribution)}
                                </p>
                                <p className="text-sm text-muted-foreground">Contribution</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Revenue Generated</p>
                                <p className="font-medium text-green-600">{formatCurrency(emp.revenueGenerated)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Salary Cost</p>
                                <p className="font-medium text-red-600">{formatCurrency(emp.totalSalaryCost)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Utilization</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={emp.utilizationRate} className="flex-1" />
                                  <span className="text-xs font-medium">{emp.utilizationRate.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="financial">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Financial Year Trends</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={400}>
                            <AreaChart data={profitLossAnalysis.financialYearBreakdown}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="financialYear" />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                              <Area type="monotone" dataKey="profit" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                      
                      <div className="grid gap-4">
                        {profitLossAnalysis.financialYearBreakdown.map((fy, index) => (
                          <Card key={fy.financialYear} data-testid={`fy-analysis-${index}`}>
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg">FY {fy.financialYear}</h3>
                                <div className="text-right">
                                  <p className={`text-lg font-bold ${fy.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(fy.profit)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{fy.profitMargin.toFixed(1)}% margin</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Projects</p>
                                  <p className="font-medium">{fy.projectCount}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Revenue</p>
                                  <p className="font-medium text-green-600">{formatCurrency(fy.revenue)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Costs</p>
                                  <p className="font-medium text-red-600">{formatCurrency(fy.costs)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Profit</p>
                                  <p className={`font-medium ${fy.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(fy.profit)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No analysis data available</p>
                  <p className="text-sm text-muted-foreground">
                    Add projects and employees with salary data to see profit/loss analysis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}