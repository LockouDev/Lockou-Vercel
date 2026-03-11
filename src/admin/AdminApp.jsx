import { useCallback, useEffect, useState } from "react";

const PERMISSION_LABELS = {
  "admin.users.manage": "Manage admin accounts",
  "migration.control.write": "Control Roblox migration",
  "roblox.data.read": "Read Roblox DataStore data"
};

const ROLE_PRIORITY = {
  supreme: 0,
  moderator: 1,
  reader: 2
};

function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function createRoleDraftMap(users) {
  return (users || []).reduce((accumulator, user) => {
    accumulator[user.id] = user.role;
    return accumulator;
  }, {});
}

function createRolePermissionDraftMap(rolePermissions) {
  return (rolePermissions || []).reduce((accumulator, roleConfig) => {
    accumulator[roleConfig.role] = roleConfig.permissions || [];
    return accumulator;
  }, {});
}

function arePermissionListsEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((permission, index) => permission === right[index]);
}

function sortRolePermissionConfigs(rolePermissions) {
  return [...(rolePermissions || [])].sort((left, right) => {
    const leftPriority = ROLE_PRIORITY[left.role] ?? 999;
    const rightPriority = ROLE_PRIORITY[right.role] ?? 999;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.label.localeCompare(right.label);
  });
}

function getRoleAccessSummary(role) {
  if (role === "supreme") {
    return "Highest access";
  }

  if (role === "moderator") {
    return "Operational access";
  }

  return "Read focused access";
}

function formatPermissionLabel(permission) {
  return PERMISSION_LABELS[permission] || permission;
}

function describeAuditEvent(event) {
  const actorName = event?.actor?.username || "Unknown";
  const targetName = event?.target?.username || "Unknown";
  const details = event?.details || {};

  if (event?.type === "user.approved") {
    return {
      title: `${actorName} approved ${targetName}`,
      summary: `Role set to ${details.nextRoleLabel || event?.target?.roleLabel || "Unknown"}`
    };
  }

  if (event?.type === "user.rejected") {
    return {
      title: `${actorName} rejected ${targetName}`,
      summary: "Access request moved to rejected"
    };
  }

  if (event?.type === "user.role_changed") {
    return {
      title: `${actorName} updated ${targetName}`,
      summary: `Role changed from ${details.previousRoleLabel || "Unknown"} to ${details.nextRoleLabel || "Unknown"}`
    };
  }

  if (event?.type === "role.permissions_updated") {
    return {
      title: `${actorName} updated ${details.roleLabel || targetName}`,
      summary: "Role permissions template changed"
    };
  }

  return {
    title: `${actorName} changed ${targetName}`,
    summary: "Admin state updated"
  };
}

function AdminLoader() {
  return (
    <div className="admin-loader" aria-hidden="true">
      <span className="admin-loader__ring admin-loader__ring--outer" />
      <span className="admin-loader__ring admin-loader__ring--middle" />
      <span className="admin-loader__ring admin-loader__ring--inner" />
      <span className="admin-loader__particle admin-loader__particle--one" />
      <span className="admin-loader__particle admin-loader__particle--two" />
      <span className="admin-loader__particle admin-loader__particle--three" />
      <span className="admin-loader__core">
        <span className="admin-loader__core-glow" />
        <span className="admin-loader__mark">LK</span>
      </span>
    </div>
  );
}

function ControlCard({
  title,
  description,
  enabled,
  writable,
  status,
  note,
  error,
  onToggle
}) {
  const detailText =
    error || (note === "Live toggle persisted in Redis" ? "" : note);

  return (
    <article className="control-card">
      <div className="control-card__header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <button
          className={`control-switch${enabled ? " is-active" : ""}`}
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`${enabled ? "Disable" : "Enable"} ${title}`}
          onClick={onToggle}
          disabled={status === "loading" || !writable}
        >
          <span className="control-switch__track">
            <span className="control-switch__core" />
            <span className="control-switch__thumb" />
          </span>
        </button>
      </div>

      <div className="lookup-meta control-card__meta">
        <span>State: {enabled ? "Enabled" : "Disabled"}</span>
        <span>Mode: {writable ? "Live writable" : "Read only"}</span>
      </div>

      {detailText ? (
        <p className="support-copy control-card__copy">{detailText}</p>
      ) : null}
    </article>
  );
}

function UserCard({
  user,
  availableRoles,
  roleValue,
  onRoleChange,
  onApprove,
  onReject,
  onSaveRole,
  actionState,
  isCurrentUser,
  pending
}) {
  const busy = actionState.status === "loading" && actionState.userId === user.id;

  return (
    <article className="member-card">
      <div className="member-card__header">
        <div>
          <h3>{user.username}</h3>
          <p>
            {pending ? "Requested" : "Approved"} {formatTimestamp(user.createdAt)}
          </p>
        </div>
        <span className="dataset-badge">
          {pending ? "Pending" : user.roleLabel}
        </span>
      </div>

      <div className="lookup-meta member-card__meta">
        <span>Status: {user.status}</span>
        <span>Role: {user.roleLabel}</span>
        {user.approvedAt ? <span>Updated {formatTimestamp(user.approvedAt)}</span> : null}
      </div>

      <div className="member-card__controls">
        <label className="field-label" htmlFor={`role-${user.id}`}>
          Role
        </label>
        <select
          id={`role-${user.id}`}
          className="field-input select-input"
          value={roleValue}
          onChange={(event) => onRoleChange(user.id, event.target.value)}
          disabled={busy || isCurrentUser}
        >
          {availableRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {isCurrentUser ? (
        <p className="support-note">Your own role stays locked inside this panel</p>
      ) : null}

      <div className="member-card__actions">
        {pending ? (
          <>
            <button
              className="submit-button"
              type="button"
              disabled={busy}
              onClick={() => onApprove(user.id, roleValue)}
            >
              {busy ? "Saving" : "Approve"}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => onReject(user.id)}
            >
              {busy ? "Saving" : "Reject"}
            </button>
          </>
        ) : (
          <button
            className="submit-button"
            type="button"
            disabled={busy || isCurrentUser || roleValue === user.role}
            onClick={() => onSaveRole(user.id, roleValue)}
          >
            {busy ? "Saving" : "Save role"}
          </button>
        )}
      </div>
    </article>
  );
}

function AuditEventCard({ event }) {
  const description = describeAuditEvent(event);

  return (
    <article className="audit-card">
      <div className="audit-card__header">
        <div>
          <h3>{description.title}</h3>
          <p>{description.summary}</p>
        </div>
        <span className="dataset-badge">{formatTimestamp(event.createdAt)}</span>
      </div>

      <div className="lookup-meta audit-card__meta">
        {event.actor ? <span>Actor: {event.actor.username}</span> : null}
        {event.target ? <span>Target: {event.target.username}</span> : null}
        {event.details?.nextRoleLabel ? (
          <span>Role: {event.details.nextRoleLabel}</span>
        ) : null}
      </div>
    </article>
  );
}

function RolePermissionCard({
  roleConfig,
  availablePermissions,
  draftPermissions,
  saveState,
  onTogglePermission,
  onReset,
  onSave
}) {
  const selectedPermissions = draftPermissions || roleConfig.permissions || [];
  const busy = saveState.status === "loading" && saveState.role === roleConfig.role;
  const changed = !arePermissionListsEqual(
    selectedPermissions,
    roleConfig.permissions || []
  );
  const permissionCount = selectedPermissions.length;
  const accessSummary = getRoleAccessSummary(roleConfig.role);

  return (
    <article className={`permission-card permission-card--${roleConfig.role}`}>
      <div className="permission-card__header">
        <div>
          <p className="permission-card__eyebrow">{accessSummary}</p>
          <h3>{roleConfig.label}</h3>
          <p>{roleConfig.note || "Customize what this role can access"}</p>
        </div>
        <span className="dataset-badge">
          {roleConfig.editable ? "Editable" : "Locked"}
        </span>
      </div>

      <div className="permission-card__layout">
        <div className="permission-card__sidebar">
          <div className="lookup-meta permission-card__meta">
            <span>
              State: {roleConfig.usesDefault ? "Using defaults" : "Custom permissions"}
            </span>
            <span>{permissionCount} permissions selected</span>
            {roleConfig.updatedBy ? <span>Updated by {roleConfig.updatedBy}</span> : null}
            {roleConfig.updatedAt ? (
              <span>Updated {formatTimestamp(roleConfig.updatedAt)}</span>
            ) : null}
          </div>

          {roleConfig.editable ? (
            <div className="member-card__actions permission-card__actions">
              <button
                className="secondary-button"
                type="button"
                disabled={busy || !changed}
                onClick={() => onReset(roleConfig.role, roleConfig.permissions || [])}
              >
                {busy ? "Saving" : "Reset"}
              </button>
              <button
                className="submit-button"
                type="button"
                disabled={busy || !changed}
                onClick={() => onSave(roleConfig.role)}
              >
                {busy ? "Saving" : "Save permissions"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="permission-options">
          {availablePermissions.map((permission) => {
            const checked = selectedPermissions.includes(permission.value);

            return (
              <label
                key={`${roleConfig.role}-${permission.value}`}
                className={`permission-option${checked ? " is-active" : ""}${roleConfig.editable ? "" : " is-locked"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!roleConfig.editable || busy}
                  onChange={(event) =>
                    onTogglePermission(
                      roleConfig.role,
                      permission.value,
                      event.target.checked
                    )
                  }
                />
                <div className="permission-option__copy">
                  <strong>{permission.label}</strong>
                  <span>{permission.description}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {saveState.error && saveState.role === roleConfig.role ? (
        <p className="error-copy">{saveState.error}</p>
      ) : null}
    </article>
  );
}

function AdminApp() {
  const [pageState, setPageState] = useState({
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
  const [migrationState, setMigrationState] = useState({
    status: "idle",
    error: ""
  });
  const [userActionState, setUserActionState] = useState({
    status: "idle",
    userId: "",
    error: ""
  });
  const [rolePermissionState, setRolePermissionState] = useState({
    status: "idle",
    role: "",
    error: ""
  });
  const [pendingRoleDrafts, setPendingRoleDrafts] = useState({});
  const [activeRoleDrafts, setActiveRoleDrafts] = useState({});
  const [rolePermissionDrafts, setRolePermissionDrafts] = useState({});

  const loadOverview = useCallback(async () => {
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

      setPendingRoleDrafts(createRoleDraftMap(payload.pendingUsers));
      setActiveRoleDrafts(createRoleDraftMap(payload.activeUsers));
      setRolePermissionDrafts(createRolePermissionDraftMap(payload.rolePermissions));
      setPageState({
        status: "ready",
        data: payload,
        error: ""
      });
    } catch (error) {
      setPageState({
        status: "error",
        data: null,
        error: error.message || "Failed to load admin overview"
      });
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

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
        throw new Error(payload.error || "Failed to read player data");
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
        error: error.message || "Failed to read player data"
      });
    }
  }

  async function handleMigrationToggle(nextEnabled) {
    setMigrationState({
      status: "loading",
      error: ""
    });

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
        throw new Error(payload.error || "Failed to update migration state");
      }

      setMigrationState({
        status: "ready",
        error: ""
      });
      await loadOverview();
    } catch (error) {
      setMigrationState({
        status: "error",
        error: error.message || "Failed to update migration state"
      });
    }
  }

  async function handleRolePermissionSave(role) {
    setRolePermissionState({
      status: "loading",
      role,
      error: ""
    });

    try {
      const response = await fetch("/api/admin/role-permissions", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          role,
          permissions: rolePermissionDrafts[role] || []
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update role permissions");
      }

      setRolePermissionDrafts(createRolePermissionDraftMap(payload.rolePermissions));
      setRolePermissionState({
        status: "ready",
        role: "",
        error: ""
      });
      await loadOverview();
    } catch (error) {
      setRolePermissionState({
        status: "error",
        role,
        error: error.message || "Failed to update role permissions"
      });
    }
  }

  async function handleUserAction(action, userId, role = "") {
    setUserActionState({
      status: "loading",
      userId,
      error: ""
    });

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          action,
          userId,
          role
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "User action failed");
      }

      setPendingRoleDrafts(createRoleDraftMap(payload.pendingUsers));
      setActiveRoleDrafts(createRoleDraftMap(payload.activeUsers));
      setUserActionState({
        status: "ready",
        userId: "",
        error: ""
      });
      await loadOverview();
    } catch (error) {
      setUserActionState({
        status: "error",
        userId,
        error: error.message || "User action failed"
      });
    }
  }

  if (pageState.status === "loading") {
    return (
      <div className="admin-page">
        <div className="admin-shell loading-shell">
          <div className="loading-stack">
            <AdminLoader />
            <div className="loading-copy">
              <p className="eyebrow">Lockou Admin</p>
              <h1>Loading restricted workspace</h1>
              <p className="support-copy">
                Preparing protected controls, Roblox tools and private admin data
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pageState.status === "error") {
    return (
      <div className="admin-page">
        <div className="admin-shell error-shell">
          <p className="eyebrow">Lockou Admin</p>
          <h1>Admin workspace unavailable</h1>
          <p className="support-copy">{pageState.error}</p>
          <a className="ghost-link" href="/admin-login">
            Return to login
          </a>
        </div>
      </div>
    );
  }

  const data = pageState.data;
  const { currentUser, capabilities } = data;

  return (
    <div className="admin-page">
      <div className="admin-grid">
        <header className="admin-shell admin-header">
          <div>
            <p className="eyebrow">Restricted control room</p>
            <h1>{data.heading}</h1>
            <p className="support-copy">
              Signed in as {currentUser.username} with {currentUser.roleLabel} access
            </p>
          </div>

          <div className="header-side">
            <p className="status-pill">{currentUser.roleLabel}</p>
            <button
              className="logout-button"
              type="button"
              onClick={handleLogout}
              disabled={logoutState === "loading"}
            >
              {logoutState === "loading" ? "Leaving" : "Logout"}
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
            <h2>My profile</h2>
            <p>Session details and current access level</p>
          </div>

          <div className="profile-grid">
            <article className="admin-card profile-card">
              <p>Username</p>
              <strong>{currentUser.username}</strong>
            </article>
            <article className="admin-card profile-card">
              <p>Access level</p>
              <strong>{currentUser.roleLabel}</strong>
            </article>
            <article className="admin-card profile-card">
              <p>Member since</p>
              <strong>{formatTimestamp(currentUser.createdAt)}</strong>
            </article>
            <article className="admin-card profile-card">
              <p>Last login</p>
              <strong>{formatTimestamp(currentUser.lastLoginAt)}</strong>
            </article>
          </div>

          <article className="profile-panel">
            <div className="lookup-meta profile-panel__meta">
              <span>Status: {currentUser.status}</span>
              {currentUser.approvedAt ? (
                <span>Approved {formatTimestamp(currentUser.approvedAt)}</span>
              ) : null}
              {currentUser.approvedBy ? <span>Approved by {currentUser.approvedBy}</span> : null}
            </div>

            <div className="permission-block">
              <h3>Permissions</h3>
              <div className="permission-grid">
                {currentUser.permissions.map((permission) => (
                  <span key={permission} className="permission-chip">
                    {formatPermissionLabel(permission)}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </section>

        {capabilities.canControlMigration && data.migrationControl ? (
          <section className="admin-shell admin-section">
            <div className="section-head">
              <h2>Control center</h2>
              <p>Live switches for protected admin features</p>
            </div>

            <div className="control-grid">
              <ControlCard
                title="Game migration"
                description="Controls the Roblox data migration flow that copies a player's saved data from one Roblox experience into another"
                enabled={data.migrationControl.enabled}
                writable={data.migrationControl.writable}
                status={migrationState.status}
                note={
                  data.migrationControl.note ||
                  "Pause migration here without removing the backend routes"
                }
                error={migrationState.error}
                onToggle={() => handleMigrationToggle(!data.migrationControl.enabled)}
              />
            </div>
          </section>
        ) : null}

        {capabilities.canManageRolePermissions ? (
          <section className="admin-shell admin-section">
            <div className="section-head">
              <h2>Role permissions</h2>
              <p>Control what each admin role can do inside this panel with stronger roles first</p>
            </div>

            <div className="permission-card-grid">
              {sortRolePermissionConfigs(data.rolePermissions).map((roleConfig) => (
                <RolePermissionCard
                  key={roleConfig.role}
                  roleConfig={roleConfig}
                  availablePermissions={data.availablePermissions}
                  draftPermissions={
                    rolePermissionDrafts[roleConfig.role] || roleConfig.permissions
                  }
                  saveState={rolePermissionState}
                  onTogglePermission={(role, permission, checked) =>
                    setRolePermissionDrafts((current) => {
                      const currentPermissions = current[role] || [];
                      const nextPermissions = checked
                        ? [...currentPermissions, permission]
                        : currentPermissions.filter(
                            (currentPermission) => currentPermission !== permission
                          );

                      return {
                        ...current,
                        [role]: data.availablePermissions
                          .map((item) => item.value)
                          .filter((value) => nextPermissions.includes(value))
                      };
                    })
                  }
                  onReset={(role, permissions) =>
                    setRolePermissionDrafts((current) => ({
                      ...current,
                      [role]: permissions
                    }))
                  }
                  onSave={handleRolePermissionSave}
                />
              ))}
            </div>
          </section>
        ) : null}

        {capabilities.canManageUsers ? (
          <section className="admin-shell admin-section">
            <div className="section-head">
              <h2>Activity log</h2>
              <p>Recent approvals, rejections and role changes</p>
            </div>

            <div className="audit-grid">
              {data.auditEvents.length > 0 ? (
                data.auditEvents.map((event) => (
                  <AuditEventCard key={event.id} event={event} />
                ))
              ) : (
                <p className="empty-copy panel-empty">
                  No admin actions have been logged yet
                </p>
              )}
            </div>
          </section>
        ) : null}

        {capabilities.canManageUsers ? (
          <section className="admin-shell admin-section">
            <div className="section-head">
              <h2>Access requests</h2>
              <p>Approve or reject pending admin registrations</p>
            </div>

            {userActionState.error ? (
              <p className="error-copy">{userActionState.error}</p>
            ) : null}

            <div className="member-grid">
              {data.pendingUsers.length > 0 ? (
                data.pendingUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    pending
                    isCurrentUser={false}
                    availableRoles={data.availableRoles}
                    roleValue={pendingRoleDrafts[user.id] || user.role}
                    onRoleChange={(userId, role) =>
                      setPendingRoleDrafts((current) => ({
                        ...current,
                        [userId]: role
                      }))
                    }
                    onApprove={(userId, role) =>
                      handleUserAction("approve", userId, role)
                    }
                    onReject={(userId) => handleUserAction("reject", userId)}
                    onSaveRole={() => {}}
                    actionState={userActionState}
                  />
                ))
              ) : (
                <p className="empty-copy panel-empty">
                  No pending requests right now
                </p>
              )}
            </div>
          </section>
        ) : null}

        {capabilities.canManageUsers ? (
          <section className="admin-shell admin-section">
            <div className="section-head">
              <h2>Team access</h2>
              <p>Review active admins and adjust their roles</p>
            </div>

            <div className="member-grid">
              {data.activeUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  pending={false}
                  isCurrentUser={user.id === currentUser.id}
                  availableRoles={data.availableRoles}
                  roleValue={activeRoleDrafts[user.id] || user.role}
                  onRoleChange={(userId, role) =>
                    setActiveRoleDrafts((current) => ({
                      ...current,
                      [userId]: role
                    }))
                  }
                  onApprove={() => {}}
                  onReject={() => {}}
                  onSaveRole={(userId, role) =>
                    handleUserAction("set_role", userId, role)
                  }
                  actionState={userActionState}
                />
              ))}
            </div>
          </section>
        ) : null}

        {capabilities.canReadRobloxData ? (
          <section className="admin-shell admin-section">
            <div className="section-head">
              <h2>Roblox player data lookup</h2>
              <p>Reads one DataStore entry using the player ID as the entry key</p>
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
                  {lookupState.status === "loading" ? "Reading" : "Read data"}
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
                  Enter a player ID and read the DataStore entry using that ID as the key
                </p>
              )}
            </div>
          </section>
        ) : null}

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
