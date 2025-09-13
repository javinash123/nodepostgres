import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Save, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AppSettings, InsertAppSettings } from "@shared/schema";

export default function Settings() {
  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  
  // Password change form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ['/api/settings'],
  });

  // Update form when settings data loads
  useEffect(() => {
    if (settings) {
      setAppName(settings.appName);
      setAppDescription(settings.appDescription || "");
      setLogoUrl(settings.logoUrl || "");
      setPrimaryColor(settings.primaryColor || "#3b82f6");
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: InsertAppSettings) => {
      const response = await apiRequest('PUT', '/api/settings', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings updated",
        description: "Your app settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update settings. Please try again.",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('POST', '/api/change-password', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Password change failed",
        description: error.message || "Failed to change password. Please try again.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      appName,
      appDescription,
      logoUrl: logoUrl || undefined,
      primaryColor,
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password mismatch",
        description: "New password and confirmation password do not match.",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "New password must be at least 6 characters long.",
      });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <MobileNav />
          <div className="p-6 flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading settings...</p>
            </div>
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
        
        <div className="p-6" data-testid="settings-content">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">App Settings</h1>
            <p className="text-muted-foreground">Manage your application's branding and configuration.</p>
          </div>
          
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Application Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-settings">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="app-name" className="text-sm font-medium">
                      Application Name
                    </Label>
                    <Input
                      id="app-name"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="Enter app name"
                      className="mt-2"
                      data-testid="input-app-name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="primary-color" className="text-sm font-medium">
                      Primary Color
                    </Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 h-10 p-1 rounded cursor-pointer"
                        data-testid="input-primary-color"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#3b82f6"
                        className="flex-1"
                        data-testid="input-color-text"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="app-description" className="text-sm font-medium">
                    Application Description
                  </Label>
                  <Textarea
                    id="app-description"
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    placeholder="Brief description of your application"
                    rows={3}
                    className="mt-2"
                    data-testid="textarea-app-description"
                  />
                </div>

                <div>
                  <Label htmlFor="logo-url" className="text-sm font-medium">
                    Logo URL (Optional)
                  </Label>
                  <Input
                    id="logo-url"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="mt-2"
                    data-testid="input-logo-url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    If provided, this will replace the default icon in the sidebar and login screen.
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-settings"
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Change Section */}
          <Card className="max-w-2xl mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4" data-testid="form-password-change">
                <div>
                  <Label htmlFor="current-password" className="text-sm font-medium">
                    Current Password
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="mt-2"
                    data-testid="input-current-password"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-password" className="text-sm font-medium">
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    className="mt-2"
                    data-testid="input-new-password"
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="mt-2"
                    data-testid="input-confirm-password"
                    required
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    data-testid="button-change-password"
                    className="flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card className="max-w-2xl mt-6">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Sidebar Header Preview</h3>
                  <div className="flex items-center p-4 border rounded-lg bg-card">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className="w-6 h-6 object-contain" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : (
                        <Settings2 className="text-primary-foreground" size={20} />
                      )}
                    </div>
                    <span className="text-lg font-semibold">{appName || "App Name"}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Login Screen Preview</h3>
                  <div className="p-6 border rounded-lg bg-card text-center">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 mx-auto">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className="w-10 h-10 object-contain" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : (
                        <Settings2 className="text-primary-foreground text-2xl" />
                      )}
                    </div>
                    <h1 className="text-2xl font-bold mb-2">{appName || "App Name"}</h1>
                    <p className="text-muted-foreground">{appDescription || "App Description"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}