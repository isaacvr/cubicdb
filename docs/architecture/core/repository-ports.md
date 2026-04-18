# Repository Ports

This document defines all repository interfaces (ports). These are the persistence abstraction layer.

Each repository has two implementations:
- **Browser**: IndexedDB, localStorage, static bundled data
- **Electron**: IPC to main process, local database, filesystem

---

## Core Repository Pattern

All repositories follow this pattern:

```ts
interface IRepository<T> {
  get(id: string): Promise<Result<T, RepositoryError>>;
  getAll(filter?: Filter): Promise<Result<T[], RepositoryError>>;
  add(entity: T): Promise<Result<T, RepositoryError>>;
  update(entity: T): Promise<Result<T, RepositoryError>>;
  remove(entity: T): Promise<Result<void, RepositoryError>>;
}

export enum RepositoryError {
  NOT_FOUND = 'not_found',
  DUPLICATE = 'duplicate',
  VALIDATION_FAILED = 'validation_failed',
  PERSISTENCE_FAILED = 'persistence_failed',
  UNKNOWN = 'unknown',
}
```

---

## ISolveRepository

Persists individual solve records.

```ts
export interface ISolveRepository {
  /**
   * Get a single solve by ID.
   */
  get(id: string): Promise<Result<Solve, RepositoryError>>;

  /**
   * Get all solves for a session.
   * Optionally filter by date range, penalty, etc.
   */
  getBySolver(
    sessionId: string,
    options?: {
      since?: Date;
      until?: Date;
      penalty?: Penalty[];
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<Solve[], RepositoryError>>;

  /**
   * Add a new solve.
   */
  add(solve: Solve): Promise<Result<Solve, RepositoryError>>;

  /**
   * Update an existing solve (penalty, comments, etc).
   */
  update(solve: Solve): Promise<Result<Solve, RepositoryError>>;

  /**
   * Delete a single solve.
   */
  remove(solveId: string): Promise<Result<void, RepositoryError>>;

  /**
   * Delete multiple solves (batch operation).
   */
  removeBySolver(solveIds: string[]): Promise<Result<number, RepositoryError>>;

  /**
   * Get statistics (count, averages, etc) without fetching all solves.
   * Returns pre-calculated values if available.
   */
  getStatistics(sessionId: string): Promise<Result<SolveStatistics, RepositoryError>>;

  /**
   * Clear all solves for a session.
   */
  clearSolver(sessionId: string): Promise<Result<number, RepositoryError>>;
}

interface SolveStatistics {
  count: number;
  bestTime: number;
  worstTime: number;
  averageTime: number;
  dnfCount: number;
}
```

**Storage Location**:
- Browser: IndexedDB, object store `solves`
- Electron: Main process, persisted database

---

## ISessionRepository

Persists session configurations and metadata.

```ts
export interface ISessionRepository {
  /**
   * Get a single session by ID.
   */
  get(id: string): Promise<Result<Session, RepositoryError>>;

  /**
   * Get all sessions for the user (or all available).
   * Sorted by creation date or user preference.
   */
  getAll(): Promise<Result<Session[], RepositoryError>>;

  /**
   * Create a new session.
   */
  add(session: Session): Promise<Result<Session, RepositoryError>>;

  /**
   * Update session metadata or settings.
   */
  update(session: Session): Promise<Result<Session, RepositoryError>>;

  /**
   * Delete a session.
   * Optionally cascade-delete solves in this session.
   */
  remove(sessionId: string): Promise<Result<void, RepositoryError>>;

  /**
   * Find session by name (for deduplication).
   */
  findByName(name: string): Promise<Result<Session | null, RepositoryError>>;
}
```

**Storage Location**:
- Browser: IndexedDB, object store `sessions`
- Electron: Main process, persisted database

---

## IAlgorithmRepository

Read-only access to algorithms (with optional write for user preferences).

```ts
export interface IAlgorithmRepository {
  /**
   * Get a single algorithm by ID.
   */
  get(id: string): Promise<Result<Algorithm, RepositoryError>>;

  /**
   * Get all algorithms or filter by:
   * - puzzle type
   * - method (e.g., "CFOP/OLL")
   * - search term
   */
  getAll(filter?: {
    puzzle?: PuzzleType;
    method?: string;
    search?: string;
  }): Promise<Result<Algorithm[], RepositoryError>>;

  /**
   * Get algorithm tree hierarchy.
   * Returns algorithms organized by parentPath.
   */
  getTree(puzzle: PuzzleType): Promise<Result<AlgorithmNode[], RepositoryError>>;

  /**
   * Get a subtree for a method (e.g., all OLL algorithms).
   */
  getSubtree(parentPath: string): Promise<Result<Algorithm[], RepositoryError>>;

  /**
   * Search algorithms by name or short name.
   */
  search(query: string): Promise<Result<Algorithm[], RepositoryError>>;

  /**
   * Update user preferences for an algorithm (votes, custom notes, etc).
   * This is the only write operation.
   */
  updateUserPreferences(
    algorithmId: string,
    preferences: AlgorithmUserPreferences
  ): Promise<Result<void, RepositoryError>>;

  /**
   * Get user preferences for an algorithm.
   */
  getUserPreferences(algorithmId: string): Promise<Result<AlgorithmUserPreferences, RepositoryError>>;
}

interface AlgorithmUserPreferences {
  votes?: number;
  notes?: string;
  customSolution?: string;
  lastViewed?: Date;
}

interface AlgorithmNode {
  _id: string;
  name: string;
  parentPath: string;
  children: AlgorithmNode[];
  algorithm?: Algorithm; // if leaf node
}
```

**Storage Location**:
- Browser: Static bundled `.db` file, IndexedDB cache
- Electron: Bundled `.db` file, local database, IndexedDB cache

---

## IReconstructionRepository

Persists user reconstructions of solves.

```ts
export interface IReconstructionRepository {
  /**
   * Get a reconstruction by ID.
   */
  get(id: string): Promise<Result<Reconstruction, RepositoryError>>;

  /**
   * Get all reconstructions for a solve or session.
   */
  getBySolver(
    solveId?: string,
    sessionId?: string
  ): Promise<Result<Reconstruction[], RepositoryError>>;

  /**
   * Create a new reconstruction.
   */
  add(reconstruction: Reconstruction): Promise<Result<Reconstruction, RepositoryError>>;

  /**
   * Update a reconstruction.
   */
  update(reconstruction: Reconstruction): Promise<Result<Reconstruction, RepositoryError>>;

  /**
   * Delete a reconstruction.
   */
  remove(reconstructionId: string): Promise<Result<void, RepositoryError>>;

  /**
   * Get related algorithms for a solve (used in reconstruction).
   */
  getRelatedAlgorithms(solveId: string): Promise<Result<Algorithm[], RepositoryError>>;
}

interface Reconstruction {
  _id: string;
  solveId: string;
  scramble: string;
  moves: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  solutionQuality?: 'perfect' | 'mostly_correct' | 'incomplete';
}
```

**Storage Location**:
- Browser: IndexedDB, object store `reconstructions`
- Electron: Main process, persisted database

---

## ITutorialRepository

Read-only access to learning resources.

```ts
export interface ITutorialRepository {
  /**
   * Get a single tutorial.
   */
  get(id: string): Promise<Result<Tutorial, RepositoryError>>;

  /**
   * Get all tutorials or filter by type/puzzle.
   */
  getAll(filter?: {
    puzzle?: PuzzleType;
    type?: 'method' | 'technique' | 'theory';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }): Promise<Result<Tutorial[], RepositoryError>>;

  /**
   * Search tutorials by title or content.
   */
  search(query: string): Promise<Result<Tutorial[], RepositoryError>>;

  /**
   * Get tutorial progress for the user.
   */
  getProgress(tutorialId: string): Promise<Result<TutorialProgress, RepositoryError>>;

  /**
   * Update tutorial progress.
   */
  updateProgress(
    tutorialId: string,
    progress: Partial<TutorialProgress>
  ): Promise<Result<void, RepositoryError>>;
}

interface Tutorial {
  _id: string;
  title: string;
  description: string;
  puzzle: PuzzleType;
  type: 'method' | 'technique' | 'theory';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: TutorialContent;
  relatedAlgorithms?: string[]; // Algorithm IDs
  relatedTutorials?: string[]; // Tutorial IDs
}

interface TutorialContent {
  sections: TutorialSection[];
  videoUrl?: string;
  practiceExercises?: Exercise[];
}

interface TutorialProgress {
  completed: boolean;
  currentSection: number;
  completedSections: number[];
  exerciseResults: { exerciseId: string; score: number }[];
}
```

**Storage Location**:
- Browser: Static bundled `.db` file, IndexedDB cache
- Electron: Bundled `.db` file, local database

---

## ICacheRepository

Manages generated content cache (images, videos, generated PDFs).

```ts
export interface ICacheRepository {
  /**
   * Get cached content by key.
   * Returns null if not found or expired.
   */
  get(key: string): Promise<Result<CacheEntry | null, RepositoryError>>;

  /**
   * Store content in cache.
   * @param ttl Time-to-live in milliseconds (optional)
   */
  set(
    key: string,
    value: CacheEntry,
    ttl?: number
  ): Promise<Result<void, RepositoryError>>;

  /**
   * Delete cache entry.
   */
  remove(key: string): Promise<Result<void, RepositoryError>>;

  /**
   * Clear all cache.
   */
  clear(): Promise<Result<number, RepositoryError>>;

  /**
   * Get cache statistics.
   */
  getStats(): Promise<Result<CacheStats, RepositoryError>>;
}

interface CacheEntry {
  key: string;
  value: any; // Blob, string, or JSON
  type: 'image' | 'video' | 'pdf' | 'json';
  createdAt: Date;
  expiresAt?: Date;
  size?: number; // bytes
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}
```

**Storage Location**:
- Browser: Cache API or IndexedDB
- Electron: Local filesystem (`~/.cubicdb/cache/`)

---

## IConfigRepository

Key-value store for application configuration.

```ts
export interface IConfigRepository {
  /**
   * Get a config value.
   * @param key Config key (e.g., "theme", "language", "lastSessionId")
   * @param defaultValue Fallback if not found
   */
  get<T = any>(key: string, defaultValue?: T): Promise<Result<T, RepositoryError>>;

  /**
   * Get multiple config values at once.
   */
  getMany(keys: string[]): Promise<Result<Record<string, any>, RepositoryError>>;

  /**
   * Set a config value.
   */
  set<T = any>(key: string, value: T): Promise<Result<void, RepositoryError>>;

  /**
   * Set multiple config values at once.
   */
  setMany(values: Record<string, any>): Promise<Result<void, RepositoryError>>;

  /**
   * Delete a config value.
   */
  remove(key: string): Promise<Result<void, RepositoryError>>;

  /**
   * Get all config as object.
   */
  getAll(): Promise<Result<Record<string, any>, RepositoryError>>;

  /**
   * Listen for config changes.
   */
  subscribe(key: string, callback: (value: any) => void): () => void;
}

interface ConfigSchema {
  // UI
  theme: 'light' | 'dark' | 'system';
  language: string;
  layout: 'compact' | 'normal' | 'spacious';

  // Session
  lastSessionId?: string;
  activeSessionId?: string;

  // Device
  preferredDeviceId?: string;
  bluetoothPairedDevices?: DeviceConfig[];

  // Preferences
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  celebrationEnabled: boolean;

  // Advanced
  debugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Custom
  [key: string]: any;
}
```

**Storage Location**:
- Browser: localStorage
- Electron: Main process, config file (`~/.cubicdb/config.json`)

---

## IThemeRepository

User theme customization.

```ts
export interface IThemeRepository {
  /**
   * Get current active theme.
   */
  getActive(): Promise<Result<Theme, RepositoryError>>;

  /**
   * Get all available themes (built-in + user-created).
   */
  getAll(): Promise<Result<Theme[], RepositoryError>>;

  /**
   * Get a specific theme.
   */
  get(themeId: string): Promise<Result<Theme, RepositoryError>>;

  /**
   * Set active theme.
   */
  setActive(themeId: string): Promise<Result<void, RepositoryError>>;

  /**
   * Create a custom theme.
   */
  create(theme: Theme): Promise<Result<Theme, RepositoryError>>;

  /**
   * Update a theme.
   */
  update(theme: Theme): Promise<Result<Theme, RepositoryError>>;

  /**
   * Delete a custom theme.
   */
  remove(themeId: string): Promise<Result<void, RepositoryError>>;
}

interface Theme {
  _id: string;
  name: string;
  builtin: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    accent: string;
    [key: string]: string;
  };
  fonts?: {
    [key: string]: string;
  };
}
```

**Storage Location**:
- Browser: IndexedDB
- Electron: Config directory

---

## Adapter Selection

At app startup, select the appropriate adapter:

```ts
export function createRepositories(): Repositories {
  const platform = detectPlatform(); // 'electron' | 'browser' | 'capacitor'

  return {
    solves: platform === 'electron' 
      ? new ElectronSolveRepository() 
      : new IndexedDBSolveRepository(),
    
    sessions: platform === 'electron'
      ? new ElectronSessionRepository()
      : new IndexedDBSessionRepository(),
    
    algorithms: platform === 'electron'
      ? new ElectronAlgorithmRepository()
      : new BrowserAlgorithmRepository(),
    
    // ... etc for all repositories
  };
}

// In app initialization
const repos = createRepositories();
diContainer.register('solveRepo', repos.solves);
diContainer.register('sessionRepo', repos.sessions);
// ... etc
```

---

## Error Handling Strategy

All repository methods return `Result<T, RepositoryError>`. Callers must handle errors:

```ts
const result = await solveRepo.get(solveId);

if (result.isOk()) {
  const solve = result.value;
  // use solve
} else {
  const error = result.error;
  
  if (error === RepositoryError.NOT_FOUND) {
    showError('Solve not found');
  } else if (error === RepositoryError.PERSISTENCE_FAILED) {
    showError('Failed to load solve. Check your connection.');
  } else {
    showError('Unknown error');
  }
}
```

---

## Transaction Support (Optional)

For complex operations that span multiple repositories:

```ts
export interface ITransaction {
  solves: ISolveRepository;
  sessions: ISessionRepository;
  // ... all repos
  
  commit(): Promise<Result<void, RepositoryError>>;
  rollback(): Promise<Result<void, RepositoryError>>;
}

// Usage
const tx = await db.transaction();
try {
  await tx.solves.add(solve);
  await tx.sessions.update(session);
  await tx.commit();
} catch (error) {
  await tx.rollback();
}
```

This is optional and only needed for cross-repository atomic operations.

