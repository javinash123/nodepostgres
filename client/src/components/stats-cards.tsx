import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FolderKanban, CheckCircle, Clock, Users, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { isDateInFinancialYear } from "@/lib/utils";
import type { ProjectWithDetails } from "@shared/schema";

interface Stats {
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  totalClients: number;
  totalEmployees: number;
}

interface StatsCardsProps {
  selectedFinancialYear?: string;
}

export function StatsCards({ selectedFinancialYear = "all" }: StatsCardsProps) {
  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ['/api/projects'],
  });
  
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/clients'],
  });
  
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/employees'],
  });

  const isLoading = projectsLoading || clientsLoading || employeesLoading;

  // Calculate filtered stats based on financial year
  const stats = useMemo(() => {
    if (!projects || !clients || !employees) return null;
    
    // Filter projects by financial year if selected
    const filteredProjects = selectedFinancialYear === "all" 
      ? projects 
      : projects.filter(project => 
          isDateInFinancialYear(new Date(project.startDate), selectedFinancialYear)
        );
    
    return {
      totalProjects: filteredProjects.length,
      completedProjects: filteredProjects.filter(p => p.status === 'completed').length,
      inProgressProjects: filteredProjects.filter(p => p.status === 'in-progress').length,
      totalClients: selectedFinancialYear === "all" ? clients.length : 
        new Set(filteredProjects.map(p => p.clientId)).size,
      totalEmployees: employees.length // Employee count doesn't change by financial year
    };
  }, [projects, clients, employees, selectedFinancialYear]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-muted rounded-lg animate-pulse">
                  <div className="w-5 h-5 bg-muted-foreground/20 rounded"></div>
                </div>
                <div className="ml-4">
                  <div className="h-4 bg-muted-foreground/20 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-muted-foreground/20 rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Projects",
      value: stats?.totalProjects || 0,
      icon: FolderKanban,
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      testId: "stats-total-projects"
    },
    {
      title: "Completed",
      value: stats?.completedProjects || 0,
      icon: CheckCircle,
      bgColor: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      testId: "stats-completed-projects"
    },
    {
      title: "In Progress",
      value: stats?.inProgressProjects || 0,
      icon: Clock,
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      testId: "stats-in-progress-projects"
    },
    {
      title: "Total Clients",
      value: stats?.totalClients || 0,
      icon: Users,
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      testId: "stats-total-clients"
    },
    {
      title: "Total Employees",
      value: stats?.totalEmployees || 0,
      icon: UserCheck,
      bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      testId: "stats-total-employees"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                  <Icon className={stat.iconColor} size={20} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p 
                    className="text-2xl font-bold text-card-foreground" 
                    data-testid={stat.testId}
                  >
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
