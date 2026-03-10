const DEFAULT_PLAYER_TEMPLATE = {
  Donations: 0,
  Gamepasses: {},
  FavoriteDances: {},
  Tools: {},
  Hoverboards: {},
  Pets: {},
  Auras: {},
  Hats: {},
  bannerImg: 121797309734636,
  bannerTitle: "StepUp",
  AdminItems: {
    Tools: {},
    Auras: {},
    Hoverboards: {},
    Hats: {},
  },
  pId: 0,
  gamepassForSale: {},
  newitemplatedsf2053: 0,
  favoritedSongs: {},
  totalFavoritedSongs: 0,
  lavasword23: 0,
  purchasedSongs: {},
};

const CORE_INVENTORY_FIELDS = [
  "Gamepasses",
  "FavoriteDances",
  "Tools",
  "Hoverboards",
  "Pets",
  "Auras",
  "Hats",
];

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }

  if (isPlainObject(value)) {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = deepClone(item);
    }
    return output;
  }

  return value;
}

function deepEqual(left, right) {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    if (left.length !== right.length) {
      return false;
    }
    for (let index = 0; index < left.length; index += 1) {
      if (!deepEqual(left[index], right[index])) {
        return false;
      }
    }
    return true;
  }

  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) {
      return false;
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) {
        return false;
      }
      if (!deepEqual(left[key], right[key])) {
        return false;
      }
    }
    return true;
  }

  return false;
}

function mergeWithTemplate(templateValue, dataValue) {
  if (Array.isArray(templateValue)) {
    if (Array.isArray(dataValue)) {
      return deepClone(dataValue);
    }
    return deepClone(templateValue);
  }

  if (isPlainObject(templateValue)) {
    const output = deepClone(templateValue);
    if (!isPlainObject(dataValue)) {
      return output;
    }

    for (const [key, value] of Object.entries(dataValue)) {
      if (key in output) {
        output[key] = mergeWithTemplate(output[key], value);
      } else {
        output[key] = deepClone(value);
      }
    }

    return output;
  }

  if (dataValue === undefined || dataValue === null) {
    return deepClone(templateValue);
  }

  return deepClone(dataValue);
}

function hasEntries(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length > 0;
  }

  return false;
}

export function normalizePlayerData(userId, rawData) {
  const normalized = mergeWithTemplate(DEFAULT_PLAYER_TEMPLATE, rawData);
  if (
    normalized.pId === null ||
    normalized.pId === undefined ||
    normalized.pId === "" ||
    normalized.pId === 0
  ) {
    const asNumber = Number(userId);
    normalized.pId = Number.isFinite(asNumber) ? asNumber : String(userId);
  }
  return normalized;
}

export function hasImportantTemplateData(rawData) {
  if (!isPlainObject(rawData)) {
    return false;
  }

  const donations = Number(rawData.Donations);
  if (Number.isFinite(donations) && donations > 0) {
    return true;
  }

  for (const field of CORE_INVENTORY_FIELDS) {
    if (hasEntries(rawData[field])) {
      return true;
    }
  }

  return false;
}

export function isPlayerTemplateEmpty(rawData) {
  if (!isPlainObject(rawData)) {
    return true;
  }

  const merged = mergeWithTemplate(DEFAULT_PLAYER_TEMPLATE, rawData);
  merged.pId = 0;

  const baseline = deepClone(DEFAULT_PLAYER_TEMPLATE);
  baseline.pId = 0;

  return deepEqual(merged, baseline);
}

export function getDefaultPlayerTemplate() {
  return deepClone(DEFAULT_PLAYER_TEMPLATE);
}
