import { vi } from 'vitest';

type Handler = (req: Request) => unknown;

/** URL yo'li bo'yicha javob beruvchi oddiy fetch mock */
export function mockApi(routes: Record<string, Handler | unknown>) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const req = input instanceof Request ? input : new Request(input);
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, '');
    const key = `${req.method} ${path}`;
    const route = key in routes ? routes[key] : routes[path];
    if (route === undefined) return new Response('null', { status: 404 });
    const body = typeof route === 'function' ? (route as Handler)(req) : route;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
