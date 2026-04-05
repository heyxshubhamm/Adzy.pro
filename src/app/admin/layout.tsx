import { requireServerRole } from "@/lib/serverAuth";
import { AdminSidebar }      from "@/components/Admin/AdminSidebar";
import { AdminRealtimePoll } from "@/components/Admin/AdminRealtimePoll";
import { ReduxProvider }      from "@/components/Providers/ReduxProvider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireServerRole("admin");
  
  return (
    <ReduxProvider>
      <div className="flex min-h-screen bg-slate-50/50 font-inter">
        {/* Universal Navigation Node */}
        <AdminSidebar />
        
        {/* Operational Surface */}
        <main className="flex-1 overflow-x-hidden p-10 lg:p-14">
          <div className="max-w-7xl mx-auto space-y-8">
             <AdminRealtimePoll />
             {children}
          </div>
        </main>

        {/* Global UI Accents */}
        <div className="fixed top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[120px] pointer-events-none rounded-full -mr-32 -mt-32" />
        <div className="fixed bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full -ml-32 -mb-32" />
      </div>
    </ReduxProvider>
  );
}
