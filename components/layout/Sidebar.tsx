export default function Sidebar() {
  const items = [
    "Dashboard",
    "Executive Inbox",
    "Meetings",
    "Decisions",
    "Action Items",
    "Executive Dashboard",
    "AI Assistant",
    "Settings",
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
        {items.map((item) => (
          <button
            key={item}
            className="w-full text-left px-4 py-3 rounded-lg mb-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}