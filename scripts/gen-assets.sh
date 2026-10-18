#!/bin/bash
# TVORA asset generation — sequential with backoff (429-safe)
cd /home/z/my-project
mkdir -p public/images public/media

gen() {
  local prompt="$1"; local out="$2"; local size="$3"
  if [ -s "$out" ]; then echo "SKIP $out"; return 0; fi
  for i in 1 2 3 4; do
    if z-ai image -p "$prompt" -o "$out" -s "$size" >/dev/null 2>&1 && [ -s "$out" ]; then
      echo "OK $out"; sleep 8; return 0
    fi
    echo "RETRY($i) $out"; sleep $((i * 20))
  done
  echo "FAIL $out"
}

P="no text, no words, no letters, no typography, no watermark, no logo, dark cinematic color grading, moody atmosphere, film still quality, dramatic lighting, deep shadows, high quality, detailed"

gen "Epic science fiction movie still, a lone astronaut in a worn silver suit standing on a dark rocky ridge overlooking a colossal alien monolith structure under a stormy dusk sky, cold icy blue rim light, volumetric fog, anamorphic widescreen, $P" public/images/hero-horizon.jpg 1344x768
gen "Football stadium at night viewed from inside the stands, dramatic floodlights cutting through light rain and mist, empty green pitch glowing, dark moody atmosphere, silver grey and deep green palette, cinematic wide shot, $P" public/images/hero-football.jpg 1344x768
gen "Movie poster artwork, film noir style rainy megacity alley at night, lone detective silhouette under a single street lamp, reflections on wet asphalt, teal and black palette, $P" public/images/poster-shadows.jpg 768x1344
gen "Movie poster artwork, vintage radio antenna tower on a fog-covered mountain at night, strange glowing light in the sky, mysterious sci-fi atmosphere, cold silver and dark blue palette, $P" public/images/poster-frequency.jpg 768x1344
gen "Series poster artwork, majestic medieval Arabian palace courtyard at night with intricate geometry and hanging lanterns, two rival family silhouettes facing each other, epic historical drama, warm amber on near-black, $P" public/images/poster-sands.jpg 768x1344
gen "Series poster artwork, Istanbul Bosphorus waterfront at night in the rain, old ferry and glowing city lights reflecting on dark water, melancholic romantic drama, deep navy and amber, $P" public/images/poster-bosphorus.jpg 768x1344
gen "Series poster artwork, grand Moorish palace arches and orange trees courtyard under moonlight, historical epic atmosphere, stone geometry, candlelight glow, dark emerald and gold on near-black, $P" public/images/poster-andalus.jpg 768x1344
gen "Series poster artwork, huge rotating orbital space station above a dark planet horizon, tiny astronaut silhouette in foreground, hard sci-fi realism, cold steel and pale cyan palette, $P" public/images/poster-station9.jpg 768x1344
gen "Movie poster artwork, Mesopotamian marshes at dusk with traditional reed house and a lone fisherman poling a canoe, mist over water, melancholic beautiful drama, muted copper and deep charcoal, $P" public/images/poster-desert.jpg 768x1344
gen "Movie poster artwork, empty futuristic train station platform at midnight, flickering fluorescent light, lone figure with suitcase at the far end, tense thriller atmosphere, sodium orange on dark grey, $P" public/images/poster-midnight.jpg 768x1344
gen "Movie poster artwork, colossal alien horizon structure glowing faintly behind storm clouds over dark ocean, tiny human figure on cliff edge, epic sci-fi awe, icy blue and black palette, $P" public/images/poster-horizon.jpg 768x1344
echo "ASSETS DONE"
