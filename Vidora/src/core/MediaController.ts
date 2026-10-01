export default class MediaController {
    private readonly video: HTMLVideoElement;

    constructor(video: HTMLVideoElement) {
        this.video = video;
    }

    play(): Promise<void> {
        return this.video.play();
    }

    pause(): void {
        this.video.pause();
    }

    getCurrentTime(): number {
        return this.video.currentTime;
    }

    getDuration(): number {
        return this.video.duration;
    }

    seek(time: number): void {
        this.video.currentTime = time;
    }

    getVolume(): number {
        return this.video.volume;
    }

    setVolume(volume: number): void {
        this.video.volume = volume;
    }

    mute(): void {
        this.video.muted = true;
    }

    getPlaybackRate(): number {
        return this.video.playbackRate;
    }

    setPlaybackRate(rate: number): void {
        this.video.playbackRate = rate;
    }

    on(event: string, callback: EventListenerOrEventListenerObject): void {
        this.video.addEventListener(event, callback);
    }
}

