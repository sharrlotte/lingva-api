const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function fetchTranslationData(source, target, query) {
  const reqData = JSON.stringify([[query, source, target, true], [null]]);
  const reqBoilerplate = JSON.stringify([[["MkEWBc", reqData, null, "generic"]]]);
  const body = "f.req=" + encodeURIComponent(reqBoilerplate);

  const res = await fetch(
    "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&rt=c",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        "User-Agent": getRandomUserAgent(),
      },
      body,
    }
  );

  if (!res.ok) {
    throw new Error(`Upstream request failed with status ${res.status}`);
  }

  const text = await res.text();
  const match = text.match(/\[\["wrb\.fr".*?\]\]\n/s) || text.match(/\[\["wrb\.fr".*?\]\]/s);
  if (!match) {
    throw new Error("Unable to parse translation response from upstream");
  }

  const parsedOuter = JSON.parse(match[0]);
  const rawData = parsedOuter[0]?.[2];
  if (!rawData) {
    throw new Error("Empty translation data received");
  }

  const data = JSON.parse(rawData);

  // Extract translation segments
  const segments = data[1]?.[0]?.[0]?.[5] || [];
  let translation = "";
  if (Array.isArray(segments) && segments.length > 0) {
    translation = segments.map((s) => (Array.isArray(s) ? s[0] : s)).filter(Boolean).join("");
  }

  if (!translation && data[1]?.[0]?.[0]?.[0]) {
    translation = data[1][0][0][0];
  }

  // Extract detected language if auto
  const detectedSource = (source === "auto" ? data[2] : undefined) || undefined;

  // Extract pronunciation
  const pronunciation = {
    query: data[0]?.[0] || null,
    translation: data[1]?.[0]?.[0]?.[1] || null,
  };

  // Definitions
  let definitions = undefined;
  if (Array.isArray(data[3]?.[1]?.[0])) {
    definitions = data[3][1][0].map((item) => ({
      type: item[0],
      list: Array.isArray(item[1])
        ? item[1].map((def) => ({
            definition: def[0],
            example: def[2],
          }))
        : [],
    }));
  }

  // Examples
  let examples = undefined;
  if (Array.isArray(data[2]?.[1]?.[0])) {
    examples = data[2][1][0].map((item) => item[0]);
  }

  // Similar words
  let similar = undefined;
  if (Array.isArray(data[5]?.[0]?.[0])) {
    similar = data[5][0][0].map((item) => item[0]);
  }

  // Extra translations
  let extraTranslations = undefined;
  if (Array.isArray(data[1]?.[0]?.[1])) {
    extraTranslations = data[1][0][1].map((item) => ({
      type: item[0],
      list: Array.isArray(item[1])
        ? item[1].map((trans) => ({
            word: trans[0],
            meanings: trans[1] || [],
            frequency: trans[3] || null,
          }))
        : [],
    }));
  }

  const info = {
    ...(detectedSource ? { detectedSource } : {}),
    pronunciation,
    ...(definitions ? { definitions } : {}),
    ...(examples ? { examples } : {}),
    ...(similar ? { similar } : {}),
    ...(extraTranslations ? { extraTranslations } : {}),
  };

  return {
    translation: translation || null,
    info,
  };
}

export async function getAudio(lang, text, isSlow = false) {
  const lastSpace = text.lastIndexOf(" ", 200);
  const slicedText = text.slice(0, text.length > 200 && lastSpace !== -1 ? lastSpace : 200);
  const encodedText = encodeURIComponent(slicedText);
  const speed = isSlow ? 0.1 : 1;

  const url = `https://translate.google.com/translate_tts?tl=${lang}&q=${encodedText}&textlen=${slicedText.length}&speed=${speed}&client=tw-ob`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
    },
  });

  if (!res.ok) {
    throw new Error(`Audio fetch failed with status ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer));
}
