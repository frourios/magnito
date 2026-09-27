import { expect, test } from 'vitest';
import {
  MANAGED_LOGIN_LANGUAGE_COOKIE,
  managedLoginError,
  managedLoginLanguageCookie,
  managedLoginText,
  resolveManagedLoginLanguage,
} from '../src/components/ManagedLogin/locale';

test('Managed Login language query overrides the saved preference and defaults to English', () => {
  const saved = `${MANAGED_LOGIN_LANGUAGE_COOKIE}=ja`;
  expect(resolveManagedLoginLanguage('', '')).toBe('en');
  expect(resolveManagedLoginLanguage('', saved)).toBe('ja');
  expect(resolveManagedLoginLanguage('?lang=en', saved)).toBe('en');
  expect(resolveManagedLoginLanguage('?lang=ja', '')).toBe('ja');
  expect(resolveManagedLoginLanguage('?lang=unknown', saved)).toBe('ja');
  expect(managedLoginLanguageCookie('ja', true)).toContain('Secure');
  expect(managedLoginLanguageCookie('en', false)).not.toContain('Secure');
});

test('Japanese copy covers the sign in, confirmation and recovery screens', () => {
  expect(managedLoginText.ja.titles.login).toBe('サインイン');
  expect(managedLoginText.ja.titles.confirm).toBe('アカウントの確認');
  expect(managedLoginText.ja.titles.reset).toBe('確認コードを入力');
  expect(managedLoginError('Incorrect username or password.', 'ja')).toContain('正しくありません');
  expect(
    managedLoginError('Password did not conform with policy: Password not long enough', 'ja'),
  ).toContain('条件');
  expect(managedLoginError('unknown', 'ja')).toBe('処理に失敗しました。');
  expect(managedLoginError('unknown', 'en')).toBe('unknown');
});
