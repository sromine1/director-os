export default function Header() {
  return (
    <header className="h-20 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-8">
      <div>
        <h2 className="text-2xl font-semibold text-white">
          Today's Executive Brief
        </h2>

        <p className="text-slate-400">
          Thursday, July 9
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold text-white">
            Scott Romine
          </p>

          <p className="text-slate-400 text-sm">
            Director of Data & AI
          </p>
        </div>

        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
          SR
        </div>
      </div>
    </header>
  );
}