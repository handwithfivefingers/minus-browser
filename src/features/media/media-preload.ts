import { contextBridge, ipcRenderer, webFrame } from 'electron'

contextBridge.exposeInMainWorld('__mediaAPI', {
  mediaStateChanged: (data: { isUsingCamera: boolean; isUsingMicrophone: boolean; isUsingScreenShare: boolean }) => {
    ipcRenderer.send('MEDIA_STATE_CHANGED', data)
  },
})

webFrame.executeJavaScript(`
  (function() {
    if (window.__mediaTrackingInjected) return;
    window.__mediaTrackingInjected = true;

    const api = window.__mediaAPI;
    if (!api) return;

    const activeTracks = {
      video: new Set(),
      audio: new Set(),
      display: new Set(),
    };

    function notify() {
      api.mediaStateChanged({
        isUsingCamera: activeTracks.video.size > 0,
        isUsingMicrophone: activeTracks.audio.size > 0,
        isUsingScreenShare: activeTracks.display.size > 0,
      });
    }

    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function(constraints) {
      const stream = await originalGetUserMedia(constraints);

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        activeTracks.video.add(videoTrack);
        notify();
        const onEnded = () => {
          activeTracks.video.delete(videoTrack);
          videoTrack.removeEventListener('ended', onEnded);
          notify();
        };
        videoTrack.addEventListener('ended', onEnded);
      }

      if (audioTrack) {
        activeTracks.audio.add(audioTrack);
        notify();
        const onEnded = () => {
          activeTracks.audio.delete(audioTrack);
          audioTrack.removeEventListener('ended', onEnded);
          notify();
        };
        audioTrack.addEventListener('ended', onEnded);
      }

      return stream;
    };

    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = async function(constraints) {
      const stream = await originalGetDisplayMedia(constraints);

      const track = stream.getVideoTracks()[0] || stream.getAudioTracks()[0];
      if (track) {
        activeTracks.display.add(track);
        notify();
        const onEnded = () => {
          activeTracks.display.delete(track);
          track.removeEventListener('ended', onEnded);
          notify();
        };
        track.addEventListener('ended', onEnded);
      }

      return stream;
    };
  })();
`)
