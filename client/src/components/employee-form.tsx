import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Employee } from "@shared/schema";

const employeeFormSchema = z.object({
  name: z.string().min(1, "Employee name is required"),
  employeeCode: z.string().min(1, "Employee code is required"),
  designation: z.string().min(1, "Designation is required"),
  salary: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  employee?: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeForm({ employee, open, onOpenChange }: EmployeeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
      employeeCode: "",
      designation: "",
      salary: "",
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        name: employee.name,
        employeeCode: employee.employeeCode,
        designation: employee.designation,
        salary: employee.salary?.toString() || "",
      });
    } else {
      form.reset({
        name: "",
        employeeCode: "",
        designation: "",
        salary: "",
      });
    }
  }, [employee, form]);

  const createEmployeeMutation = useMutation({
    mutationFn: (data: EmployeeFormData) => apiRequest('POST', '/api/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Employee created",
        description: "The employee has been successfully created.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Creation failed",
        description: "Failed to create the employee. Please try again.",
      });
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: (data: EmployeeFormData) => apiRequest('PUT', `/api/employees/${employee!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: "Employee updated",
        description: "The employee has been successfully updated.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update the employee. Please try again.",
      });
    }
  });

  const onSubmit = (data: EmployeeFormData) => {
    if (employee) {
      updateEmployeeMutation.mutate(data);
    } else {
      createEmployeeMutation.mutate(data);
    }
  };

  const isLoading = createEmployeeMutation.isPending || updateEmployeeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Edit Employee" : "Add New Employee"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="employee-form">
          <div>
            <Label htmlFor="name">Employee Name *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Enter employee name"
              data-testid="input-employee-name"
              className={form.formState.errors.name ? "border-destructive" : ""}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="employeeCode">Employee Code *</Label>
            <Input
              id="employeeCode"
              {...form.register("employeeCode")}
              placeholder="E.g., EMP001"
              data-testid="input-employee-code"
              className={form.formState.errors.employeeCode ? "border-destructive" : ""}
            />
            {form.formState.errors.employeeCode && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.employeeCode.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="designation">Designation *</Label>
            <Input
              id="designation"
              {...form.register("designation")}
              placeholder="E.g., Senior Developer, Project Manager"
              data-testid="input-employee-designation"
              className={form.formState.errors.designation ? "border-destructive" : ""}
            />
            {form.formState.errors.designation && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.designation.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="salary">Monthly Salary (₹)</Label>
            <Input
              id="salary"
              type="number"
              {...form.register("salary")}
              placeholder="E.g., 50000"
              data-testid="input-employee-salary"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-border">
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
              data-testid="button-save-employee"
            >
              {isLoading ? "Saving..." : employee ? "Update Employee" : "Create Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}