import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartGantt, Settings2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { login } from "../lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { AppSettings } from "@shared/schema";

export default function Login() {
  const [username, setUsername] = useState("admin@promanage.com");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get app settings for branding
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ['/api/settings'],
    retry: false, // Don't retry if fails (not authenticated yet)
    refetchOnWindowFocus: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => 
      login(username, password),
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/me'], user);
      toast({
        title: "Login successful",
        description: "Welcome back to ProManage",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid credentials. Please try again.",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please enter both username and password.",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent px-4">
      <div className="max-w-md w-full">
        <Card className="shadow-xl border-border">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
                {settings?.logoUrl ? (
                  <img 
                    src={settings.logoUrl} 
                    alt="Logo" 
                    className="w-10 h-10 object-contain" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <ChartGantt className="text-primary-foreground text-2xl" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-card-foreground">
                {settings?.appName || "ProManage"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {settings?.appDescription || "IT Project Management System"}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-2">
                  Admin Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full"
                  placeholder="Enter admin email"
                  data-testid="input-email"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
                  Password
                </Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                  placeholder="Enter password"
                  data-testid="input-password"
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Secure admin access only
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Default: admin@promanage.com / admin123
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
