import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ChartGantt, BarChart3, FolderKanban, Users, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../lib/auth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Clients", href: "/clients", icon: Users },
];

export function MobileNav() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['/api/me'], null);
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    setOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-3" data-testid="button-mobile-menu">
                  <Menu className="text-card-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                      <ChartGantt className="text-primary-foreground" size={20} />
                    </div>
                    <span className="text-lg font-semibold text-card-foreground">ProManage</span>
                  </div>
                </div>
                
                <nav className="px-4 py-6 space-y-2">
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
                          onClick={() => setOpen(false)}
                          data-testid={`mobile-nav-${item.name.toLowerCase()}`}
                        >
                          <Icon size={20} className="mr-3" />
                          {item.name}
                        </button>
                      </Link>
                    );
                  })}
                  
                  <Button
                    variant="ghost"
                    className="flex items-center w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground justify-start mt-4"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    data-testid="mobile-button-logout"
                  >
                    <LogOut size={20} className="mr-3" />
                    {logoutMutation.isPending ? "Logging out..." : "Logout"}
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center mr-2">
              <ChartGantt className="text-primary-foreground" size={14} />
            </div>
            <span className="font-semibold text-card-foreground">ProManage</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            data-testid="mobile-header-logout"
          >
            <LogOut className="text-card-foreground" />
          </Button>
        </div>
      </header>
    </>
  );
}
