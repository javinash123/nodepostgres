import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit2, Plus, Trash2, Mail, Phone, Building } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@shared/schema";
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

const clientFormSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

export default function Clients() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      source: "",
    },
  });

  const createClientMutation = useMutation({
    mutationFn: (data: ClientFormData) => apiRequest('POST', '/api/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Client created",
        description: "The client has been successfully created.",
      });
      setShowForm(false);
      form.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Creation failed",
        description: "Failed to create the client. Please try again.",
      });
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: (data: ClientFormData) => apiRequest('PUT', `/api/clients/${editingClient!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Client updated",
        description: "The client has been successfully updated.",
      });
      setShowForm(false);
      setEditingClient(null);
      form.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update the client. Please try again.",
      });
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: (clientId: string) => apiRequest('DELETE', `/api/clients/${clientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Client deleted",
        description: "The client has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete the client. Please try again.",
      });
    }
  });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      company: client.company || "",
      source: client.source || "",
    });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingClient(null);
    form.reset();
    setShowForm(true);
  };

  const onSubmit = (data: ClientFormData) => {
    if (editingClient) {
      updateClientMutation.mutate(data);
    } else {
      createClientMutation.mutate(data);
    }
  };

  const isLoading_ = createClientMutation.isPending || updateClientMutation.isPending;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <MobileNav />
        
        <div className="p-6" data-testid="clients-content">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Clients</h1>
            <p className="text-muted-foreground">Manage your client relationships and contact information.</p>
          </div>
          
          <Card className="border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-card-foreground">All Clients</h2>
                <Button
                  onClick={handleAdd}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  data-testid="button-add-client"
                >
                  <Plus className="mr-2" size={16} />
                  Add Client
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted-foreground/10 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : clients?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No clients found. Add your first client to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clients?.map((client) => (
                    <Card key={client.id} className="border-border" data-testid={`client-card-${client.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-card-foreground text-lg" data-testid={`client-name-${client.id}`}>
                              {client.name}
                            </h3>
                            {client.company && (
                              <p className="text-sm text-muted-foreground flex items-center mt-1">
                                <Building className="mr-1" size={14} />
                                {client.company}
                              </p>
                            )}
                          </div>
                          {client.source && (
                            <Badge variant="secondary" className="text-xs">
                              {client.source}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {client.email && (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Mail className="mr-2" size={14} />
                              {client.email}
                            </p>
                          )}
                          {client.phone && (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Phone className="mr-2" size={14} />
                              {client.phone}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-border">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(client)}
                            className="text-primary hover:text-primary/80"
                            data-testid={`button-edit-client-${client.id}`}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive/80"
                                data-testid={`button-delete-client-${client.id}`}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{client.name}"? This will also delete all associated projects. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteClientMutation.mutate(client.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                  disabled={deleteClientMutation.isPending}
                                >
                                  {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Edit Client" : "Add New Client"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="client-form">
            <div>
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter client name"
                data-testid="input-client-name"
                className={form.formState.errors.name ? "border-destructive" : ""}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="Enter email address"
                data-testid="input-client-email"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...form.register("phone")}
                placeholder="Enter phone number"
                data-testid="input-client-phone"
              />
            </div>
            
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                {...form.register("company")}
                placeholder="Enter company name"
                data-testid="input-client-company"
              />
            </div>
            
            <div>
              <Label htmlFor="source">Source</Label>
              <Select 
                value={form.watch("source") || ""} 
                onValueChange={(value) => form.setValue("source", value)}
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
            
            <div className="flex justify-end space-x-4 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowForm(false)}
                data-testid="button-cancel-client"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading_}
                data-testid="button-save-client"
              >
                {isLoading_ ? "Saving..." : editingClient ? "Update Client" : "Create Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
