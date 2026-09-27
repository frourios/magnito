'use client';

/* oxlint-disable complexity, max-depth, max-lines */

import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { ManagedLoginConfig } from '../../../server/domain/userPool/service/managedLoginConfig';
import {
  isManagedLoginLanguage,
  managedLoginError,
  managedLoginLanguageCookie,
  managedLoginText,
  resolveManagedLoginLanguage,
  type ManagedLoginLanguage,
  type ManagedLoginNotice,
} from './locale';
import styles from './ManagedLogin.module.css';

type Mode = 'login' | 'signup' | 'confirm' | 'forgot' | 'reset';
type Authorization = {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  code_challenge: string;
  code_challenge_method?: string;
};

const color = (value: string | undefined, fallback: string): string => {
  if (!value || !/^[0-9a-fA-F]{8}$/.test(value)) return fallback;
  return `#${value.slice(0, 6)}`;
};

const formStyle = (config: ManagedLoginConfig): CSSProperties => {
  const settings = config.settings;
  const dark = settings.categories.global.colorSchemeMode === 'DARK';
  const mode = dark ? 'darkMode' : 'lightMode';
  const form = settings.components.form[mode];
  const page = settings.components.pageBackground[mode];
  const text = settings.components.pageText[mode];
  const button = settings.components.primaryButton[mode].defaults;
  const link = settings.componentClasses.link[mode].defaults;
  return {
    '--ml-page': color(page.color, '#f5f7fb'),
    '--ml-form': color(form.backgroundColor, '#ffffff'),
    '--ml-border': color(form.borderColor, '#d6dce5'),
    '--ml-heading': color(text.headingColor, '#172033'),
    '--ml-text': color(text.bodyColor, '#3e4c61'),
    '--ml-primary': color(button.backgroundColor, '#0972d3'),
    '--ml-primary-text': color(button.textColor, '#ffffff'),
    '--ml-link': color(link.textColor, '#0972d3'),
    '--ml-radius': `${settings.components.form.borderRadius}px`,
  } as CSSProperties;
};

export function ManagedLogin({
  initialMode = 'login',
}: {
  initialMode?: Mode;
}): React.ReactElement {
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [config, setConfig] = useState<ManagedLoginConfig | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState<ManagedLoginNotice | null>(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<ManagedLoginLanguage>('en');
  const t = managedLoginText[language];

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const resolvedLanguage = resolveManagedLoginLanguage(location.search, document.cookie);
    setLanguage(resolvedLanguage);
    document.documentElement.lang = resolvedLanguage;
    if (isManagedLoginLanguage(query.get('lang'))) {
      document.cookie = managedLoginLanguageCookie(
        resolvedLanguage,
        location.protocol === 'https:',
      );
    }
    setUsername(query.get('login_hint') ?? query.get('username') ?? '');
    const params = {
      client_id: query.get('client_id') ?? '',
      redirect_uri: query.get('redirect_uri') ?? '',
      scope: query.get('scope') ?? '',
      state: query.get('state') ?? '',
      code_challenge: query.get('code_challenge') ?? '',
      code_challenge_method: query.get('code_challenge_method') || undefined,
    };
    if (!params.client_id || !params.redirect_uri || query.get('response_type') !== 'code') {
      setError(
        initialMode === 'confirm' || initialMode === 'reset'
          ? 'Invalid CSRF token.'
          : 'Invalid authorization request.',
      );
      return;
    }
    setAuthorization(params);
    const configUrl = new URL('/oauth2/managed', location.origin);
    configUrl.searchParams.set('client_id', params.client_id);
    configUrl.searchParams.set('redirect_uri', params.redirect_uri);
    configUrl.searchParams.set('scope', params.scope);
    configUrl.searchParams.set('state', params.state);
    configUrl.searchParams.set('code_challenge', params.code_challenge);
    configUrl.searchParams.set('code_challenge_method', params.code_challenge_method ?? '');
    configUrl.searchParams.set('page', initialMode);
    fetch(configUrl)
      .then(async (response) => {
        const result = (await response.json()) as ManagedLoginConfig & {
          csrfToken?: string;
          username?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error ?? 'Invalid authorization request.');
        setCsrfToken(result.csrfToken ?? '');
        if (result.username) setUsername(result.username);
        setConfig(result);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load sign in.'),
      );
  }, [initialMode]);

  const changeMode = (next: Mode): void => {
    setMode(next);
    setError('');
    setMessage(null);
    setPassword('');
    setCode('');
  };

  const changeLanguage = (next: ManagedLoginLanguage): void => {
    setLanguage(next);
    document.documentElement.lang = next;
    document.cookie = managedLoginLanguageCookie(next, location.protocol === 'https:');
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    history.replaceState(history.state, '', url);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!authorization || !csrfToken) {
      setError('Invalid CSRF token.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage(null);
    try {
      const response = await fetch('/oauth2/managed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
        body: JSON.stringify({
          ...authorization,
          action: mode,
          username,
          email,
          password,
          code,
        }),
      });
      const result = (await response.json()) as { error?: string; redirect?: string; next?: Mode };
      if (!response.ok) throw new Error(result.error ?? 'Request failed.');
      if (result.redirect) {
        location.assign(result.redirect);
        return;
      }
      if (result.next) changeMode(result.next);
      setMessage(mode === 'signup' ? 'codeSent' : mode === 'forgot' ? 'resetCodeSent' : 'success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const socialUrl = (provider: string): string => {
    const url = new URL('/oauth2/authorize', location.origin);
    new URLSearchParams(location.search).forEach((value, key) => url.searchParams.set(key, value));
    url.searchParams.set('identity_provider', provider);
    return url.toString();
  };

  const formLogo =
    config?.settings.categories.form.displayGraphics && config.settings.components.form.logo.enabled
      ? config.assets.find((asset) => asset.category === 'FORM_LOGO')
      : undefined;
  const background = config?.settings.components.pageBackground.image.enabled
    ? config.assets.find((asset) => asset.category === 'PAGE_BACKGROUND')
    : undefined;
  return (
    <main
      className={styles.page}
      style={
        config
          ? {
              ...formStyle(config),
              ...(background ? { backgroundImage: `url(${background.url})` } : {}),
            }
          : undefined
      }
    >
      <section className={styles.card} aria-labelledby="managed-login-title">
        <div className={styles.languageSwitch} role="group" aria-label="Language / 言語">
          <button
            type="button"
            aria-pressed={language === 'en'}
            onClick={() => changeLanguage('en')}
          >
            English
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            aria-pressed={language === 'ja'}
            onClick={() => changeLanguage('ja')}
          >
            日本語
          </button>
        </div>
        {config ? (
          <>
            {formLogo && <img className={styles.logo} src={formLogo.url} alt={config.poolName} />}
            <div className={styles.eyebrow}>{config.poolName}</div>
            <h1 id="managed-login-title">{t.titles[mode]}</h1>
            <p className={styles.description}>{t.descriptions[mode]}</p>
            {error && (
              <div className={styles.alert} role="alert">
                {managedLoginError(error, language)}
              </div>
            )}
            {message && (
              <div className={styles.notice} role="status">
                {t[message]}
              </div>
            )}
            {mode === 'login' && config.providers.length > 0 && (
              <div className={styles.providers}>
                {config.providers.map((provider) => (
                  <a className={styles.provider} key={provider} href={socialUrl(provider)}>
                    {language === 'ja'
                      ? `${provider}${t.continueWith}`
                      : `${t.continueWith} ${provider}`}
                  </a>
                ))}
              </div>
            )}
            {config.allowPassword && (
              <>
                {mode === 'login' && config.providers.length > 0 && (
                  <div className={styles.divider}>{t.or}</div>
                )}
                <form onSubmit={submit}>
                  <label className={styles.field}>
                    <span>{t.username}</span>
                    <input
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </label>
                  {mode === 'signup' && (
                    <label className={styles.field}>
                      <span>{t.email}</span>
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </label>
                  )}
                  {(mode === 'confirm' || mode === 'reset') && (
                    <label className={styles.field}>
                      <span>{t.confirmationCode}</span>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                      />
                    </label>
                  )}
                  {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
                    <label className={styles.field}>
                      <span>{mode === 'reset' ? t.newPassword : t.password}</span>
                      <input
                        type="password"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </label>
                  )}
                  <button className={styles.primary} disabled={loading} type="submit">
                    {loading
                      ? t.wait
                      : mode === 'login'
                        ? t.signIn
                        : mode === 'signup'
                          ? t.createAccount
                          : mode === 'forgot'
                            ? t.sendCode
                            : mode === 'reset'
                              ? t.setNewPassword
                              : t.confirmAccount}
                  </button>
                </form>
                {mode === 'login' && (
                  <div className={styles.actions}>
                    <button onClick={() => changeMode('forgot')}>{t.forgotPassword}</button>
                    {config.allowSignUp && (
                      <button onClick={() => changeMode('signup')}>{t.createAccount}</button>
                    )}
                  </div>
                )}
                {mode === 'confirm' && (
                  <button
                    className={styles.textButton}
                    onClick={async () => {
                      if (!authorization || !csrfToken) {
                        setError('Invalid CSRF token.');
                        return;
                      }
                      const response = await fetch('/oauth2/managed', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
                        body: JSON.stringify({ ...authorization, action: 'resend', username }),
                      });
                      if (response.ok) setMessage('newCodeSent');
                      else setError('Unable to resend code.');
                    }}
                  >
                    {t.resendCode}
                  </button>
                )}
                {mode !== 'login' && (
                  <button className={styles.back} onClick={() => changeMode('login')}>
                    {t.backToSignIn}
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          <div role={error ? 'alert' : 'status'}>
            {error && <h1 id="managed-login-title">{t.somethingWentWrong}</h1>}
            <p className={styles.description}>
              {error ? managedLoginError(error, language) : t.loading}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
