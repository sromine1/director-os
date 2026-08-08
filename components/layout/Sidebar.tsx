import Link from "next/link";

export default function Sidebar() {
  const items = [
    { label: "Dashboard", href: "/" },
    { label: "Executive Timeline", href: "/timeline" },
    { label: "Search", href: "/search" },
    { label: "Executive Inbox" },
    { label: "Meetings" },
    { label: "Decisions" },
    { label: "Action Items" },
    { label: "AI Assistant" },
    { label: "Settings" },
  ];

  return (
    <aside className="w-72 bg-slate-950 border-r border-slate-800 min-h-screen">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-white">
          DirectorOS
        </h1>

        <p className="text-slate-400 text-sm mt-1">
          Executive Operating System
        </p>
      </div>

      <nav className="px-4 mt-8">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="mb-2 block w-full rounded-lg px-4 py-3 text-left text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              disabled
              className="mb-2 w-full cursor-not-allowed rounded-lg px-4 py-3 text-left text-slate-500"
            >
              {item.label}
            </button>
          ),
        )}
      </nav>
    </aside>
  );
}
