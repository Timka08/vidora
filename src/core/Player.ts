import MediaController from './MediaController.js';

export const EVENTS = {
  loadedmetadata: 'loadedmetadata',
  play: 'play',
  pause: 'pause',
  timeupdate: 'timeupdate',
  ended: 'ended',
} as const;

export type VideoEventName = keyof typeof EVENTS;

export type PlayerLifecycleState =
  | 'created'
  | 'initializing'
  | 'ready'
  | 'error'
  | 'destroyed';

export interface PlayerInitializationContext {
  readonly signal: AbortSignal;
  addCleanup(cleanup: () => void): void;
}

type PlayerListener = EventListenerOrEventListenerObject;

export default class Player {
  private readonly mediaController: MediaController;
  private readonly initializationOperation: (
    context: PlayerInitializationContext,
  ) => Promise<void>;
  private readonly subscribers = new Map<VideoEventName, Set<PlayerListener>>();
  private readonly listenedEvents = new Set<VideoEventName>();
  private readonly nativeListeners = new Map<VideoEventName, EventListener>();
  private readonly initializationCleanups = new Set<() => void>();

  private state: PlayerLifecycleState = 'created';
  private initializationAbortController: AbortController | null = null;

  constructor(
    mediaController: MediaController,
    initializationOperation: (
      context: PlayerInitializationContext,
    ) => Promise<void> = () => Promise.resolve(),
  ) {
    this.mediaController = mediaController;
    this.initializationOperation = initializationOperation;
  }

  public getState(): PlayerLifecycleState {
    return this.state;
  }

  async initialize(): Promise<void> {
    if (this.state === 'initializing') {
      throw new Error('Player is already initializing.');
    }
    if (this.state !== 'created') {
      throw new Error('Player is already initialized or destroyed.');
    }

    return this.runInitialization();
  }

  private async runInitialization(): Promise<void> {
    this.state = 'initializing';
    const abortController = new AbortController();
    this.initializationAbortController = abortController;
    const abortError = new Error('Player was destroyed during initialization.');

    let rejectOnAbort!: (reason: Error) => void;
    const aborted = new Promise<never>((_, reject) => {
      rejectOnAbort = reject;
    });
    const onAbort = (): void => rejectOnAbort(abortError);
    abortController.signal.addEventListener('abort', onAbort, { once: true });

    const context: PlayerInitializationContext = {
      signal: abortController.signal,
      addCleanup: (cleanup) => {
        if (abortController.signal.aborted || this.state === 'destroyed') {
          cleanup();
        } else {
          this.initializationCleanups.add(cleanup);
        }
      },
    };

    try {
      await Promise.race([this.initializationOperation(context), aborted]);
      if (this.getState() === 'destroyed') {
        throw abortError;
      }
      this.state = 'ready';
    } catch (error) {
      const cleanupErrors = this.runInitializationCleanups();
      if (this.getState() !== 'destroyed') {
        this.state = 'error';
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'Initialization failed and cleanup also failed.',
        );
      }
      throw error;
    } finally {
      abortController.signal.removeEventListener('abort', onAbort);
      if (this.initializationAbortController === abortController) {
        this.initializationAbortController = null;
      }
    }
  }

  private runInitializationCleanups(): unknown[] {
    const cleanups = [...this.initializationCleanups];
    this.initializationCleanups.clear();

    const errors: unknown[] = [];
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  async retry(): Promise<void> {
    if (this.state !== 'error') {
      throw new Error('Player is not in an error state.');
    }
    return this.runInitialization();
  }

  destroy(): void {
    if (this.getState() === 'destroyed') {
      return;
    }
    this.state = 'destroyed';
    this.initializationAbortController?.abort();
    const cleanupErrors = this.runInitializationCleanups();

    for (const event of this.listenedEvents) {
      this.mediaController.off(event, this.nativeListeners.get(event)!);
    }
    this.subscribers.clear();
    this.nativeListeners.clear();
    this.listenedEvents.clear();

    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, 'Failed to clean up player resources.');
    }
  }

  private forwardEvent(event: VideoEventName): EventListener {
    return (nativeEvent: Event) => {
      const listeners = this.subscribers.get(event);
      if (!listeners) return;

      for (const listener of listeners) {
        if (typeof listener === 'function') {
          listener(nativeEvent);
        } else {
          listener.handleEvent(nativeEvent);
        }
      }
    };
  }

  play(): Promise<void> {
    return this.mediaController.play();
  }

  pause(): void {
    this.mediaController.pause();
  }

  seek(time: number): void {
    this.mediaController.seek(time);
  }

  getCurrentTime(): number {
    return this.mediaController.getCurrentTime();
  }

  getDuration(): number {
    return this.mediaController.getDuration();
  }

  on(event: VideoEventName, callback: PlayerListener): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }

    this.subscribers.get(event)!.add(callback);

    if (!this.listenedEvents.has(event)) {
      this.listenedEvents.add(event);
      this.nativeListeners.set(event, this.forwardEvent(event));
      this.mediaController.on(event, this.nativeListeners.get(event)!);
    }
  }

  off(event: VideoEventName, callback: PlayerListener): void {
    const listeners = this.subscribers.get(event);
    if (!listeners) return;
    listeners.delete(callback);
    if (listeners.size === 0) {
      this.mediaController.off(event, this.nativeListeners.get(event)!);
      this.subscribers.delete(event);
      this.nativeListeners.delete(event);
      this.listenedEvents.delete(event);
    }
  }
}
