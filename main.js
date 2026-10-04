import { Hono } from 'https://deno.land/x/hono@v4.3.11/mod.ts';
import { cors } from 'https://deno.land/x/hono@v4.3.11/middleware.ts';
import {
  timing,
  startTime,
  endTime,
} from 'https://deno.land/x/hono@v4.3.11/middleware.ts';

import { isValidCode, LanguageType, languageList } from './languages.js';
import { fetchTranslationData, getAudio } from './scraper.js';

const app = new Hono();

app.use(
  '*',
  cors({
    allowMethods: ['GET'],
  }),
  timing({
    totalDescription: false,
  }),
);

app.get('/', (c) => {
  const routes = app.routes.reduce((acc, route) => {
    if (route.path.startsWith('/api')) {
      acc.push(`${route.path}`);
    }
    return acc;
  }, []);
  return c.json({ routes });
});

app.use('*', async (c, next) => {
  await next();
  c.header(
    'cache-control',
    c.res.status === 200 ? 'public, max-age=604800' : 'no-cache',
  ); // 1 week
});

app.get('/api/v1/audio/:lang/:query', async (c) => {
  const { lang, query } = c.req.param();
  if (!isValidCode(lang, LanguageType.TARGET)) {
    return c.json({ error: 'Invalid target language' }, 400);
  }

  try {
    startTime(c, 'audio');
    const audio = await getAudio(lang, query);
    endTime(c, 'audio');
    if (!audio) {
      return c.json(
        { error: 'An error occurred while retrieving the audio' },
        500,
      );
    }
    return c.json({ audio });
  } catch (error) {
    return c.json({ error: error?.message || 'Failed to retrieve audio' }, 500);
  }
});

app.get('/api/v1/:source/:target/:query', async (c) => {
  const { source = 'auto', target, query } = c.req.param();

  if (!isValidCode(source, LanguageType.SOURCE)) {
    return c.json({ error: 'Invalid source language' }, 400);
  }
  if (!isValidCode(target, LanguageType.TARGET)) {
    return c.json({ error: 'Invalid target language' }, 400);
  }

  try {
    startTime(c, 'translation');
    const { translation, info } = await fetchTranslationData(source, target, query);
    endTime(c, 'translation');

    if (!translation) {
      return c.json(
        { error: 'An error occurred while retrieving the translation' },
        500,
      );
    }

    return c.json({ translation, info });
  } catch (error) {
    return c.json({ error: error?.message || 'Translation failed' }, 500);
  }
});

app.get('/api/v1/languages/:type?', (c) => {
  const { type } = c.req.param();
  if (type && type !== LanguageType.SOURCE && type !== LanguageType.TARGET) {
    return c.json({ error: "Type should be 'source', 'target' or empty" }, 400);
  }

  const langEntries = Object.entries(languageList[type ?? 'all']);
  const languages = langEntries.map(([code, name]) => ({ code, name }));

  return c.json({ languages });
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

const port = Number(Deno.env.get('PORT')) || 8000;
Deno.serve({ port }, app.fetch);
