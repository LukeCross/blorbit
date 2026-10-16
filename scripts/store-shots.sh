#!/bin/zsh
# Dev helper: app store screenshots (1080x1920) from the advert's full-resolution clip frames
# (/tmp/ad/<clip>/%04d.png, from scripts/advert-capture.mjs) plus store captions (st1-st7 in
# scripts/advert/overlay.html, rendered by scripts/advert-overlays.mjs). Writes /tmp/ad/store/NN-name.png.
# Each line is: output name, frame source, caption.
set -e
cd /tmp/ad
mkdir -p store
shot() { ffmpeg -loglevel error -y -i "$2" -i "ov-$3.png" -filter_complex "[0][1]overlay" -frames:v 1 "store/$1.png"; echo "store/$1.png"; }
shot 01-restore  hero/0038.png  st1
shot 02-dead     a/0020.png    st2
shot 03-shop     pack/0008.png st3
shot 04-packs    pack/0137.png st4
shot 05-book     book/0083.png st5
shot 06-skins    skins/0105.png st6
shot 07-galaxies b/0060.png    st7
cp ov-end.png store/08-end.png; echo store/08-end.png  # the video end card, as is
