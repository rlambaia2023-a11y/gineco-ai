import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  Home, 
  BookOpen, 
  Search, 
  History, 
  Info,
  Stethoscope,
  Menu,
  Phone,
  LogOut,
  User,
  Calculator,
  Megaphone
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  {
    title: "Início",
    url: createPageUrl("Home"),
    icon: Home,
  },
  {
    title: "Protocolos",
    url: createPageUrl("Protocols"),
    icon: BookOpen,
  },
  {
    title: "Calculadoras",
    url: createPageUrl("Calculator"),
    icon: Calculator,
  },
  {
    title: "Buscar",
    url: createPageUrl("Search"),
    icon: Search,
  },
  {
    title: "Análise de caso",
    url: createPageUrl("CaseAnalysis"),
    icon: Stethoscope,
  },
  {
    title: "Publicidade",
    url: createPageUrl("Publicidade"),
    icon: Megaphone,
  },
  {
    title: "Histórico",
    url: createPageUrl("History"),
    icon: History,
  },
  {
    title: "Créditos",
    url: createPageUrl("Credits"),
    icon: Info,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await base44.auth.logout(createPageUrl("Home"));
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      window.location.reload();
    }
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("Home"));
  };

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary: #E3F2FD;
          --primary-dark: #90CAF9;
          --secondary: #FCE4EC;
          --secondary-dark: #F48FB1;
          --accent: #E8F5E9;
          --text-primary: #37474F;
          --text-secondary: #78909C;
        }
        
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            z-index: 50;
          }
        }

        /* Melhor scroll em mobile */
        * {
          -webkit-overflow-scrolling: touch;
        }

        /* Prevenir zoom em inputs no iOS */
        @media screen and (max-width: 768px) {
          input, select, textarea {
            font-size: 16px !important;
          }
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <Sidebar className="border-r border-blue-100">
          <SidebarHeader className="border-b border-blue-100 p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
                <Stethoscope className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base md:text-lg text-gray-800">Gineco-AI</h2>
                <p className="text-xs text-gray-500">@2025</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2 md:p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-gradient-to-r from-blue-100 to-pink-100 text-gray-800 font-medium' : 'text-gray-600'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 md:px-4 py-2 md:py-3">
                          <item.icon className="w-4 h-4 md:w-5 md:h-5" />
                          <span className="text-sm md:text-base">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {!isLoadingUser && (
              <div className="mt-auto p-2 md:p-3">
                {user ? (
                  <div className="bg-gradient-to-r from-blue-50 to-pink-50 rounded-xl p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-3 mb-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-xs md:text-sm truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs md:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <LogOut className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      Sair
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleLogin}
                    className="w-full text-xs md:text-sm bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white"
                  >
                    <User className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                    Entrar
                  </Button>
                )}
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-blue-100 p-3 md:p-4 hidden md:block">
            <div className="bg-gradient-to-r from-blue-50 to-pink-50 rounded-xl p-3 md:p-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Informações para fins educacionais. Sempre consulte um profissional de saúde.
              </p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="bg-white/70 backdrop-blur-sm border-b border-blue-100 px-3 md:px-6 py-3 md:py-4 lg:hidden sticky top-0 z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <SidebarTrigger className="hover:bg-blue-50 p-2 rounded-lg transition-colors duration-200 flex-shrink-0">
                  <Menu className="w-5 h-5" />
                </SidebarTrigger>
                <div className="flex items-center gap-2 min-w-0">
                  <Stethoscope className="w-4 h-4 md:w-5 md:h-5 text-blue-500 flex-shrink-0" />
                  <h1 className="text-base md:text-lg font-bold text-gray-800 truncate">Gineco-AI</h1>
                </div>
              </div>

              {!isLoadingUser && user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-pink-400 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium truncate">{user.full_name || "Usuário"}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>

          <footer className="bg-gradient-to-r from-blue-500 to-pink-500 border-t border-blue-200 py-3 md:py-4 px-3 md:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3 text-white text-center md:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-xs sm:text-sm">
                  <p className="font-medium">
                    <span className="font-bold">Ideia:</span> Dra. Mayara Miranda
                  </p>
                  <span className="hidden sm:inline text-blue-200">•</span>
                  <p className="font-medium">
                    <span className="font-bold">Criação:</span> Harrison Ribeiro Costa
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                  <a 
                    href="https://wa.me/5575981487519" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm font-medium hover:text-blue-100 transition-colors"
                  >
                    75-98148.7519
                  </a>
                </div>
              </div>
              <div className="text-center mt-2 pt-2 border-t border-white/20">
                <p className="text-xs text-blue-100 font-medium">
                  GINECO-AI @2025
                </p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}