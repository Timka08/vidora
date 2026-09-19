export default class MediaController {

    constructor(video: HTMLVideoElement) {
        this.video = video;
    }

    video: HTMLVideoElement;

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


}
