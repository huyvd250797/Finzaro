"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, background: "#0c1211", color: "#f4f7f6", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "100%", maxWidth: 420, border: "1px solid #26312f", borderRadius: 24, padding: 24, textAlign: "center", background: "#111817" }}>
            <div style={{ fontSize: 42 }}>⚠</div>
            <h1 style={{ margin: "16px 0 0", fontSize: 22 }}>Finzaro cần tải lại</h1>
            <p style={{ margin: "10px 0 0", color: "#aab6b3", lineHeight: 1.6, fontSize: 14 }}>Ứng dụng gặp lỗi ở lớp giao diện gốc. Dữ liệu tài chính trên Supabase không bị thay đổi bởi lỗi hiển thị này.</p>
            <button type="button" onClick={reset} style={{ marginTop: 20, width: "100%", height: 44, border: 0, borderRadius: 12, background: "#0d8b66", color: "white", fontWeight: 800, cursor: "pointer" }}>Tải lại ứng dụng</button>
          </section>
        </main>
      </body>
    </html>
  );
}
