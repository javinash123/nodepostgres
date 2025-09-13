import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ChartGantt, BarChart3, FolderKanban, Users, UserCheck, LogOut, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import type { AppSettings } from "@shared/schema";
import { logout } from "../lib/auth";
import promanageLogo from "@/assets/promanage-logo.png";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Employees", href: "/employees", icon: UserCheck },
  { name: "Settings", href: "/settings", icon: Settings2 },
];

export function Sidebar() {
  const [location] = useLocation();
  const queryClient = useQueryClient();

  // Get app settings for branding
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ['/api/settings'],
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['/api/me'], null);
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-card lg:border-r lg:border-border">
      <div className="flex items-center px-6 py-4 border-b border-border">
        <div className="w-8 h-8 flex items-center justify-center mr-3">
          {settings?.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className="w-8 h-8 object-contain" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = promanageLogo;
              }}
            />
          ) : (
            <img 
              src={promanageLogo}
              alt="ProManage Logo" 
              className="w-8 h-8 object-contain" 
            />
          )}
        </div>
        <span className="text-lg font-semibold text-card-foreground">
          {settings?.appName || "ProManage"}
        </span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
          
          return (
            <Link key={item.name} href={item.href}>
              <button
                className={cn(
                  "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <Icon size={20} className="mr-3" />
                {item.name}
              </button>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground justify-start"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut size={20} className="mr-3" />
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </aside>
  );
}
