import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Globe, Smartphone, Monitor, DollarSign, Calendar, FileText, Plus, Download, Trash2, Eye, EyeOff, Users, User } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useState } from "react";
import type { ProjectWithDetails } from "@shared/schema";
import { ProjectExtensionForm } from "@/components/project-extension-form";
import { FileUploadForm } from "@/components/file-upload-form";
import { toast } from "@/hooks/use-toast";

export default function ProjectDetails() {
  const [match, params] = useRoute("/projects/:id");
  const [showCredentials, setShowCredentials] = useState(false);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ['/api/projects', params?.id],
    enabled: !!params?.id,
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete file');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', params?.id] });
      toast({ title: "File deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete file", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <MobileNav />
          <div className="p-6 flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading project details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <MobileNav />
          <div className="p-6 flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
              <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
              <Link href="/projects">
                <Button>Back to Projects</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'on-hold': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(parseFloat(String(amount)));
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <MobileNav />
        
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/projects">
                <Button variant="ghost" size="sm" data-testid="button-back-projects">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-project-name">{project.name}</h1>
                <p className="text-muted-foreground">{project.client.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(project.status)} data-testid={`status-${project.status}`}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('-', ' ')}
              </Badge>
              <div className="text-lg font-semibold" data-testid="text-total-cost">
                {formatCurrency(project.totalCost)}
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList data-testid="tabs-project-details">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
              <TabsTrigger value="files">Files ({project.files.length})</TabsTrigger>
              <TabsTrigger value="extensions">Extensions ({project.extensions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span data-testid="text-start-date">{format(new Date(project.startDate), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">End Date:</span>
                      <span data-testid="text-end-date">{format(new Date(project.endDate), 'MMM dd, yyyy')}</span>
                    </div>
                    {project.completionDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Completed:</span>
                        <span data-testid="text-completion-date">{format(new Date(project.completionDate), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Budget Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Initial Budget:</span>
                      <span data-testid="text-initial-budget">{formatCurrency(project.budget)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Extensions:</span>
                      <span data-testid="text-extension-total">
                        {formatCurrency(
                          project.extensions.reduce((sum, ext) => sum + parseFloat(ext.extendedBudget || '0'), 0)
                        )}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total Cost:</span>
                      <span data-testid="text-total-breakdown">{formatCurrency(project.totalCost)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Company:</span>
                      <span data-testid="text-client-company">{project.client.company || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email:</span>
                      <span data-testid="text-client-email">{project.client.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Source:</span>
                      <span data-testid="text-client-source">{project.clientSource || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Assigned Team ({project.assignedEmployees?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.assignedEmployees && project.assignedEmployees.length > 0 ? (
                      <div className="space-y-2">
                        {project.assignedEmployees.map((employee) => (
                          <div key={employee.id} className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-employee-${employee.id}`}>{employee.name}</span>
                            <span className="text-muted-foreground">({employee.employeeCode})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid="text-no-employees">No employees assigned to this project</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {(project.websiteUrl || project.androidUrl || project.iosUrl) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Project Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {project.websiteUrl && (
                        <Button variant="outline" asChild data-testid="button-website-url">
                          <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-2" />
                            Website
                          </a>
                        </Button>
                      )}
                      {project.androidUrl && (
                        <Button variant="outline" asChild data-testid="button-android-url">
                          <a href={project.androidUrl} target="_blank" rel="noopener noreferrer">
                            <Smartphone className="h-4 w-4 mr-2" />
                            Android App
                          </a>
                        </Button>
                      )}
                      {project.iosUrl && (
                        <Button variant="outline" asChild data-testid="button-ios-url">
                          <a href={project.iosUrl} target="_blank" rel="noopener noreferrer">
                            <Monitor className="h-4 w-4 mr-2" />
                            iOS App
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="credentials">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Project Credentials
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCredentials(!showCredentials)}
                      data-testid="button-toggle-credentials"
                    >
                      {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.credentials ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-mono" data-testid="text-credentials">
                        {showCredentials ? project.credentials : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No credentials stored for this project.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Project Files
                    </CardTitle>
                    <Button 
                      onClick={() => setShowFileUpload(true)}
                      data-testid="button-upload-files"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.files.length > 0 ? (
                    <div className="space-y-3">
                      {project.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`file-${file.id}`}>
                          <div>
                            <p className="font-medium">{file.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.fileSize / 1024).toFixed(1)} KB • {format(new Date(file.uploadedAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/uploads/${file.filePath.split('/').pop()}`} download data-testid={`button-download-${file.id}`}>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteFileMutation.mutate(file.id)}
                              disabled={deleteFileMutation.isPending}
                              data-testid={`button-delete-${file.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No files uploaded for this project.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="extensions">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Project Extensions
                    </CardTitle>
                    <Button 
                      onClick={() => setShowExtensionForm(true)}
                      data-testid="button-add-extension"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Extension
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.extensions.length > 0 ? (
                    <div className="space-y-4">
                      {project.extensions.map((extension) => (
                        <div key={extension.id} className="p-4 border rounded-lg" data-testid={`extension-${extension.id}`}>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {extension.newEndDate && (
                              <div>
                                <p className="text-sm text-muted-foreground">New End Date</p>
                                <p className="font-medium">{format(new Date(extension.newEndDate), 'MMM dd, yyyy')}</p>
                              </div>
                            )}
                            {extension.extendedBudget && (
                              <div>
                                <p className="text-sm text-muted-foreground">Additional Budget</p>
                                <p className="font-medium">{formatCurrency(extension.extendedBudget)}</p>
                              </div>
                            )}
                            {extension.actualCompletionDate && (
                              <div>
                                <p className="text-sm text-muted-foreground">Actual Completion</p>
                                <p className="font-medium">{format(new Date(extension.actualCompletionDate), 'MMM dd, yyyy')}</p>
                              </div>
                            )}
                          </div>
                          {extension.notes && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm text-muted-foreground">Notes</p>
                              <p className="text-sm">{extension.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No extensions added to this project.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {showExtensionForm && (
            <ProjectExtensionForm
              projectId={project.id}
              onClose={() => setShowExtensionForm(false)}
              onSuccess={() => {
                setShowExtensionForm(false);
                queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });
              }}
            />
          )}

          {showFileUpload && (
            <FileUploadForm
              projectId={project.id}
              onClose={() => setShowFileUpload(false)}
              onSuccess={() => {
                setShowFileUpload(false);
                queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}