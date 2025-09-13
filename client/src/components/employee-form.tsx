import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Employee, EmployeeSalary } from "@shared/schema";
import { Calendar, DollarSign, Plus, History } from "lucide-react";

const employeeFormSchema = z.object({
  name: z.string().min(1, "Employee name is required"),
  employeeCode: z.string().min(1, "Employee code is required"),
  designation: z.string().min(1, "Designation is required"),
});

const salaryFormSchema = z.object({
  salary: z.string().min(1, "Salary is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid salary format"),
  financialYear: z.string().min(1, "Financial year is required").regex(/^\d{4}-\d{2}$/, "Invalid financial year format (e.g., 2024-25)"),
  effectiveFrom: z.string().min(1, "Effective date is required"),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;
type SalaryFormData = z.infer<typeof salaryFormSchema>;

// Helper function to get current financial year
const getCurrentFinancialYear = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  // Financial year starts from April (month 3, 0-indexed)
  if (now.getMonth() >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
};

// Helper function to format currency
const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(num);
};

interface EmployeeFormProps {
  employee?: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeForm({ employee, open, onOpenChange }: EmployeeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSalaryForm, setShowSalaryForm] = useState(false);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
      employeeCode: "",
      designation: "",
    },
  });

  const salaryForm = useForm<SalaryFormData>({
    resolver: zodResolver(salaryFormSchema),
    defaultValues: {
      salary: "",
      financialYear: getCurrentFinancialYear(),
      effectiveFrom: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch employee salary history if editing existing employee
  const { data: salaryHistory, isLoading: salaryHistoryLoading } = useQuery<EmployeeSalary[]>({
    queryKey: [`/api/employees/${employee?.id}/salaries`],
    enabled: !!employee?.id,
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        name: employee.name,
        employeeCode: employee.employeeCode,
        designation: employee.designation,
      });
    } else {
      form.reset({
        name: "",
        employeeCode: "",
        designation: "",
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
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update the employee. Please try again.",
      });
    }
  });

  const addSalaryMutation = useMutation({
    mutationFn: (data: SalaryFormData) => {
      // Convert monthly salary to annual salary for backend storage
      const monthlySalary = parseFloat(data.salary);
      const annualSalary = monthlySalary * 12;
      
      return apiRequest('POST', `/api/employees/${employee!.id}/salaries`, {
        salary: annualSalary.toString(),
        financialYear: data.financialYear,
        effectiveFrom: new Date(data.effectiveFrom).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${employee?.id}/salaries`] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setShowSalaryForm(false);
      salaryForm.reset();
      toast({
        title: "Salary added",
        description: "The salary has been successfully added.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to add salary",
        description: "Failed to add the salary. Please try again.",
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

  const onSalarySubmit = (data: SalaryFormData) => {
    addSalaryMutation.mutate(data);
  };

  const isLoading = createEmployeeMutation.isPending || updateEmployeeMutation.isPending;
  const isSalaryLoading = addSalaryMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? "Edit Employee" : "Add New Employee"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Details Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employee Information</CardTitle>
            </CardHeader>
            <CardContent>
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
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
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
            </CardContent>
          </Card>

          {/* Salary Management - Only for existing employees */}
          {employee && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Salary Management
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowSalaryForm(!showSalaryForm)}
                    data-testid="button-add-salary"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Salary
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Salary Form */}
                {showSalaryForm && (
                  <form onSubmit={salaryForm.handleSubmit(onSalarySubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div>
                      <Label htmlFor="salary-amount">Monthly Salary (₹) *</Label>
                      <Input
                        id="salary-amount"
                        type="number"
                        {...salaryForm.register("salary")}
                        placeholder="E.g., 50000"
                        data-testid="input-salary-amount"
                        className={salaryForm.formState.errors.salary ? "border-destructive" : ""}
                      />
                      {salaryForm.formState.errors.salary && (
                        <p className="text-sm text-destructive mt-1">{salaryForm.formState.errors.salary.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="financial-year">Financial Year *</Label>
                      <Input
                        id="financial-year"
                        {...salaryForm.register("financialYear")}
                        placeholder="e.g., 2024-25"
                        data-testid="input-financial-year"
                        className={salaryForm.formState.errors.financialYear ? "border-destructive" : ""}
                      />
                      {salaryForm.formState.errors.financialYear && (
                        <p className="text-sm text-destructive mt-1">{salaryForm.formState.errors.financialYear.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="effective-from">Effective From *</Label>
                      <Input
                        id="effective-from"
                        type="date"
                        {...salaryForm.register("effectiveFrom")}
                        data-testid="input-effective-from"
                        className={salaryForm.formState.errors.effectiveFrom ? "border-destructive" : ""}
                      />
                      {salaryForm.formState.errors.effectiveFrom && (
                        <p className="text-sm text-destructive mt-1">{salaryForm.formState.errors.effectiveFrom.message}</p>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowSalaryForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        size="sm"
                        disabled={isSalaryLoading}
                        data-testid="button-submit-salary"
                      >
                        {isSalaryLoading ? "Adding..." : "Add Salary"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Salary History */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4" />
                    <h4 className="font-medium">Salary History</h4>
                  </div>
                  
                  {salaryHistoryLoading ? (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading salary history...</p>
                    </div>
                  ) : salaryHistory && Array.isArray(salaryHistory) && salaryHistory.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {salaryHistory.map((salary: EmployeeSalary, index: number) => (
                        <div key={salary.id} className="p-3 border rounded-lg" data-testid={`salary-history-${index}`}>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              FY {salary.financialYear}
                            </Badge>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(parseFloat(salary.salary) / 12)}/month
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <Calendar className="h-3 w-3" />
                            Effective from: {new Date(salary.effectiveFrom).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No salary history found</p>
                      <p className="text-xs">Add a salary entry to track financial year-based compensation</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}