import { useState } from "react";

function AdminLoginApp() {
  const [accessCode, setAccessCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const params = new URLSearchParams(window.location.search);
  const nextValue = params.get("next");
  const nextPath = nextValue && nextValue.startsWith("/") ? nextValue : "/admin";

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ accessCode })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Access denied");
      }

      window.location.replace(nextPath);
    } catch (requestError) {
      setStatus("error");
      setError(requestError.message || "Access denied");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-shell login-shell">
        <p className="eyebrow">Lockou Admin</p>
        <h1>Restricted access</h1>
        <p className="support-copy">
          Enter the private access code to open the admin workspace.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="access-code">
            Access code
          </label>
          <input
            id="access-code"
            name="access-code"
            type="password"
            autoComplete="current-password"
            className="field-input"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder="Enter the shared code"
            required
          />

          {error ? <p className="error-copy">{error}</p> : null}

          <div className="login-actions">
            <button
              className="submit-button"
              type="submit"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Checking..." : "Enter admin"}
            </button>

            <a className="ghost-link" href="/">
              Back to public site
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLoginApp;
