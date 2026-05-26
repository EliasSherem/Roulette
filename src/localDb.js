const DB_KEY = 'vibrant-roulette-local-db-v1';
const SESSION_KEY = 'vibrant-roulette-session-v1';

function createEmptyDb() {
  return {
    users: {},
  };
}

function cleanUsername(username) {
  return String(username).trim().replace(/\s+/g, ' ');
}

function userKey(username) {
  return cleanUsername(username).toLowerCase();
}

function readDb() {
  try {
    const saved = JSON.parse(localStorage.getItem(DB_KEY));
    if (saved && typeof saved === 'object' && saved.users && typeof saved.users === 'object') {
      return saved;
    }
  } catch {
    return createEmptyDb();
  }

  return createEmptyDb();
}

function writeDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `group-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeItems(items) {
  return items.map(String).map((item) => item.trim()).filter(Boolean);
}

function createUser(username) {
  const displayName = cleanUsername(username);

  return {
    username: displayName,
    key: userKey(displayName),
    groups: [],
  };
}

function sortGroups(groups) {
  return [...groups].sort((first, second) => {
    return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
  });
}

export function getSavedSession() {
  try {
    const username = localStorage.getItem(SESSION_KEY);
    if (!username) return null;
    return loadUser(username);
  } catch {
    return null;
  }
}

export function loginUser(username) {
  const displayName = cleanUsername(username);
  if (!displayName) return null;

  const db = readDb();
  const key = userKey(displayName);
  const user = db.users[key] ?? createUser(displayName);

  user.username = user.username || displayName;
  user.key = key;
  user.groups = sortGroups(Array.isArray(user.groups) ? user.groups : []);
  db.users[key] = user;

  writeDb(db);
  localStorage.setItem(SESSION_KEY, user.username);

  return user;
}

export function loadUser(username) {
  const key = userKey(username);
  if (!key) return null;

  const db = readDb();
  const user = db.users[key];
  if (!user) return null;

  return {
    ...user,
    key,
    groups: sortGroups(Array.isArray(user.groups) ? user.groups : []),
  };
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

export function saveGroupForUser(username, group) {
  const key = userKey(username);
  if (!key) return null;

  const db = readDb();
  const user = db.users[key] ?? createUser(username);
  const groups = Array.isArray(user.groups) ? user.groups : [];
  const name = String(group.name || '').trim() || `Group ${groups.length + 1}`;
  const items = sanitizeItems(group.items || []);
  const existingIndex = groups.findIndex((savedGroup) => {
    return savedGroup.id === group.id || savedGroup.name.toLowerCase() === name.toLowerCase();
  });
  const now = new Date().toISOString();
  const savedGroup = {
    id: existingIndex >= 0 ? groups[existingIndex].id : createId(),
    name,
    items,
    createdAt: existingIndex >= 0 ? groups[existingIndex].createdAt : now,
    updatedAt: now,
  };

  const nextGroups =
    existingIndex >= 0
      ? groups.map((currentGroup, index) => (index === existingIndex ? savedGroup : currentGroup))
      : [savedGroup, ...groups];

  user.groups = sortGroups(nextGroups);
  db.users[key] = user;
  writeDb(db);

  return {
    user,
    group: savedGroup,
  };
}

export function deleteGroupForUser(username, groupId) {
  const key = userKey(username);
  if (!key) return null;

  const db = readDb();
  const user = db.users[key];
  if (!user) return null;

  user.groups = sortGroups((Array.isArray(user.groups) ? user.groups : []).filter((group) => group.id !== groupId));
  db.users[key] = user;
  writeDb(db);

  return user;
}
