import { http, type RequestHandler } from 'msw';
import * as route_ztntfp from '../src/app/route';
import * as route_1l9bsp from '../src/app/[userPoolId]/.well-known/jwks.json/route';
import * as route_1vt2ad4 from '../src/app/logout/route';
import * as route_ifpnvn from '../src/app/oauth2/token/route';
import * as route_16atxom from '../src/app/privateApi/me/route';
import * as route_5i3cig from '../src/app/publicApi/defaults/route';
import * as route_1hgkt2c from '../src/app/publicApi/health/route';
import * as route_1j9vdnu from '../src/app/publicApi/session/route';
import * as route_2er65n from '../src/app/publicApi/socialUsers/route';

export const patchDuplicateCookie = (req: Request): Request => {
  const cookie = req.headers.get('cookie');

  if (cookie) {
    const unique = [...new Set(cookie.split(/,\s*/).flatMap((s) => s.split('; ')))];
    req.headers.set('cookie', unique.join('; '));
  }

  return req;
};

export function setupMswHandlers(option?: { baseURL: string }): RequestHandler[] {
  const baseURL = option?.baseURL.replace(/\/$/, '') ?? '';

  return [
    http.get(`${baseURL}`, ({ request }) => {
      return route_ztntfp.GET(patchDuplicateCookie(request));
    }),
    http.post(`${baseURL}`, ({ request }) => {
      return route_ztntfp.POST(patchDuplicateCookie(request));
    }),
    http.get(`${baseURL}/:userPoolId/.well-known/jwks.json`, ({ request }) => {
      const pathChunks = request.url.replace(baseURL || /https?:\/\/[^/]+/, '').split('/');
      const params = { 'userPoolId': `${pathChunks[1]}` };

      return route_1l9bsp.GET(patchDuplicateCookie(request), { params: Promise.resolve(params) });
    }),
    http.get(`${baseURL}/logout`, ({ request }) => {
      return route_1vt2ad4.GET(patchDuplicateCookie(request));
    }),
    http.post(`${baseURL}/oauth2/token`, ({ request }) => {
      return route_ifpnvn.POST(patchDuplicateCookie(request));
    }),
    http.get(`${baseURL}/privateApi/me`, ({ request }) => {
      return route_16atxom.GET(patchDuplicateCookie(request));
    }),
    http.get(`${baseURL}/publicApi/defaults`, ({ request }) => {
      return route_5i3cig.GET(patchDuplicateCookie(request));
    }),
    http.get(`${baseURL}/publicApi/health`, ({ request }) => {
      return route_1hgkt2c.GET(patchDuplicateCookie(request));
    }),
    http.post(`${baseURL}/publicApi/session`, ({ request }) => {
      return route_1j9vdnu.POST(patchDuplicateCookie(request));
    }),
    http.delete(`${baseURL}/publicApi/session`, ({ request }) => {
      return route_1j9vdnu.DELETE(patchDuplicateCookie(request));
    }),
    http.get(`${baseURL}/publicApi/socialUsers`, ({ request }) => {
      return route_2er65n.GET(patchDuplicateCookie(request));
    }),
    http.post(`${baseURL}/publicApi/socialUsers`, ({ request }) => {
      return route_2er65n.POST(patchDuplicateCookie(request));
    }),
    http.patch(`${baseURL}/publicApi/socialUsers`, ({ request }) => {
      return route_2er65n.PATCH(patchDuplicateCookie(request));
    }),
  ];
}

export function patchFilePrototype(): void {
  File.prototype.arrayBuffer ??= function (): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };

  File.prototype.bytes ??= function (): Promise<Uint8Array<ArrayBuffer>> {
    return new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };

  File.prototype.stream ??= function (): ReadableStream<Uint8Array<ArrayBuffer>> {
    return new ReadableStream({
      start: (controller): void => {
        const reader = new FileReader();

        reader.onload = (): void => {
          const arrayBuffer = reader.result as ArrayBuffer;
          controller.enqueue(new Uint8Array(arrayBuffer));
          controller.close();
        };
        reader.onerror = (): void => {
          controller.error(reader.error);
        };
        reader.readAsArrayBuffer(this);
      },
    });
  };

  File.prototype.text ??= function (): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(this);
    });
  };
}
