import MediaController from './MediaController.js';

export const EVENTS = {
  loadedmetadata: 'loadedmetadata',
  play: 'play',
  pause: 'pause',
  timeupdate: 'timeupdate',
  ended: 'ended',
} as const;

export type VideoEventName = keyof typeof EVENTS;

type PlayerListener = EventListenerOrEventListenerObject;

export default class Player {
  private readonly mediaController: MediaController;
  private readonly subscribers = new Map<VideoEventName, Set<PlayerListener>>();
  private readonly listenedEvents = new Set<VideoEventName>();
  private readonly nativeListeners = new Map<VideoEventName, EventListener>();

  constructor(mediaController: MediaController) {
    this.mediaController = mediaController;
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

  destroy(): void {
    for (const event of this.listenedEvents) {
      this.mediaController.off(event, this.nativeListeners.get(event)!);
    }
    this.subscribers.clear();
    this.nativeListeners.clear();
    this.listenedEvents.clear();
  }
}
