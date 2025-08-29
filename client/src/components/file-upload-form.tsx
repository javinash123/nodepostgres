import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FileUploadFormProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FileUploadForm({ projectId, onClose, onSuccess }: FileUploadFormProps) {
  const [files, setFiles] = useState<FileList | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Files uploaded successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to upload files", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      toast({ title: "Please select files to upload", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    uploadMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upload Files</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-upload">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                onChange={(e) => setFiles(e.target.files)}
                data-testid="input-file-upload"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Supported formats: PDF, DOC, DOCX, TXT, Images, ZIP, RAR (Max 10MB each)
              </p>
            </div>

            {files && files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected Files:</p>
                {Array.from(files).map((file, index) => (
                  <div key={index} className="text-sm text-muted-foreground flex justify-between">
                    <span>{file.name}</span>
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel-upload"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={uploadMutation.isPending || !files || files.length === 0}
                data-testid="button-submit-upload"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadMutation.isPending ? "Uploading..." : "Upload Files"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}