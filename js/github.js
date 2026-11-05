// ==== GITHUB: OAuth e API compartilhados (Studio + Editor inline) ====
// O Client ID/Secret OAuth ficam apenas no servidor da Vercel (api/*);
// aqui entramos pelo mesmo fluxo de popup usado pelo Decap-style sign-in.

import { REPOSITORY, BRANCH } from './content-schema.js';

export const SITE_ORIGIN = 'https://regrowthinc.vercel.app';

export function githubHeaders(token, json = false) {
  if (!token) throw new Error('GitHub sign-in is required to publish changes.');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function githubRequest(url, token, options = {}) {
  const { allowNotFound = false, ...requestOptions } = options;
  const response = await fetch(url, { cache: 'no-store', ...requestOptions, headers: { ...githubHeaders(token, Boolean(requestOptions.body)), ...requestOptions.headers } });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 404 && allowNotFound) {
    // Recurso realmente inexistente (ex.: o esboco inline ainda nao foi
    // salvo). Erros de autenticacao/permissao chegam aqui como 401/403 e
    // caem no bloco abaixo; um 404 de acesso a repositorio privado e
    // indistinguivel de arquivo ausente, mas quem usa allowNotFound so
    // faz essa chamada DEPOIS de carregar com sucesso os arquivos base
    // do mesmo repositorio com o mesmo token — o acesso ja esta provado.
    return null;
  }
  if (!response.ok) {
    const message = payload.message || `GitHub returned HTTP ${response.status}.`;
    const fail=(text)=>{const error=new Error(text);error.status=response.status;throw error;};
    if ([401, 403, 404].includes(response.status)) {
      fail(`${message} Check that this GitHub account can access ${REPOSITORY} and has write permission.`);
    }
    if (response.status === 409 || response.status === 422) {
      fail(`${message} The file may have changed on GitHub. Your local changes are preserved; try saving again.`);
    }
    fail(message);
  }
  return payload;
}

export const isRevisionConflict=error=>error?.status===409||(error?.status===422&&/sha|already exists|reference update|revision/i.test(error.message));

export async function githubUser(token) {
  const user = await githubRequest('https://api.github.com/user', token);
  return { login: user.login, name: user.name || user.login, avatar: user.avatar_url || '' };
}

export async function githubCollaboratorPermission(token, login) {
  const result = await githubRequest(`https://api.github.com/repos/${REPOSITORY}/collaborators/${encodeURIComponent(login)}/permission`, token);
  return result?.permission || 'none';
}

export const hasWriteAccess = (permission) => ['admin', 'write'].includes(permission);

/**
 * Reusa o fluxo OAuth existente (api/auth + api/callback): abre um popup,
 * recebe "authorization:github:success:{token}" via postMessage e resolve.
 */
export function githubSignIn() {
  const popup = window.open(
    `${SITE_ORIGIN}/api/auth?provider=github&site_id=${encodeURIComponent(new URL(SITE_ORIGIN).host)}`,
    'RIWikiAuthorization',
    'popup,width=960,height=650',
  );
  if (!popup) {
    return Promise.reject(new Error('The browser blocked the sign-in popup. Allow pop-ups for regrowthinc.vercel.app and try again.'));
  }
  return new Promise((resolve, reject) => {
    const listener = async (event) => {
      if (event.origin !== SITE_ORIGIN || event.source !== popup || typeof event.data !== 'string') return;
      if (event.data === 'authorizing:github') {
        popup.postMessage(event.data, event.origin);
        return;
      }
      if (!event.data.startsWith('authorization:github:')) return;
      window.removeEventListener('message', listener);
      clearInterval(watch);
      try { popup.close(); } catch { /* ja fechado */ }
      const result = event.data.match(/^authorization:github:(success|error):(.+)$/);
      if (!result) return reject(new Error('GitHub returned an unrecognized sign-in response.'));
      const [, status, payloadText] = result;
      let payload;
      try { payload = JSON.parse(payloadText); } catch {
        return reject(new Error('GitHub returned invalid sign-in data. Please try again.'));
      }
      if (status === 'error') return reject(new Error(payload.message || 'GitHub could not sign you in.'));
      if (!payload.token || payload.provider !== 'github') return reject(new Error('GitHub did not return a usable access token.'));
      resolve(payload.token);
    };
    const watch = setInterval(() => {
      if (popup.closed) {
        clearInterval(watch);
        window.removeEventListener('message', listener);
        reject(new Error('Sign-in window was closed.'));
      }
    }, 600);
    window.addEventListener('message', listener);
  });
}

/**
 * Sobe um arquivo (conteudo base64) e, opcionalmente, apaga o anterior
 * passando o sha. Retorna o novo commit/file sha.
 */
export async function githubPutFile(path, token, content, { message, sha, branch = BRANCH } = {}) {
  const url = `https://api.github.com/repos/${REPOSITORY}/contents/${path}`;
  const body = { message, content, branch };
  if (sha) body.sha = sha;
  const result = await githubRequest(url, token, { method: 'PUT', body: JSON.stringify(body) });
  return result?.content?.sha || null;
}

export async function githubDeleteFile(path, token, sha, { message, branch = BRANCH } = {}) {
  const url = `https://api.github.com/repos/${REPOSITORY}/contents/${path}`;
  await githubRequest(url, token, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch }),
  });
}

export function githubContentsUrl(path) {
  return `https://api.github.com/repos/${REPOSITORY}/contents/${path}?ref=${BRANCH}`;
}
