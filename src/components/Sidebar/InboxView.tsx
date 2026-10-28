import { useEffect, useState } from "preact/hooks";
import { inboxItems } from "@/state/appState";
import { invokeSafe } from "@/services/api";
import type { InboxItem } from "@/types/models";

export function InboxView() {
  const [loading, setLoading] = useState(false);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const items = await invokeSafe<InboxItem[]>("agent_list_inbox");
      inboxItems.value = items;
    } catch (e) {
      console.warn("Failed to fetch inbox:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleAction = (id: string, status: "approved" | "rejected" | "dismissed") => {
    inboxItems.value = inboxItems.value.map((item) => {
      if (item.id === id) {
        return { ...item, status };
      }
      return item;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Unified Inbox</h3>
        <button onClick={fetchInbox} disabled={loading} style={{ fontSize: "11px", padding: "2px 6px" }}>
          Refresh
        </button>
      </div>

      <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "var(--fg-muted)" }}>
        Review approval requests, plan checkpoints, questions, and automation outputs.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {inboxItems.value.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--fg-muted)", fontStyle: "italic" }}>
            Inbox zero! No pending approvals or notifications.
          </div>
        ) : (
          inboxItems.value.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "var(--border-width) solid var(--border-subtle)",
                padding: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 600, fontSize: "12px" }}>{item.title}</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "1px 5px",
                    backgroundColor: item.status === "pending" ? "var(--color-warning)" : "var(--bg-surface-hover)",
                    color: item.status === "pending" ? "#000" : "var(--fg-muted)",
                  }}
                >
                  {item.status}
                </span>
              </div>

              <div style={{ fontSize: "11px", color: "var(--fg-default)", marginTop: "4px" }}>
                {item.message}
              </div>

              {item.details && (
                <pre
                  style={{
                    fontSize: "10px",
                    backgroundColor: "var(--bg-editor)",
                    padding: "6px",
                    margin: "6px 0",
                    overflowX: "auto",
                  }}
                >
                  {item.details}
                </pre>
              )}

              {item.status === "pending" && (
                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  <button
                    onClick={() => handleAction(item.id, "approved")}
                    className="primary"
                    style={{ fontSize: "11px", padding: "2px 8px" }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(item.id, "rejected")}
                    style={{ fontSize: "11px", padding: "2px 8px", color: "var(--color-error)" }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(item.id, "dismissed")}
                    style={{ fontSize: "11px", padding: "2px 8px" }}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

