import MediaController from './core/MediaController.js';

const videoElement = document.querySelector('video');

if (!(videoElement instanceof HTMLVideoElement)) {
  throw new Error('Video element not found');
}

const mediaController = new MediaController(videoElement);

videoElement.muted = true;
videoElement.playsInline = true;
videoElement.controls = true;

videoElement.addEventListener('loadeddata', () => {
  console.log('Video loaded');
  void mediaController.play().catch(() => {
    console.warn('Autoplay is blocked by the browser, but the video is ready.');
  });
});

console.log('Current Time:', mediaController.getCurrentTime());
console.log('Duration:', mediaController.getDuration());
console.log('Volume:', mediaController.getVolume());
console.log('Playback Rate:', mediaController.getPlaybackRate());
mediaController.setVolume(0.5);
mediaController.setPlaybackRate(1.5);
mediaController.mute();
console.log('Volume after mute:', mediaController.getVolume());
