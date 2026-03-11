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
  const [playerId, setPlayerId] = useState("89879612");
  const [lookupState, setLookupState] = useState({
    status: "idle",
    payload: null,
    error: ""
  });
  const [migrationControl, setMigrationControl] = useState({
    status: "idle",
    enabled: false,
    writable: false,
    source: "env",
    storage: "Environment Variable",
    note: "",
    error: ""
  });

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
          setMigrationControl({
            status: "ready",
            enabled: Boolean(payload.migrationControl?.enabled),
            writable: Boolean(payload.migrationControl?.writable),
            source: payload.migrationControl?.source || "env",
            storage:
              payload.migrationControl?.storage || "Environment Variable",
            note: payload.migrationControl?.note || "",
            error: ""
          });

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

  async function handlePlayerLookup(event) {
    event.preventDefault();
    setLookupState({
      status: "loading",
      payload: null,
      error: ""
    });

    try {
      const response = await fetch(
        `/api/admin/roblox-player?playerId=${encodeURIComponent(playerId.trim())}`,
        {
          credentials: "include"
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to read player data.");
      }

      setLookupState({
        status: "ready",
        payload,
        error: ""
      });
    } catch (error) {
      setLookupState({
        status: "error",
        payload: null,
        error: error.message || "Failed to read player data."
      });
    }
  }

  async function handleMigrationToggle(nextEnabled) {
    setMigrationControl((current) => ({
      ...current,
      status: "loading",
      error: ""
    }));

    try {
      const response = await fetch("/api/admin/migration-control", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          enabled: nextEnabled
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update migration state.");
      }

      setMigrationControl({
        status: "ready",
        enabled: Boolean(payload.enabled),
        writable: Boolean(payload.writable),
        source: payload.source || "env",
        storage: payload.storage || "Environment Variable",
        note: payload.note || "",
        error: ""
      });

      setState((current) => {
        if (!current.data) {
          return current;
        }

        return {
          ...current,
          data: {
            ...current.data,
            overviewCards: current.data.overviewCards.map((card) =>
              card.label === "Game migration"
                ? {
                    ...card,
                    value: payload.enabled ? "Enabled" : "Disabled"
                  }
                : card
            ),
            migrationControl: {
              enabled: Boolean(payload.enabled),
              writable: Boolean(payload.writable),
              source: payload.source || "env",
              storage: payload.storage || "Environment Variable",
              note: payload.note || ""
            }
          }
        };
      });
    } catch (error) {
      setMigrationControl((current) => ({
        ...current,
        status: "error",
        error: error.message || "Failed to update migration state."
      }));
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
            <h2>Migration control</h2>
            <p>Turns the game migration endpoints on or off globally.</p>
          </div>

          <div className="control-row">
            <div className="control-summary">
              <div className="lookup-meta">
                <span>
                  State: {migrationControl.enabled ? "Enabled" : "Disabled"}
                </span>
                <span>Storage: {migrationControl.storage}</span>
                <span>
                  Mode: {migrationControl.writable ? "Live writable" : "Read only"}
                </span>
              </div>
              <p className="support-copy control-copy">
                {migrationControl.note ||
                  "Use this section to pause or resume the migration endpoints."}
              </p>
              {migrationControl.error ? (
                <p className="error-copy">{migrationControl.error}</p>
              ) : null}
            </div>

            <div className="control-actions">
              <button
                className="submit-button"
                type="button"
                onClick={() => handleMigrationToggle(!migrationControl.enabled)}
                disabled={
                  migrationControl.status === "loading" || !migrationControl.writable
                }
              >
                {migrationControl.status === "loading"
                  ? "Saving..."
                  : migrationControl.enabled
                    ? "Disable migration"
                    : "Enable migration"}
              </button>
            </div>
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

        <section className="admin-shell admin-section">
          <div className="section-head">
            <h2>Roblox player data lookup</h2>
            <p>Reads one DataStore entry using the player ID as the entry key.</p>
          </div>

          <form className="lookup-form" onSubmit={handlePlayerLookup}>
            <label className="field-label" htmlFor="player-id">
              Player ID
            </label>
            <div className="lookup-controls">
              <input
                id="player-id"
                name="player-id"
                type="text"
                inputMode="numeric"
                className="field-input"
                value={playerId}
                onChange={(event) => setPlayerId(event.target.value)}
                placeholder="89879612"
                required
              />
              <button
                className="submit-button"
                type="submit"
                disabled={lookupState.status === "loading"}
              >
                {lookupState.status === "loading" ? "Reading..." : "Read data"}
              </button>
            </div>
          </form>

          {lookupState.error ? (
            <p className="error-copy lookup-error">{lookupState.error}</p>
          ) : null}

          <div className="lookup-result">
            {lookupState.payload ? (
              <>
                <div className="lookup-meta">
                  <span>Entry key used: {lookupState.payload.entryKeyUsed}</span>
                  <span>Scope: {lookupState.payload.datastoreScope}</span>
                  <span>Store: {lookupState.payload.datastoreName}</span>
                </div>
                <pre className="result-code">
                  <code>{JSON.stringify(lookupState.payload.data, null, 2)}</code>
                </pre>
              </>
            ) : (
              <p className="empty-copy">
                Enter a player ID and read the DataStore entry using that ID as the key.
              </p>
            )}
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
