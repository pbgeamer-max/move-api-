const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
};

function unpackDeanEdwardsSafe(packedCode) {
  try {
    const match = packedCode.match(/eval\s*\(\s*(function\s*\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\(['"]\|['"]\)\s*\))\s*\)/);
    if (!match) return null;
    const unpackerCode = "return " + match[1];
    const unpacker = new Function(unpackerCode);
    const result = unpacker();
    return typeof result === "string" ? result : null;
  } catch (err) {
    return null;
  }
}

async function testUrl(pageUrl) {
  console.log('\n--- Testing:', pageUrl);
  const r1 = await fetch(pageUrl, {
    headers: { ...BROWSER_HEADERS, Referer: "https://3iskk.xyz/" },
  });
  const html1 = await r1.text();
  const formMatch = html1.match(/<form[^>]+action=["'](https:\/\/[^"']+\.php)["'][^>]*>([\s\S]*?)<\/form>/i);
  const tokenMatch = html1.match(/name=["']news["']\s+value=["']([^"']+)["']/i);
  if (!formMatch || !tokenMatch) {
    console.log('No form match on page');
    return;
  }

  const postUrl1 = formMatch[1];
  const token1 = tokenMatch[1];
  const body1 = new URLSearchParams({ news: token1, u: "", submit: "submit" });
  const r2 = await fetch(postUrl1, {
    method: "POST",
    headers: { ...BROWSER_HEADERS, "Content-Type": "application/x-www-form-urlencoded", Referer: pageUrl },
    body: body1.toString(),
  });
  const html2 = await r2.text();
  const stage2ActionMatch = html2.match(/myForm\.action\s*=\s*["']([^"']+)["']/i) || html2.match(/var\s+myUrl\s*=\s*["']([^"']+)["']/i);
  const stage2TokenMatch = html2.match(/myInput\.value\s*=\s*["']([^"']+)["']/i);
  if (!stage2ActionMatch || !stage2TokenMatch) {
    console.log('No stage2 match');
    return;
  }

  const postUrl2 = stage2ActionMatch[1];
  const token2 = stage2TokenMatch[1];
  const body2 = new URLSearchParams({ news: token2, u: "", submit: "submit" });
  const r3 = await fetch(postUrl2, {
    method: "POST",
    headers: { ...BROWSER_HEADERS, "Content-Type": "application/x-www-form-urlencoded", Referer: postUrl1 },
    body: body2.toString(),
  });
  const html3 = await r3.text();
  const iframes3 = [...html3.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
  console.log('iframes in html3:', iframes3);

  for (const ifr of iframes3) {
    const r4 = await fetch(ifr, { headers: { ...BROWSER_HEADERS, Referer: postUrl2 } });
    const html4 = await r4.text();
    const iframes4 = [...html4.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
    console.log('nested in', ifr, '->', iframes4);

    for (const nested of iframes4) {
      if (nested.includes('miravd.')) {
        const rm = await fetch(nested, { headers: { ...BROWSER_HEADERS, Referer: 'https://3iskk.xyz/' } });
        const tm = await rm.text();
        const unp = unpackDeanEdwardsSafe(tm);
        const m3u8 = unp && unp.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
        console.log('miravd m3u8:', m3u8 ? m3u8[0] : 'NONE');
      } else if (nested.includes('ukrcdn.')) {
        const ru = await fetch(nested, { headers: { ...BROWSER_HEADERS, Referer: 'https://3iskk.xyz/' } });
        const tu = await ru.text();
        const unescaped = tu.replace(/\\\//g, "/");
        const pb = unescaped.match(/https?:\/\/[^\s"'<>]+\/api\/videos\/[^\s"'<>]+\/playback[^\s"'<>]*/i);
        console.log('ukrcdn playback api:', pb ? pb[0] : 'NONE');
        if (pb) {
          const rApi = await fetch(pb[0], { headers: { Accept: "application/json", Referer: nested, "User-Agent": BROWSER_HEADERS["User-Agent"] } });
          const j = await rApi.json();
          console.log('ukrcdn direct m3u8:', j.url || 'NONE');
        }
      }
    }
  }
}

async function run() {
  await testUrl('https://3iskk.xyz/watch/movies/movie-tam-bir-centilmen-2023-mudblij/');
  await testUrl('https://3iskk.xyz/watch/episodes/serie-karagul-season-1-episode-1/');
  await testUrl('https://3iskk.xyz/watch/episodes/serie-kasaba-doktoru-mudblij-season-1-episode-1-k508w/');
}

run();
