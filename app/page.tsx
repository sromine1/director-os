export default function Home() {
  return (
    <main
      style={{
        background: "#111827",
        minHeight: "100vh",
        color: "white",
        padding: "40px",
        fontFamily: "Arial"
      }}
    >
      <h1 style={{fontSize: "48px"}}>
        DirectorOS
      </h1>

      <p style={{fontSize:"20px", color:"#9CA3AF"}}>
        Executive Operating System
      </p>

      <hr style={{margin:"30px 0"}} />

      <h2>Today's Dashboard</h2>

      <ul style={{fontSize:"22px", lineHeight:"2"}}>
        <li>📧 Executive Inbox</li>
        <li>📅 Meetings</li>
        <li>✅ Decisions Waiting</li>
        <li>⚠ Action Items</li>
        <li>📊 Executive Dashboard</li>
        <li>🤖 AI Assistant</li>
      </ul>
    </main>
  );
}