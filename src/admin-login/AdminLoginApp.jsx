import { useState } from "react";

function AdminLoginApp() {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [status, setStatus] = useState("idle");
  const [feedback, setFeedback] = useState({
    type: "",
    message: ""
  });
  const params = new URLSearchParams(window.location.search);
  const nextValue = params.get("next");
  const nextPath = nextValue && nextValue.startsWith("/") ? nextValue : "/admin";

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setFeedback({
      type: "",
      message: ""
    });

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(loginForm)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Access denied");
      }

      if (payload.needsRobloxConnect) {
        const oauthNext = encodeURIComponent(nextPath);
        window.location.replace(`/api/admin/roblox/connect?next=${oauthNext}`);
        return;
      }

      window.location.replace(nextPath);
    } catch (requestError) {
      setStatus("error");
      setFeedback({
        type: "error",
        message: requestError.message || "Access denied"
      });
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setFeedback({
      type: "",
      message: ""
    });

    if (registerForm.password !== registerForm.confirmPassword) {
      setStatus("error");
      setFeedback({
        type: "error",
        message: "Passwords do not match"
      });
      return;
    }

    try {
      const response = await fetch("/api/admin/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          username: registerForm.username,
          password: registerForm.password
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to send the access request");
      }

      setRegisterForm({
        username: "",
        password: "",
        confirmPassword: ""
      });
      setStatus("ready");
      setFeedback({
        type: "success",
        message:
          payload.message || "Access request sent, wait for a supreme admin to approve it"
      });
      setMode("login");
    } catch (requestError) {
      setStatus("error");
      setFeedback({
        type: "error",
        message: requestError.message || "Failed to send the access request"
      });
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-shell login-shell auth-shell">
        <p className="eyebrow">Lockou Admin</p>
        <h1>{mode === "login" ? "Admin sign in" : "Request admin access"}</h1>
        <p className="support-copy">
          {mode === "login"
            ? "Sign in with an approved admin account"
            : "Create an account request and wait for a supreme admin to approve it"}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Admin access modes">
          <button
            className={`tab-button${mode === "login" ? " is-active" : ""}`}
            type="button"
            onClick={() => {
              setMode("login");
              setFeedback({
                type: "",
                message: ""
              });
            }}
          >
            Sign in
          </button>
          <button
            className={`tab-button${mode === "register" ? " is-active" : ""}`}
            type="button"
            onClick={() => {
              setMode("register");
              setFeedback({
                type: "",
                message: ""
              });
            }}
          >
            Request access
          </button>
        </div>

        {feedback.message ? (
          <p className={`status-copy status-copy--${feedback.type || "info"}`}>
            {feedback.message}
          </p>
        ) : null}

        {mode === "login" ? (
          <form className="login-form" onSubmit={handleLoginSubmit}>
            <label className="field-label" htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              name="login-username"
              type="text"
              autoComplete="username"
              className="field-input"
              value={loginForm.username}
              onChange={(event) =>
                setLoginForm((current) => ({
                  ...current,
                  username: event.target.value
                }))
              }
              placeholder="Username"
              required
            />

            <label className="field-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              name="login-password"
              type="password"
              autoComplete="current-password"
              className="field-input"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((current) => ({
                  ...current,
                  password: event.target.value
                }))
              }
              placeholder="Enter your password"
              required
            />

            <div className="login-actions">
              <button
                className="submit-button"
                type="submit"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Checking" : "Enter admin"}
              </button>

              <a className="ghost-link" href="/">
                Back to public site
              </a>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleRegisterSubmit}>
            <label className="field-label" htmlFor="register-username">
              Username
            </label>
            <input
              id="register-username"
              name="register-username"
              type="text"
              autoComplete="username"
              className="field-input"
              value={registerForm.username}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  username: event.target.value
                }))
              }
              placeholder="Your admin name"
              required
            />

            <label className="field-label" htmlFor="register-password">
              Password
            </label>
            <input
              id="register-password"
              name="register-password"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={registerForm.password}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  password: event.target.value
                }))
              }
              placeholder="Create a password"
              required
            />

            <label className="field-label" htmlFor="register-confirm-password">
              Confirm password
            </label>
            <input
              id="register-confirm-password"
              name="register-confirm-password"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={registerForm.confirmPassword}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value
                }))
              }
              placeholder="Repeat your password"
              required
            />

            <p className="support-note">
              New accounts stay pending until a supreme admin approves them
            </p>

            <div className="login-actions">
              <button
                className="submit-button"
                type="submit"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Sending" : "Send request"}
              </button>

              <button
                className="secondary-button"
                type="button"
                onClick={() => setMode("login")}
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminLoginApp;
