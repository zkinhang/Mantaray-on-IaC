import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import PilotGroup from "./pages/PilotGroup";
import TaskGroup from "./pages/TaskGroup";
import Functions from "./pages/Functions";
import AllExceptYaw from "./pages/AllExceptYaw";
import YawFunction from "./pages/YawFunction";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pilot-gp" element={<PilotGroup />} />
            <Route path="/task-gp" element={<TaskGroup />} />
            <Route path="/functions" element={<Functions />} />
            <Route path="/functions/all-except-yaw" element={<AllExceptYaw />} />
            <Route path="/functions/yaw-function" element={<YawFunction />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
