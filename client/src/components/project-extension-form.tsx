import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { insertProjectExtensionSchema, type InsertProjectExtension } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProjectExtensionFormProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const formSchema = insertProjectExtensionSchema.omit({ projectId: true });

export function ProjectExtensionForm({ projectId, onClose, onSuccess }: ProjectExtensionFormProps) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newEndDate: undefined,
      extendedBudget: undefined,
      notes: "",
    },
  });

  const createExtensionMutation = useMutation({
    mutationFn: async (data: Omit<InsertProjectExtension, 'projectId'>) => {
      const response = await fetch(`/api/projects/${projectId}/extensions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
      });
      if (!response.ok) throw new Error('Failed to create extension');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Extension added successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to add extension", variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    // Convert date strings to the expected format
    const formattedData = {
      ...data,
      newEndDate: data.newEndDate || undefined,
      extendedBudget: data.extendedBudget || undefined,
    };
    
    createExtensionMutation.mutate(formattedData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add Project Extension</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-extension">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-new-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extendedBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Budget</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-extended-budget"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this extension..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="textarea-extension-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  data-testid="button-cancel-extension"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createExtensionMutation.isPending}
                  data-testid="button-submit-extension"
                >
                  {createExtensionMutation.isPending ? "Adding..." : "Add Extension"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}