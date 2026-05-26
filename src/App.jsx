import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FolderOpen,
  FolderPlus,
  ListPlus,
  LogIn,
  LogOut,
  Play,
  Plus,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  X,
} from 'lucide-react';
import {
  deleteGroupForUser,
  getSavedSession,
  loginUser,
  logoutUser,
  saveGroupForUser,
} from './localDb.js';

const STORAGE_KEY = 'vibrant-roulette-items';

const STARTER_ITEMS = [
  'Tacos',
  'Movie night',
  'Beach trip',
  'Study sprint',
  'Pizza',
  'Board games',
  'Coffee run',
  'Surprise',
];

const SLICE_COLORS = [
  '#ff3d81',
  '#14c8ff',
  '#ffe156',
  '#20e070',
  '#ff8a1f',
  '#8b5cf6',
  '#00c2a8',
  '#ff4d4d',
  '#a3e635',
  '#f472b6',
  '#38bdf8',
  '#facc15',
];

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    return STARTER_ITEMS;
  }

  return STARTER_ITEMS;
}

function loadInitialState() {
  const session = getSavedSession();
  const groups = session?.groups ?? [];
  const firstGroup = groups[0];

  return {
    activeGroupId: firstGroup?.id ?? null,
    groupName: firstGroup?.name ?? '',
    groups,
    items: firstGroup?.items?.length ? firstGroup.items : loadItems(),
    session,
  };
}

function cryptoRandomIndex(length) {
  if (length <= 1) return 0;

  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

function shuffleItems(items) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = cryptoRandomIndex(index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export default function App() {
  const [initialState] = useState(loadInitialState);
  const [session, setSession] = useState(initialState.session);
  const [groups, setGroups] = useState(initialState.groups);
  const [items, setItems] = useState(initialState.items);
  const [activeGroupId, setActiveGroupId] = useState(initialState.activeGroupId);
  const [groupName, setGroupName] = useState(initialState.groupName);
  const [usernameInput, setUsernameInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [newItem, setNewItem] = useState('');
  const [bulkItems, setBulkItems] = useState('');
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(null);
  const [isWinnerBannerOpen, setIsWinnerBannerOpen] = useState(false);
  const spinTimer = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      return;
    }
  }, [items]);

  useEffect(() => {
    return () => clearTimeout(spinTimer.current);
  }, []);

  const segmentSize = 360 / Math.max(items.length, 1);

  const wheelBackground = useMemo(() => {
    if (items.length === 0) {
      return 'conic-gradient(#e5e7eb 0deg 360deg)';
    }

    return `conic-gradient(${items
      .map((_, index) => {
        const start = index * segmentSize;
        const end = (index + 1) * segmentSize;
        return `${SLICE_COLORS[index % SLICE_COLORS.length]} ${start}deg ${end}deg`;
      })
      .join(', ')})`;
  }, [items, segmentSize]);

  function clearWinner() {
    setWinnerIndex(null);
    setIsWinnerBannerOpen(false);
  }

  function handleLogin(event) {
    event.preventDefault();

    const nextSession = loginUser(usernameInput);
    if (!nextSession) {
      setLoginError('Enter a username.');
      return;
    }

    const nextGroups = nextSession.groups ?? [];
    const firstGroup = nextGroups[0];

    setSession(nextSession);
    setGroups(nextGroups);
    setLoginError('');
    setUsernameInput('');
    clearWinner();

    if (firstGroup) {
      loadGroup(firstGroup);
      return;
    }

    setItems(STARTER_ITEMS);
    setActiveGroupId(null);
    setGroupName('');
  }

  function handleLogout() {
    logoutUser();
    clearWinner();
    setSession(null);
    setGroups([]);
    setActiveGroupId(null);
    setGroupName('');
    setItems(STARTER_ITEMS);
  }

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;

    setItems((current) => [...current, trimmed]);
    setNewItem('');
    clearWinner();
  }

  function addBulkItems() {
    const additions = bulkItems
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (additions.length === 0) return;

    setItems((current) => [...current, ...additions]);
    setBulkItems('');
    clearWinner();
  }

  function removeItem(indexToRemove) {
    setItems((current) => current.filter((_, index) => index !== indexToRemove));
    clearWinner();
  }

  function updateItem(indexToUpdate, value) {
    setItems((current) => current.map((item, index) => (index === indexToUpdate ? value : item)));
    clearWinner();
  }

  function cleanEditedItem(indexToClean) {
    setItems((current) => {
      return current
        .map((item, index) => (index === indexToClean ? item.trim() : item))
        .filter(Boolean);
    });
    clearWinner();
  }

  function startNewGroup() {
    if (isSpinning) return;

    setItems([]);
    setActiveGroupId(null);
    setGroupName('');
    clearWinner();
  }

  function saveCurrentGroup() {
    if (!session || isSpinning || items.length === 0) return;

    const result = saveGroupForUser(session.username, {
      id: activeGroupId,
      items,
      name: groupName,
    });

    if (!result) return;

    setSession(result.user);
    setGroups(result.user.groups);
    setActiveGroupId(result.group.id);
    setGroupName(result.group.name);
    clearWinner();
  }

  function loadGroup(group) {
    if (isSpinning) return;

    setItems(group.items);
    setActiveGroupId(group.id);
    setGroupName(group.name);
    clearWinner();
  }

  function deleteSavedGroup(groupId) {
    if (!session || isSpinning) return;

    const nextUser = deleteGroupForUser(session.username, groupId);
    if (!nextUser) return;

    const nextGroups = nextUser.groups ?? [];
    setSession(nextUser);
    setGroups(nextGroups);
    clearWinner();

    if (activeGroupId !== groupId) return;

    const nextGroup = nextGroups[0];
    if (nextGroup) {
      loadGroup(nextGroup);
      return;
    }

    setItems([]);
    setActiveGroupId(null);
    setGroupName('');
  }

  function spinWheel() {
    if (isSpinning || items.length === 0) return;

    const selectedIndex = cryptoRandomIndex(items.length);
    const selectedCenter = selectedIndex * segmentSize + segmentSize / 2;
    const targetRotation = (360 - selectedCenter) % 360;
    const currentRotation = ((rotation % 360) + 360) % 360;
    const travel = ((targetRotation - currentRotation + 360) % 360) + 360 * 6;

    clearWinner();
    setIsSpinning(true);
    setRotation((current) => current + travel);

    spinTimer.current = setTimeout(() => {
      setWinnerIndex(selectedIndex);
      setIsWinnerBannerOpen(true);
      setIsSpinning(false);
    }, 4300);
  }

  function resetItems() {
    setItems(STARTER_ITEMS);
    setActiveGroupId(null);
    clearWinner();
  }

  function clearItems() {
    setItems([]);
    clearWinner();
  }

  const winner = winnerIndex === null ? null : items[winnerIndex];

  if (!session) {
    return (
      <main className="login-shell">
        <form className="login-panel" onSubmit={handleLogin}>
          <div className="login-mark" aria-hidden="true">
            <Sparkles size={34} />
          </div>
          <p className="eyebrow">Local profile</p>
          <h1>Roulette</h1>
          <div className="login-row">
            <input
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              placeholder="Username"
              aria-label="Username"
              autoFocus
            />
            <button className="login-button" type="submit">
              <LogIn size={20} />
              Enter
            </button>
          </div>
          {loginError ? <p className="login-error">{loginError}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {isWinnerBannerOpen && winner ? (
        <div className="winner-banner" role="dialog" aria-labelledby="winner-title" aria-live="assertive">
          <div className="winner-icon" aria-hidden="true">
            <Trophy size={28} />
          </div>
          <div className="winner-copy">
            <p id="winner-title">Winner</p>
            <strong>{winner}</strong>
          </div>
          <button className="banner-action" type="button" onClick={spinWheel} disabled={isSpinning}>
            <Play size={18} fill="currentColor" />
            Spin Again
          </button>
          <button
            className="banner-close"
            type="button"
            onClick={() => setIsWinnerBannerOpen(false)}
            title="Close winner banner"
            aria-label="Close winner banner"
          >
            <X size={20} />
          </button>
        </div>
      ) : null}

      <section className="roulette-stage" aria-label="Roulette wheel">
        <div className="top-bar">
          <div>
            <p className="eyebrow">Random picker</p>
            <h1>Roulette</h1>
          </div>
          <div className="top-actions">
            <div className="session-pill">
              <UserRound size={18} />
              <span>{session.username}</span>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => {
                setItems((current) => shuffleItems(current));
                clearWinner();
              }}
              disabled={items.length < 2 || isSpinning}
              title="Shuffle items"
              aria-label="Shuffle items"
            >
              <Shuffle size={20} />
            </button>
          </div>
        </div>

        <div className="wheel-wrap">
          <div className="pointer" aria-hidden="true" />
          <div
            className={`wheel ${isSpinning ? 'is-spinning' : ''}`}
            style={{ background: wheelBackground, transform: `rotate(${rotation}deg)` }}
          >
            {items.map((item, index) => {
              const midpoint = index * segmentSize + segmentSize / 2;
              const flip = midpoint > 90 && midpoint < 270 ? 180 : 0;

              return (
                <span
                  className="wheel-label"
                  key={`wheel-${index}`}
                  style={{
                    transform: `rotate(${midpoint}deg) translateY(calc(var(--label-radius) * -1)) rotate(${flip}deg)`,
                    fontSize: items.length > 16 ? '0.58rem' : items.length > 10 ? '0.68rem' : '0.8rem',
                  }}
                >
                  {item}
                </span>
              );
            })}
            <div className="wheel-rim" />
            <div className="wheel-hub">
              <Sparkles size={30} aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="spin-row">
          <button className="spin-button" type="button" onClick={spinWheel} disabled={items.length === 0 || isSpinning}>
            <Play size={22} fill="currentColor" />
            {isSpinning ? 'Spinning' : 'Spin'}
          </button>
          <div className="result-box" aria-live="polite">
            <Trophy size={22} />
            <span>{winner ?? 'Waiting for a spin'}</span>
          </div>
        </div>
      </section>

      <aside className="controls-panel" aria-label="Roulette items">
        <div className="session-strip">
          <div className="session-name">
            <UserRound size={18} />
            <span>{session.username}</span>
          </div>
          <button className="mini-button" type="button" onClick={handleLogout} title="Log out" aria-label="Log out">
            <LogOut size={16} />
          </button>
        </div>

        <section className="group-manager" aria-label="Saved groups">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Groups</p>
              <h2>{groups.length} groups</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={startNewGroup}
              disabled={isSpinning}
              title="Start new group"
              aria-label="Start new group"
            >
              <FolderPlus size={20} />
            </button>
          </div>

          <div className="group-save-row">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              disabled={isSpinning}
              placeholder="Group name"
              aria-label="Group name"
            />
            <button className="secondary-button" type="button" onClick={saveCurrentGroup} disabled={items.length === 0 || isSpinning}>
              <Save size={18} />
              Save Group
            </button>
          </div>

          <div className="group-list" aria-label="Saved group list">
            {groups.length === 0 ? (
              <div className="compact-empty">No saved groups yet.</div>
            ) : (
              groups.map((group) => (
                <div className={`group-row ${group.id === activeGroupId ? 'is-active' : ''}`} key={group.id}>
                  <button className="group-load" type="button" onClick={() => loadGroup(group)} disabled={isSpinning}>
                    <span>{group.name}</span>
                    <small>{group.items.length} items</small>
                  </button>
                  <button
                    className="mini-button"
                    type="button"
                    onClick={() => loadGroup(group)}
                    disabled={isSpinning}
                    title={`Load ${group.name}`}
                    aria-label={`Load ${group.name}`}
                  >
                    <FolderOpen size={16} />
                  </button>
                  <button
                    className="mini-button"
                    type="button"
                    onClick={() => deleteSavedGroup(group.id)}
                    disabled={isSpinning}
                    title={`Delete ${group.name}`}
                    aria-label={`Delete ${group.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="panel-heading">
          <div>
            <p className="eyebrow">Options</p>
            <h2>{items.length} items</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={resetItems}
            disabled={isSpinning}
            title="Reset sample items"
            aria-label="Reset sample items"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <div className="add-row">
          <input
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addItem();
            }}
            disabled={isSpinning}
            placeholder="Add one item"
            aria-label="Add one item"
          />
          <button
            className="icon-button add-button"
            type="button"
            onClick={addItem}
            disabled={isSpinning}
            title="Add item"
            aria-label="Add item"
          >
            <Plus size={21} />
          </button>
        </div>

        <div className="bulk-box">
          <textarea
            value={bulkItems}
            onChange={(event) => setBulkItems(event.target.value)}
            disabled={isSpinning}
            placeholder="Paste many items"
            aria-label="Paste many items"
            rows="4"
          />
          <button className="secondary-button" type="button" onClick={addBulkItems} disabled={isSpinning}>
            <ListPlus size={19} />
            Add List
          </button>
        </div>

        <div className="item-list" aria-label="Current items">
          {items.length === 0 ? (
            <div className="empty-state">Add items to unlock the wheel.</div>
          ) : (
            items.map((item, index) => (
              <div className="item-row" key={`item-${index}`}>
                <span className="color-chip" style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }} />
                <input
                  className="item-edit"
                  value={item}
                  onChange={(event) => updateItem(index, event.target.value)}
                  onBlur={() => cleanEditedItem(index)}
                  disabled={isSpinning}
                  aria-label={`Edit item ${index + 1}`}
                />
                <button
                  className="mini-button"
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={isSpinning}
                  title={`Remove ${item}`}
                  aria-label={`Remove ${item}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <button className="danger-button" type="button" onClick={clearItems} disabled={items.length === 0 || isSpinning}>
          <Trash2 size={18} />
          Clear
        </button>
      </aside>
    </main>
  );
}
