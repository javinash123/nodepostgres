import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Eye, Plus, Trash2, Kanban, List } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProjectWithDetails } from "@shared/schema";
import { ProjectForm } from "./project-form";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColors = {
  'planning': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
  'completed': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  'on-hold': 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200',
};

export function ProjectTable() {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithDetails | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ['/api/projects'],
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => apiRequest('DELETE', `/api/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Project deleted",
        description: "The project has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete the project. Please try again.",
      });
    }
  });

  const handleEdit = (project: ProjectWithDetails) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingProject(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(amount));
  };

  const renderKanbanView = () => {
    const statusColumns = {
      planning: projects?.filter(p => p.status === 'planning') || [],
      'in-progress': projects?.filter(p => p.status === 'in-progress') || [],
      completed: projects?.filter(p => p.status === 'completed') || [],
      'on-hold': projects?.filter(p => p.status === 'on-hold') || [],
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(statusColumns).map(([status, statusProjects]) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                {status.replace('-', ' ')} ({statusProjects.length})
              </h3>
              <div className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors]?.split(' ')[0]}`}></div>
            </div>
            <div className="space-y-3">
              {statusProjects.map((project) => (
                <Card key={project.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm">{project.name}</h4>
                      <p className="text-xs text-muted-foreground">{project.client?.name}</p>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-medium">{formatCurrency(project.totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Due:</span>
                      <span>{formatDate(project.endDate)}</span>
                    </div>
                    <div className="flex gap-1 pt-2">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="ghost" size="sm" className="flex-1" data-testid={`button-view-${project.id}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(project)}
                        data-testid={`button-edit-${project.id}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted-foreground/20 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-muted-foreground/20 rounded w-32 animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted-foreground/10 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Recent Projects</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  data-testid="button-table-view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  data-testid="button-kanban-view"
                >
                  <Kanban className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleAdd}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-add-project"
              >
                <Plus className="mr-2" size={16} />
                Add Project
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {viewMode === 'kanban' ? (
          <CardContent className="p-6">
            {renderKanbanView()}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {projects?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No projects found. Create your first project to get started.
                  </td>
                </tr>
              ) : (
                projects?.map((project) => (
                  <tr key={project.id} data-testid={`project-row-${project.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-card-foreground">{project.name}</div>
                      <div className="text-sm text-muted-foreground">{project.clientSource || 'Direct'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground" data-testid={`project-client-${project.id}`}>
                      {project.client?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant="secondary"
                        className={statusColors[project.status as keyof typeof statusColors] || statusColors.planning}
                        data-testid={`project-status-${project.id}`}
                      >
                        {project.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground" data-testid={`project-end-date-${project.id}`}>
                      {formatDate(project.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground" data-testid={`project-budget-${project.id}`}>
                      {formatCurrency(project.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <div className="flex space-x-2">
                        <Link href={`/projects/${project.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary/80"
                            data-testid={`button-view-${project.id}`}
                          >
                            <Eye size={16} />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(project)}
                          className="text-primary hover:text-primary/80"
                          data-testid={`button-edit-${project.id}`}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-delete-${project.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{project.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProjectMutation.mutate(project.id)}
                                className="bg-destructive hover:bg-destructive/90"
                                disabled={deleteProjectMutation.isPending}
                              >
                                {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {showForm && (
        <ProjectForm
          project={editingProject}
          open={showForm}
          onOpenChange={handleFormClose}
        />
      )}
    </>
  );
}
