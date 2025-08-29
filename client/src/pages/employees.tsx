import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit2, Plus, Trash2, User, Code, Briefcase, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Employee } from "@shared/schema";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { EmployeeForm } from "../components/employee-form";
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

export default function Employees() {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allEmployees, isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  // Filter employees based on search term
  const employees = useMemo(() => {
    if (!allEmployees || !searchTerm.trim()) return allEmployees;
    
    const searchLower = searchTerm.toLowerCase();
    return allEmployees.filter(employee => 
      employee.name.toLowerCase().includes(searchLower) ||
      employee.employeeCode.toLowerCase().includes(searchLower) ||
      employee.designation.toLowerCase().includes(searchLower)
    );
  }, [allEmployees, searchTerm]);

  const deleteEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) => apiRequest('DELETE', `/api/employees/${employeeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Employee deleted",
        description: "The employee has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete the employee. Please try again.",
      });
    }
  });

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <MobileNav />
          <div className="p-6">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-center text-muted-foreground mt-4">Loading employees...</p>
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
        
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Employee Management</h1>
            <p className="text-muted-foreground">Manage your team members and their information.</p>
          </div>

          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg font-semibold text-card-foreground">All Employees</CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-employees"
                    />
                  </div>
                  <Button
                    onClick={handleAdd}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    data-testid="button-add-employee"
                  >
                    <Plus className="mr-2" size={16} />
                    Add Employee
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {employees?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No employees found. Add your first employee to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {employees?.map((employee) => (
                    <Card key={employee.id} className="p-4 hover:shadow-md transition-shadow" data-testid={`employee-card-${employee.id}`}>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-card-foreground" data-testid={`employee-name-${employee.id}`}>{employee.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {employee.designation}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Code className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Code:</span>
                            <span className="font-medium" data-testid={`employee-code-${employee.id}`}>{employee.employeeCode}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Role:</span>
                            <span data-testid={`employee-designation-${employee.id}`}>{employee.designation}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            className="flex-1"
                            data-testid={`button-edit-${employee.id}`}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80"
                                data-testid={`button-delete-${employee.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{employee.name}"? This will also remove them from all assigned projects.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteEmployeeMutation.mutate(employee.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                  disabled={deleteEmployeeMutation.isPending}
                                >
                                  {deleteEmployeeMutation.isPending ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          open={showForm}
          onOpenChange={handleFormClose}
        />
      )}
    </div>
  );
}