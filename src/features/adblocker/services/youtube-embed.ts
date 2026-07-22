const YOUTUBE_WATCH_RE = /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/

export function isYouTubeWatchUrl(url: string): boolean {
  return YOUTUBE_WATCH_RE.test(url)
}

export function extractVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_WATCH_RE)
  return match ? match[1] : null
}

export function buildEmbedDataUrl(videoId: string): string {
  const html = `<!DOCTYPE html>
<html style="margin:0;padding:0;width:100%;height:100%;overflow:hidden">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
iframe{border:0;width:100%;height:100%;display:block}
</style>
</head>
<body>
<iframe
  src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1"
  allow="autoplay; encrypted-media; picture-in-picture"
  allowfullscreen
></iframe>
<script>
const iframe = document.querySelector('iframe');
window.addEventListener('message', (e) => {
  if (e.source !== iframe.contentWindow) return;
  try {
    const data = JSON.parse(e.data);
    if (data.info && data.info.videoData && data.info.videoData.video_id) {
      const newId = data.info.videoData.video_id;
      const current = new URL(iframe.src);
      if (current.searchParams.get('v') !== newId) {
        current.searchParams.set('v', newId);
        iframe.src = current.toString();
      }
    }
  } catch {}
});
window.__youtubeEmbedded = true;
</script>
</body>
</html>`
  return `data:text/html;base64,${Buffer.from(html, 'utf-8').toString('base64')}`
}
