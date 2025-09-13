import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProjectWithDetails, Client, Employee } from "@shared/schema";
import { Lock, UserCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  clientId: z.string().min(1, "Client is required"),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  androidUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  iosUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  completionDate: z.string().optional(),
  budget: z.string().min(1, "Budget is required"),
  status: z.string().default("planning"),
  clientSource: z.string().optional(),
  credentials: z.string().optional(),
  assignedEmployees: z.array(z.string()).optional().default([]),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  project?: ProjectWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectForm({ project, open, onOpenChange }: ProjectFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      clientId: "",
      websiteUrl: "",
      androidUrl: "",
      iosUrl: "",
      startDate: "",
      endDate: "",
      completionDate: "",
      budget: "",
      status: "planning",
      clientSource: "",
      credentials: "",
      assignedEmployees: [],
    },
  });

  useEffect(() => {
    if (project) {
      const formatDate = (date: string | Date) => {
        return new Date(date).toISOString().split('T')[0];
      };

      form.reset({
        name: project.name,
        clientId: project.clientId,
        websiteUrl: project.websiteUrl || "",
        androidUrl: project.androidUrl || "",
        iosUrl: project.iosUrl || "",
        startDate: formatDate(project.startDate),
        endDate: formatDate(project.endDate),
        completionDate: project.completionDate ? formatDate(project.completionDate) : "",
        budget: project.budget.toString(),
        status: project.status,
        clientSource: project.clientSource || "",
        credentials: project.credentials || "",
        assignedEmployees: project.assignedEmployees?.map(emp => emp.id) || [],
      });
    } else {
      form.reset({
        name: "",
        clientId: "",
        websiteUrl: "",
        androidUrl: "",
        iosUrl: "",
        startDate: "",
        endDate: "",
        completionDate: "",
        budget: "",
        status: "planning",
        clientSource: "",
        credentials: "",
        assignedEmployees: [],
      });
    }
  }, [project, form]);

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const { assignedEmployees, ...projectData } = data;
      const response = await apiRequest('POST', '/api/projects', projectData);
      const newProject = await response.json();
      
      // Assign employees to the project
      if (assignedEmployees && assignedEmployees.length > 0) {
        for (const employeeId of assignedEmployees) {
          await apiRequest('POST', `/api/projects/${newProject.id}/employees`, { employeeId });
        }
      }
      
      return { response, newProject };
    },
    onSuccess: async ({ newProject }) => {
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Project created",
        description: "The project has been successfully created.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Creation failed",
        description: "Failed to create the project. Please try again.",
      });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const { assignedEmployees, ...projectData } = data;
      
      // Update project data
      const response = await apiRequest('PUT', `/api/projects/${project!.id}`, projectData);
      
      // Update employee assignments
      if (assignedEmployees) {
        // First remove all existing assignments
        await apiRequest('DELETE', `/api/projects/${project!.id}/employees`);
        
        // Then add new assignments
        for (const employeeId of assignedEmployees) {
          await apiRequest('POST', `/api/projects/${project!.id}/employees`, { employeeId });
        }
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project!.id}`] });
      toast({
        title: "Project updated",
        description: "The project has been successfully updated.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update the project. Please try again.",
      });
    }
  });

  const onSubmit = (data: ProjectFormData) => {
    if (project) {
      updateProjectMutation.mutate(data);
    } else {
      createProjectMutation.mutate(data);
    }
  };


  const isLoading = createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? "Edit Project" : "Add New Project"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="project-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter project name"
                data-testid="input-project-name"
                className={form.formState.errors.name ? "border-destructive" : ""}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="clientId">Client Name *</Label>
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                {...form.register("websiteUrl")}
                placeholder="https://example.com"
                data-testid="input-website-url"
              />
            </div>
            
            <div>
              <Label htmlFor="androidUrl">Android App URL</Label>
              <Input
                id="androidUrl"
                type="url"
                {...form.register("androidUrl")}
                placeholder="Play Store URL"
                data-testid="input-android-url"
              />
            </div>
            
            <div>
              <Label htmlFor="iosUrl">iOS App URL</Label>
              <Input
                id="iosUrl"
                type="url"
                {...form.register("iosUrl")}
                placeholder="App Store URL"
                data-testid="input-ios-url"
              />
            </div>
            
            <div>
              <Label htmlFor="clientSource">Client Source</Label>
              <Select 
                value={form.watch("clientSource") || ""} 
                onValueChange={(value) => form.setValue("clientSource", value)}
              >
                <SelectTrigger data-testid="select-client-source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="upwork">Upwork</SelectItem>
                  <SelectItem value="fiverr">Fiverr</SelectItem>
                  <SelectItem value="direct">Direct Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                data-testid="input-start-date"
                className={form.formState.errors.startDate ? "border-destructive" : ""}
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                data-testid="input-end-date"
                className={form.formState.errors.endDate ? "border-destructive" : ""}
              />
              {form.formState.errors.endDate && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.endDate.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="completionDate">Completion Date</Label>
              <Input
                id="completionDate"
                type="date"
                {...form.register("completionDate")}
                data-testid="input-completion-date"
              />
            </div>
            
            <div>
              <Label htmlFor="budget">Budget (₹) *</Label>
              <Input
                id="budget"
                type="number"
                {...form.register("budget")}
                placeholder="25000"
                data-testid="input-budget"
                className={form.formState.errors.budget ? "border-destructive" : ""}
              />
              {form.formState.errors.budget && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.budget.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={form.watch("status")} 
                onValueChange={(value) => form.setValue("status", value)}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="credentials">Project Credentials</Label>
            <div className="relative">
              <Textarea
                id="credentials"
                {...form.register("credentials")}
                rows={4}
                placeholder="Store login credentials, API keys, server details, etc. (encrypted storage)"
                data-testid="textarea-credentials"
              />
              <div className="absolute top-2 right-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <Lock className="mr-1" size={12} />
              This field is encrypted and secure
            </p>
          </div>
          
          <div>
            <Label>Assigned Employees</Label>
            <Card className="p-4">
              <div className="space-y-3">
                {employees?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employees available. Create employees first.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {employees?.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`employee-${employee.id}`}
                          checked={(form.watch("assignedEmployees") || []).includes(employee.id)}
                          onCheckedChange={(checked) => {
                            const currentEmployees = form.watch("assignedEmployees") || [];
                            if (checked) {
                              form.setValue("assignedEmployees", [...currentEmployees, employee.id]);
                            } else {
                              form.setValue("assignedEmployees", currentEmployees.filter(id => id !== employee.id));
                            }
                          }}
                          data-testid={`checkbox-employee-${employee.id}`}
                        />
                        <label 
                          htmlFor={`employee-${employee.id}`}
                          className="text-sm cursor-pointer flex items-center gap-2"
                        >
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span>{employee.name}</span>
                          <span className="text-muted-foreground">({employee.employeeCode})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          
          <div className="flex justify-end space-x-4 pt-6 border-t border-border">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              data-testid="button-save-project"
            >
              {isLoading ? "Saving..." : project ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
