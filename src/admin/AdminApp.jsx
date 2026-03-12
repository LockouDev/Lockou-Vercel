import { useCallback, useEffect, useMemo, useState } from "react";

const PERMISSION_LABELS = {
  "admin.users.manage": "Manage admin accounts",
  "migration.control.write": "Control Roblox migration",
  "roblox.data.read": "Read Roblox DataStore data"
};

const ROLE_PRIORITY = {
  supreme: 0,
  reader: 1,
  moderator: 2
};

const LANGUAGE_COPY = {
  en: {
    shell: {
      brandSubtitle: "Restricted workspace",
      logout: "Logout",
      leaving: "Leaving",
      protectedContent: "Protected admin content",
      permissionsCount: "permissions",
      activeStatus: "active"
    },
    tabs: {
      overview: {
        label: "Overview",
        heading: "Admin overview",
        description: "Profile, access summary and next actions"
      },
      controlCenter: {
        label: "Control center",
        heading: "Control center",
        description: "Live switches for protected admin features"
      },
      rolePermissions: {
        label: "Role permissions",
        heading: "Role permissions",
        description: "Control what each admin role can do inside this panel"
      },
      accessRequests: {
        label: "Access requests",
        heading: "Access requests",
        description: "Approve or reject pending admin registrations"
      },
      team: {
        label: "Team",
        heading: "Team access",
        description: "Review active admins and adjust their roles"
      },
      logs: {
        label: "Logs",
        heading: "Activity log",
        description: "Recent approvals, rejections and role changes"
      },
      robloxLookup: {
        label: "Roblox data",
        heading: "Roblox player data lookup",
        description: "Read one DataStore entry using the player ID as the entry key"
      },
      settings: {
        label: "Settings",
        heading: "Workspace settings",
        description: "Choose your panel language and visual theme"
      }
    },
    settings: {
      title: "Settings",
      subtitle: "Personalize this admin workspace and keep your preferences saved",
      themeTitle: "Theme color",
      themeDescription: "Choose the color system used by this admin panel",
      languageTitle: "Language",
      languageDescription: "Choose how the admin shell and navigation should be displayed",
      save: "Save settings",
      saving: "Saving",
      saved: "Settings updated",
      sectionOneTitle: "Current experience",
      sectionOneBody: "Theme and language are saved per admin account so each person can use the panel in their preferred style",
      sectionTwoTitle: "Available languages",
      sectionTwoBody: "English, Portuguese - Brazil and Spanish are ready in this first pass"
    }
  },
  "pt-BR": {
    shell: {
      brandSubtitle: "Workspace restrito",
      logout: "Sair",
      leaving: "Saindo",
      protectedContent: "Conteúdo administrativo protegido",
      permissionsCount: "permissões",
      activeStatus: "ativo"
    },
    tabs: {
      overview: {
        label: "Visão geral",
        heading: "Visão geral do admin",
        description: "Perfil, resumo de acesso e próximos passos"
      },
      controlCenter: {
        label: "Central de controle",
        heading: "Central de controle",
        description: "Interruptores ao vivo para recursos protegidos do painel"
      },
      rolePermissions: {
        label: "Permissões de cargo",
        heading: "Permissões de cargo",
        description: "Controle o que cada cargo de admin pode fazer neste painel"
      },
      accessRequests: {
        label: "Solicitações",
        heading: "Solicitações de acesso",
        description: "Aprove ou rejeite novos registros administrativos"
      },
      team: {
        label: "Equipe",
        heading: "Acesso da equipe",
        description: "Revise admins ativos e ajuste seus cargos"
      },
      logs: {
        label: "Logs",
        heading: "Registro de atividade",
        description: "Aprovações, rejeições e mudanças de cargo recentes"
      },
      robloxLookup: {
        label: "Dados Roblox",
        heading: "Leitura de dados do jogador",
        description: "Leia uma entrada do DataStore usando o ID do jogador como chave"
      },
      settings: {
        label: "Configurações",
        heading: "Configurações do workspace",
        description: "Escolha o idioma do painel e o tema visual"
      }
    },
    settings: {
      title: "Configurações",
      subtitle: "Personalize este workspace administrativo e mantenha suas preferências salvas",
      themeTitle: "Tema de cor",
      themeDescription: "Escolha a paleta usada por este painel administrativo",
      languageTitle: "Idioma",
      languageDescription: "Escolha como o shell do admin e a navegação devem aparecer",
      save: "Salvar configurações",
      saving: "Salvando",
      saved: "Configurações atualizadas",
      sectionOneTitle: "Experiência atual",
      sectionOneBody: "Tema e idioma ficam salvos por conta admin para cada pessoa usar o painel do jeito que preferir",
      sectionTwoTitle: "Idiomas disponíveis",
      sectionTwoBody: "Inglês, Português - Brasil e Espanhol já estão prontos nesta primeira versão"
    }
  },
  es: {
    shell: {
      brandSubtitle: "Espacio restringido",
      logout: "Salir",
      leaving: "Saliendo",
      protectedContent: "Contenido administrativo protegido",
      permissionsCount: "permisos",
      activeStatus: "activo"
    },
    tabs: {
      overview: {
        label: "Resumen",
        heading: "Resumen del admin",
        description: "Perfil, resumen de acceso y siguientes pasos"
      },
      controlCenter: {
        label: "Centro de control",
        heading: "Centro de control",
        description: "Interruptores en vivo para funciones protegidas del panel"
      },
      rolePermissions: {
        label: "Permisos por rol",
        heading: "Permisos por rol",
        description: "Controla lo que cada rol de admin puede hacer dentro de este panel"
      },
      accessRequests: {
        label: "Solicitudes",
        heading: "Solicitudes de acceso",
        description: "Aprueba o rechaza nuevos registros administrativos"
      },
      team: {
        label: "Equipo",
        heading: "Acceso del equipo",
        description: "Revisa admins activos y ajusta sus roles"
      },
      logs: {
        label: "Logs",
        heading: "Registro de actividad",
        description: "Aprobaciones, rechazos y cambios de rol recientes"
      },
      robloxLookup: {
        label: "Datos Roblox",
        heading: "Lectura de datos del jugador",
        description: "Lee una entrada del DataStore usando el ID del jugador como clave"
      },
      settings: {
        label: "Configuración",
        heading: "Configuración del espacio",
        description: "Elige el idioma del panel y el tema visual"
      }
    },
    settings: {
      title: "Configuración",
      subtitle: "Personaliza este espacio administrativo y guarda tus preferencias",
      themeTitle: "Tema de color",
      themeDescription: "Elige la paleta usada por este panel administrativo",
      languageTitle: "Idioma",
      languageDescription: "Elige cómo deben mostrarse la navegación y el shell del admin",
      save: "Guardar configuración",
      saving: "Guardando",
      saved: "Configuración actualizada",
      sectionOneTitle: "Experiencia actual",
      sectionOneBody: "El tema y el idioma se guardan por cuenta admin para que cada persona use el panel como prefiera",
      sectionTwoTitle: "Idiomas disponibles",
      sectionTwoBody: "Inglés, Portugués de Brasil y Español ya están listos en esta primera versión"
    }
  }
};

const THEME_LABELS = {
  "galaxy-blue": "Galaxy Blue",
  "ocean-cyan": "Ocean Cyan",
  "solar-amber": "Solar Amber",
  "rose-bloom": "Rose Bloom"
};

const LANGUAGE_LABELS = {
  en: "English",
  "pt-BR": "Português - Brasil",
  es: "Español"
};

function getLocaleCopy(language) {
  return LANGUAGE_COPY[language] || LANGUAGE_COPY.en;
}

function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  try {
    return new Intl.DateTimeFormat(
      document.documentElement.lang || "en",
      {
      dateStyle: "medium",
      timeStyle: "short"
      }
    ).format(new Date(value));
  } catch {
    return value;
  }
}

function getUserInitials(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "LK";
  }

  return parts.map((part) => part[0].toUpperCase()).join("");
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

  return "Standard access";
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

function buildAdminTabs(capabilities, pendingCount, copy) {
  const tabs = [
    {
      id: "overview",
      label: copy.tabs.overview.label,
      heading: copy.tabs.overview.heading,
      description: copy.tabs.overview.description,
      icon: "bi-grid-1x2-fill"
    }
  ];

  if (capabilities.canControlMigration) {
    tabs.push({
      id: "control-center",
      label: copy.tabs.controlCenter.label,
      heading: copy.tabs.controlCenter.heading,
      description: copy.tabs.controlCenter.description,
      icon: "bi-toggles2"
    });
  }

  if (capabilities.canManageRolePermissions) {
    tabs.push({
      id: "role-permissions",
      label: copy.tabs.rolePermissions.label,
      heading: copy.tabs.rolePermissions.heading,
      description: copy.tabs.rolePermissions.description,
      icon: "bi-shield-lock-fill"
    });
  }

  if (capabilities.canManageUsers) {
    tabs.push({
      id: "access-requests",
      label: copy.tabs.accessRequests.label,
      heading: copy.tabs.accessRequests.heading,
      description: copy.tabs.accessRequests.description,
      icon: "bi-person-plus-fill",
      badge: pendingCount > 0 ? String(pendingCount) : ""
    });
    tabs.push({
      id: "team",
      label: copy.tabs.team.label,
      heading: copy.tabs.team.heading,
      description: copy.tabs.team.description,
      icon: "bi-people-fill"
    });
    tabs.push({
      id: "logs",
      label: copy.tabs.logs.label,
      heading: copy.tabs.logs.heading,
      description: copy.tabs.logs.description,
      icon: "bi-journal-richtext"
    });
  }

  if (capabilities.canReadRobloxData) {
    tabs.push({
      id: "roblox-lookup",
      label: copy.tabs.robloxLookup.label,
      heading: copy.tabs.robloxLookup.heading,
      description: copy.tabs.robloxLookup.description,
      icon: "bi-database-fill-gear"
    });
  }

  tabs.push({
    id: "settings",
    label: copy.tabs.settings.label,
    heading: copy.tabs.settings.heading,
    description: copy.tabs.settings.description,
    icon: "bi-sliders2"
  });

  return tabs;
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

function SidebarNavItem({ tab, active, onSelect }) {
  return (
    <button
      className={`sidebar-nav__button${active ? " is-active" : ""}`}
      type="button"
      onClick={() => onSelect(tab.id)}
    >
      <span className="sidebar-nav__icon" aria-hidden="true">
        <i className={`bi ${tab.icon}`} />
      </span>
      <span className="sidebar-nav__body">
        <span className="sidebar-nav__label">{tab.label}</span>
        <span className="sidebar-nav__caption">{tab.heading}</span>
      </span>
      {tab.badge ? <span className="sidebar-nav__badge">{tab.badge}</span> : null}
    </button>
  );
}

function RobloxConnectCard({ currentUser, robloxOauthEnabled }) {
  const connected = Boolean(currentUser.robloxUserId && currentUser.robloxAvatarUrl);
  const decided = Boolean(currentUser.robloxOauthStatus);

  return (
    <section className="admin-shell admin-section compact-section">
      <div className="section-head">
        <h2>Roblox account</h2>
        <p>
          {robloxOauthEnabled
            ? "Roblox avatar sync is requested once during login and stays saved on your account"
            : "Roblox avatar sync is currently disabled and can be reactivated later with an environment variable"}
        </p>
      </div>

      <div className="roblox-connect-card">
        <div className="lookup-meta">
          <span>
            {robloxOauthEnabled
              ? connected
                ? "Connected"
                : "Not connected"
              : "Disabled"}
          </span>
          {currentUser.robloxUsername ? (
            <span>Roblox: {currentUser.robloxUsername}</span>
          ) : null}
          {!connected && decided && robloxOauthEnabled ? (
            <span>Decision already saved</span>
          ) : null}
          {!robloxOauthEnabled ? (
            <span>Set ROBLOX_OAUTH_ENABLED=true when you want to use it again</span>
          ) : null}
        </div>

        <div className="member-card__actions">
          {currentUser.robloxProfileUrl ? (
            <a
              className="secondary-button roblox-connect-button"
              href={currentUser.robloxProfileUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open profile
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SettingsPanel({
  copy,
  preferencesDraft,
  availableThemes,
  availableLanguages,
  preferencesState,
  onThemeChange,
  onLanguageChange,
  onSubmit
}) {
  return (
    <section className="admin-shell admin-section">
      <div className="section-head">
        <h2>{copy.settings.title}</h2>
        <p>{copy.settings.subtitle}</p>
      </div>

      <form className="settings-grid" onSubmit={onSubmit}>
        <article className="settings-card">
          <h3>{copy.settings.themeTitle}</h3>
          <p>{copy.settings.themeDescription}</p>
          <div className="settings-options">
            {availableThemes.map((theme) => (
              <label
                key={theme}
                className={`settings-option${
                  preferencesDraft.theme === theme ? " is-selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={theme}
                  checked={preferencesDraft.theme === theme}
                  onChange={(event) => onThemeChange(event.target.value)}
                />
                <span className={`settings-swatch settings-swatch--${theme}`} />
                <span>{THEME_LABELS[theme] || theme}</span>
              </label>
            ))}
          </div>
        </article>

        <article className="settings-card">
          <h3>{copy.settings.languageTitle}</h3>
          <p>{copy.settings.languageDescription}</p>
          <div className="settings-options settings-options--languages">
            {availableLanguages.map((language) => (
              <label
                key={language}
                className={`settings-option${
                  preferencesDraft.language === language ? " is-selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value={language}
                  checked={preferencesDraft.language === language}
                  onChange={(event) => onLanguageChange(event.target.value)}
                />
                <span>{LANGUAGE_LABELS[language] || language}</span>
              </label>
            ))}
          </div>
        </article>

        <article className="settings-card">
          <h3>{copy.settings.sectionOneTitle}</h3>
          <p>{copy.settings.sectionOneBody}</p>
        </article>

        <article className="settings-card">
          <h3>{copy.settings.sectionTwoTitle}</h3>
          <p>{copy.settings.sectionTwoBody}</p>
        </article>

        <article className="settings-card settings-card--wide">
          <div className="settings-submit">
            <div className="settings-submit__actions">
              {preferencesState.error ? (
                <p className="error-copy">{preferencesState.error}</p>
              ) : null}
              {preferencesState.status === "ready" ? (
                <p className="status-copy status-copy--success">
                  {copy.settings.saved}
                </p>
              ) : null}
              <button
                className="submit-button"
                type="submit"
                disabled={preferencesState.status === "loading"}
              >
                {preferencesState.status === "loading"
                  ? copy.settings.saving
                  : copy.settings.save}
              </button>
            </div>
          </div>
        </article>
      </form>
    </section>
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

      {error ? <p className="support-copy control-card__copy">{error}</p> : null}
      {!error && note ? (
        <p className="support-copy control-card__copy">{note}</p>
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
  const [activeTab, setActiveTab] = useState("");
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
  const [preferencesState, setPreferencesState] = useState({
    status: "idle",
    error: ""
  });
  const [pendingRoleDrafts, setPendingRoleDrafts] = useState({});
  const [activeRoleDrafts, setActiveRoleDrafts] = useState({});
  const [rolePermissionDrafts, setRolePermissionDrafts] = useState({});
  const [preferencesDraft, setPreferencesDraft] = useState({
    theme: "galaxy-blue",
    language: "en"
  });

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
      setPreferencesDraft(payload.preferences || { theme: "galaxy-blue", language: "en" });
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

  const interfaceLanguage =
    pageState.status === "ready" ? pageState.data.preferences?.language || "en" : "en";
  const copy = useMemo(() => getLocaleCopy(interfaceLanguage), [interfaceLanguage]);

  const availableTabs = useMemo(() => {
    if (pageState.status !== "ready") {
      return [];
    }

    return buildAdminTabs(
      pageState.data.capabilities,
      pageState.data.pendingUsers.length,
      copy
    );
  }, [copy, pageState]);

  useEffect(() => {
    const theme =
      pageState.status === "ready"
        ? pageState.data.preferences?.theme || "galaxy-blue"
        : "galaxy-blue";

    document.documentElement.lang = interfaceLanguage;
    document.documentElement.dataset.adminTheme = theme;
    document.body.dataset.adminTheme = theme;
  }, [interfaceLanguage, pageState]);

  useEffect(() => {
    if (pageState.status !== "ready" || availableTabs.length === 0) {
      return;
    }

    const hasActiveTab = availableTabs.some((tab) => tab.id === activeTab);

    if (!hasActiveTab) {
      setActiveTab(availableTabs[0].id);
    }
  }, [activeTab, availableTabs, pageState.status]);

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

  async function handleSavePreferences(event) {
    event.preventDefault();
    setPreferencesState({
      status: "loading",
      error: ""
    });

    try {
      const response = await fetch("/api/admin/overview", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(preferencesDraft)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save settings");
      }

      setPageState((current) => ({
        ...current,
        data: {
          ...current.data,
          preferences: payload.preferences,
          availableThemes: payload.availableThemes || current.data.availableThemes,
          availableLanguages:
            payload.availableLanguages || current.data.availableLanguages
        }
      }));
      setPreferencesDraft(payload.preferences);
      setPreferencesState({
        status: "ready",
        error: ""
      });
    } catch (error) {
      setPreferencesState({
        status: "error",
        error: error.message || "Failed to save settings"
      });
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
  const { currentUser } = data;
  const activeTabConfig =
    availableTabs.find((tab) => tab.id === activeTab) || availableTabs[0];

  function renderTabContent() {
    if (!activeTabConfig) {
      return null;
    }

    if (activeTabConfig.id === "overview") {
      return (
        <>
          <section className="admin-shell admin-section">
            <div className="section-head">
              <h2>Access snapshot</h2>
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
                {currentUser.approvedBy ? (
                  <span>Approved by {currentUser.approvedBy}</span>
                ) : null}
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

          <RobloxConnectCard
            currentUser={currentUser}
            robloxOauthEnabled={data.robloxOauthEnabled}
          />
        </>
      );
    }

    if (activeTabConfig.id === "control-center") {
      return (
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
      );
    }

    if (activeTabConfig.id === "role-permissions") {
      return (
        <section className="admin-shell admin-section">
          <div className="section-head">
            <h2>Role permissions</h2>
            <p>Control what each admin role can do inside this panel</p>
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
      );
    }

    if (activeTabConfig.id === "access-requests") {
      return (
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
      );
    }

    if (activeTabConfig.id === "team") {
      return (
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
      );
    }

    if (activeTabConfig.id === "logs") {
      return (
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
      );
    }

    if (activeTabConfig.id === "roblox-lookup") {
      return (
        <section className="admin-shell admin-section">
          <div className="section-head">
            <h2>Roblox player data lookup</h2>
            <p>Read one DataStore entry using the player ID as the entry key</p>
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
      );
    }

    if (activeTabConfig.id === "settings") {
      return (
        <SettingsPanel
          copy={copy}
          preferencesDraft={preferencesDraft}
          availableThemes={data.availableThemes || []}
          availableLanguages={data.availableLanguages || []}
          preferencesState={preferencesState}
          onThemeChange={(theme) => {
            setPreferencesState({
              status: "idle",
              error: ""
            });
            setPreferencesDraft((current) => ({
              ...current,
              theme
            }));
          }}
          onLanguageChange={(language) => {
            setPreferencesState({
              status: "idle",
              error: ""
            });
            setPreferencesDraft((current) => ({
              ...current,
              language
            }));
          }}
          onSubmit={handleSavePreferences}
        />
      );
    }

    return null;
  }

  return (
    <div className="admin-page">
      <div className="admin-layout">
        <aside className="admin-shell admin-sidebar">
          <div className="sidebar-brand">
            <span className="sidebar-brand__mark">LK</span>
            <div className="sidebar-brand__copy">
              <strong>Lockou Admin</strong>
              <span>{copy.shell.brandSubtitle}</span>
            </div>
          </div>

          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {currentUser.robloxAvatarUrl ? (
                <img
                  className="sidebar-avatar__image"
                  src={currentUser.robloxAvatarUrl}
                  alt={currentUser.robloxUsername || currentUser.username}
                  draggable="false"
                />
              ) : (
                getUserInitials(currentUser.username)
              )}
            </div>
            <div className="sidebar-profile__copy">
              <strong>{currentUser.username}</strong>
              <span>
                {currentUser.robloxUsername
                  ? `${currentUser.roleLabel} • @${currentUser.robloxUsername}`
                  : currentUser.roleLabel}
              </span>
              <div className="sidebar-profile__meta">
                <span>
                  {currentUser.permissions.length} {copy.shell.permissionsCount}
                </span>
                <span>
                  {currentUser.status === "active"
                    ? copy.shell.activeStatus
                    : currentUser.status}
                </span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Admin sections">
            {availableTabs.map((tab) => (
              <SidebarNavItem
                key={tab.id}
                tab={tab}
                active={tab.id === activeTabConfig?.id}
                onSelect={setActiveTab}
              />
            ))}
          </nav>

          <div className="sidebar-footer">
            <button
              className="logout-button sidebar-logout"
              type="button"
              onClick={handleLogout}
              disabled={logoutState === "loading"}
            >
              <span className="sidebar-logout__icon" aria-hidden="true">
                <i className="bi bi-box-arrow-right" />
              </span>
              <span>
                {logoutState === "loading" ? copy.shell.leaving : copy.shell.logout}
              </span>
            </button>
          </div>
        </aside>

        <main className="admin-main">
          <section className="admin-shell admin-main-hero">
            <div>
              <p className="eyebrow">{activeTabConfig?.label || "Admin"}</p>
              <h1>{activeTabConfig?.heading || data.heading}</h1>
              <p className="support-copy">
                {activeTabConfig?.description || copy.shell.protectedContent}
              </p>
            </div>

            <div className="workspace-meta">
              <p className="status-pill">{currentUser.roleLabel}</p>
              <p className="workspace-meta__stamp">
                Updated {formatTimestamp(data.updatedAt)}
              </p>
            </div>
          </section>

          <div className="admin-main-stack">{renderTabContent()}</div>
        </main>
      </div>
    </div>
  );
}

export default AdminApp;
