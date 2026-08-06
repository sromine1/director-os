import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <main className="p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
