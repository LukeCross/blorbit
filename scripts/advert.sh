#!/bin/zsh
# Dev helper: stitches the vertical advert from /tmp/ad/{a,pack,book,skins,b}/*.png (scripts/advert-capture.mjs) and /tmp/ad/ov-*.png
# (scripts/advert-overlays.mjs) into /tmp/ad/blorbit-advert.mp4 (1080x1920, 30fps, 20s) with the soundtrack from scripts/advert-audio.mjs (/tmp/ad/advert.wav).
set -e
cd /tmp/ad
F=30
# clip lengths in frames (trimmed from the captures), a bit of crossfade between them
ffmpeg -loglevel error -y \
  -framerate $F -i a/%04d.png -framerate $F -i pack/%04d.png -framerate $F -i book/%04d.png -framerate $F -i skins/%04d.png -framerate $F -i b/%04d.png \
  -loop 1 -framerate $F -i ov-end.png \
  -loop 1 -framerate $F -i ov-c1.png -loop 1 -framerate $F -i ov-c2.png -loop 1 -framerate $F -i ov-c3.png \
  -loop 1 -framerate $F -i ov-c4.png -loop 1 -framerate $F -i ov-c6.png -loop 1 -framerate $F -i ov-c5.png -loop 1 -framerate $F -i ov-mark.png -i advert.wav \
  -filter_complex "
  [0]trim=end=4.4,setpts=PTS-STARTPTS,fps=30,scale=1080:1920,format=yuv420p[a];
  [1]trim=end=4.6,setpts=PTS-STARTPTS,fps=30,scale=1080:1920,format=yuv420p[p];
  [2]trim=end=2.8,setpts=PTS-STARTPTS,fps=30,scale=1080:1920,format=yuv420p[k];
  [3]trim=end=5.0,setpts=PTS-STARTPTS,fps=30,scale=1080:1920,format=yuv420p[s];
  [4]trim=end=2.0,setpts=PTS-STARTPTS,fps=30,scale=1080:1920,format=yuv420p[b];
  [5]trim=end=3.0,setpts=PTS-STARTPTS,fps=30,format=yuv420p,fade=t=in:st=0:d=0.4[e];
  [a][p]xfade=transition=slideleft:duration=0.35:offset=4.05[ap];
  [ap][k]xfade=transition=slideleft:duration=0.35:offset=8.3[apk];
  [apk][s]xfade=transition=slideleft:duration=0.35:offset=10.75[apks];
  [apks][b]xfade=transition=slideleft:duration=0.35:offset=15.4[apksb];
  [apksb][e]xfade=transition=fade:duration=0.4:offset=17.0[v];
  [6]format=rgba,fade=t=in:st=0.2:d=0.3:alpha=1,fade=t=out:st=1.9:d=0.25:alpha=1[o1];
  [7]format=rgba,fade=t=in:st=2.2:d=0.3:alpha=1,fade=t=out:st=3.9:d=0.25:alpha=1[o2];
  [8]format=rgba,fade=t=in:st=4.5:d=0.3:alpha=1,fade=t=out:st=8.1:d=0.25:alpha=1[o3];
  [9]format=rgba,fade=t=in:st=8.55:d=0.3:alpha=1,fade=t=out:st=10.65:d=0.25:alpha=1[o4];
  [10]format=rgba,fade=t=in:st=11.1:d=0.3:alpha=1,fade=t=out:st=15.1:d=0.25:alpha=1[o6];
  [11]format=rgba,fade=t=in:st=15.6:d=0.25:alpha=1,fade=t=out:st=16.8:d=0.2:alpha=1[o5];
  [12]format=rgba,fade=t=in:st=0.1:d=0.3:alpha=1,fade=t=out:st=8.0:d=0.3:alpha=1[mk];
  [v][o1]overlay=shortest=0:eof_action=pass[v1];[v1][o2]overlay=eof_action=pass[v2];[v2][o3]overlay=eof_action=pass[v3];
  [v3][o4]overlay=eof_action=pass[v4];[v4][o6]overlay=eof_action=pass[v6];[v6][o5]overlay=eof_action=pass[v5];[v5][mk]overlay=eof_action=pass,trim=end=20,format=yuv420p[out]
  " -map "[out]" -map 13:a -r $F -c:v libx264 -crf 17 -preset slow -c:a aac -b:a 192k -shortest -movflags +faststart blorbit-advert.mp4
echo wrote /tmp/ad/blorbit-advert.mp4
