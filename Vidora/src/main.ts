import MediaController from './core/MediaController.js';
import Player from './core/Player.js';

const videoElement = document.querySelector('video');

if (!(videoElement instanceof HTMLVideoElement)) {
  throw new Error('Video element not found');
}

const player = new Player(new MediaController(videoElement));

const logEvent = (name: string, extra?: string | number) => {
  console.log(name, extra !== undefined ? `: ${extra}` : '');
};

let demoPauseDone = false;

player.on('loadedmetadata', () => {
  logEvent('metadata loaded');
  logEvent('duration', player.getDuration());
});

player.on('play', () => {
  logEvent('play');
});

player.on('timeupdate', () => {
  logEvent('timeupdate', player.getCurrentTime());

  if (!demoPauseDone && player.getCurrentTime() >= 2) {
    demoPauseDone = true;
    player.pause();
    logEvent('pause');

    setTimeout(() => {
      if (!videoElement.ended) {
        player.play().catch(() => {
          console.warn('Play after pause blocked');
        });
      }
    }, 500);
  }
});

player.on('pause', () => {
  logEvent('pause');
});

player.on('ended', () => {
  logEvent('ended');
});

const startPlayback = async () => {
  try {
    videoElement.muted = false;
    await player.play();
  } catch {
    console.warn('Autoplay blocked by browser until user interaction');
  }
};

videoElement.addEventListener('click', () => {
  if (videoElement.paused) {
    startPlayback();
  }
});


