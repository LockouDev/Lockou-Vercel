import { useEffect, useState } from "react";

function formatTimestamp(value) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function AdminApp() {
  const [state, setState] = useState({
    status: "loading",
    data: null,
    error: ""
  });
  const [logoutState, setLogoutState] = useState("idle");

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        const response = await fetch("/api/admin/overview", {
          credentials: "include"
        });

        if (response.status === 401) {
          window.location.replace("/admin-login?next=/admin");
          return;
        }

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load admin overview");
        }

        if (active) {
          setState({
            status: "ready",
            data: payload,
            error: ""
          });
        }
      } catch (error) {
        if (active) {
          setState({
            status: "error",
            data: null,
            error: error.message || "Failed to load admin overview"
          });
        }
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setLogoutState("loading");

    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include"
      });
    } finally {
      window.location.replace("/admin-login");
    }
  }

  if (state.status === "loading") {
    return (
      <div className="admin-page">
        <div className="admin-shell loading-shell">
          <p className="eyebrow">Lockou Admin</p>
          <h1>Loading restricted workspace...</h1>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="admin-page">
        <div className="admin-shell error-shell">
          <p className="eyebrow">Lockou Admin</p>
          <h1>Admin workspace unavailable</h1>
          <p className="support-copy">{state.error}</p>
          <a className="ghost-link" href="/admin-login">
            Return to login
          </a>
        </div>
      </div>
    );
  }

  const { data } = state;

  return (
    <div className="admin-page">
      <div className="admin-grid">
        <header className="admin-shell admin-header">
          <div>
            <p className="eyebrow">Restricted control room</p>
            <h1>{data.heading}</h1>
            <p className="support-copy">
              Base ready for Roblox data APIs, private datasets and internal actions.
            </p>
          </div>

          <div className="header-side">
            <p className="status-pill">{data.environment}</p>
            <button
              className="logout-button"
              type="button"
              onClick={handleLogout}
              disabled={logoutState === "loading"}
            >
              {logoutState === "loading" ? "Leaving..." : "Logout"}
            </button>
          </div>
        </header>

        <section className="admin-shell admin-section">
          <div className="section-head">
            <h2>Overview</h2>
            <p>Updated {formatTimestamp(data.updatedAt)}</p>
          </div>

          <div className="card-grid">
            {data.overviewCards.map((card) => (
              <article key={card.label} className="admin-card">
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-shell admin-section">
          <div className="section-head">
            <h2>Data slots</h2>
            <p>Placeholders for the Roblox sources you will map next.</p>
          </div>

          <div className="dataset-table">
            {data.datasets.map((dataset) => (
              <article key={dataset.name} className="dataset-row">
                <div>
                  <h3>{dataset.name}</h3>
                  <p>{dataset.notes}</p>
                </div>
                <span className="dataset-badge">{dataset.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-shell admin-section compact-section">
          <div className="section-head">
            <h2>Next actions</h2>
          </div>

          <ul className="activity-list">
            {data.activity.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default AdminApp;
