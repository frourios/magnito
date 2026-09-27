import { parseCookie, stringifySetCookie } from 'cookie';

export type ManagedLoginLanguage = 'en' | 'ja';

export const MANAGED_LOGIN_LANGUAGE_COOKIE = 'managed_login_lang';

export const isManagedLoginLanguage = (
  value: string | null | undefined,
): value is ManagedLoginLanguage => value === 'en' || value === 'ja';

export const resolveManagedLoginLanguage = (
  search: string,
  cookie: string,
): ManagedLoginLanguage => {
  const queryLanguage = new URLSearchParams(search).get('lang');
  if (isManagedLoginLanguage(queryLanguage)) return queryLanguage;
  const savedLanguage = parseCookie(cookie)[MANAGED_LOGIN_LANGUAGE_COOKIE];
  return isManagedLoginLanguage(savedLanguage) ? savedLanguage : 'en';
};

export const managedLoginLanguageCookie = (
  language: ManagedLoginLanguage,
  secure: boolean,
): string =>
  stringifySetCookie(MANAGED_LOGIN_LANGUAGE_COOKIE, language, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    secure,
  });

export const managedLoginText = {
  en: {
    titles: {
      login: 'Sign in',
      signup: 'Create an account',
      confirm: 'Confirm your account',
      forgot: 'Reset your password',
      reset: 'Enter your confirmation code',
    },
    descriptions: {
      login: 'Welcome back. Sign in to continue.',
      signup: 'Enter your details to get started.',
      confirm: 'Enter the code sent to your email address.',
      forgot: 'We will send a code to help you reset your password.',
      reset: 'Enter the code sent to your email address.',
    },
    username: 'Username',
    email: 'Email',
    password: 'Password',
    newPassword: 'New password',
    confirmationCode: 'Confirmation code',
    continueWith: 'Continue with',
    or: 'or',
    wait: 'Please wait…',
    signIn: 'Sign in',
    createAccount: 'Create account',
    sendCode: 'Send code',
    setNewPassword: 'Set new password',
    confirmAccount: 'Confirm account',
    forgotPassword: 'Forgot password?',
    resendCode: 'Resend confirmation code',
    backToSignIn: '← Back to sign in',
    codeSent: 'A confirmation code has been sent.',
    resetCodeSent: 'A reset code has been sent.',
    success: 'Your request was successful.',
    newCodeSent: 'A new code has been sent.',
    loading: 'Loading sign in…',
    somethingWentWrong: 'Something went wrong',
  },
  ja: {
    titles: {
      login: 'サインイン',
      signup: 'アカウントを作成',
      confirm: 'アカウントの確認',
      forgot: 'パスワードの再設定',
      reset: '確認コードを入力',
    },
    descriptions: {
      login: 'サインインして続行してください。',
      signup: 'アカウント情報を入力してください。',
      confirm: 'メールで届いた確認コードを入力してください。',
      forgot: 'パスワード再設定用のコードを送信します。',
      reset: 'メールで届いた確認コードを入力してください。',
    },
    username: 'ユーザー名',
    email: 'メールアドレス',
    password: 'パスワード',
    newPassword: '新しいパスワード',
    confirmationCode: '確認コード',
    continueWith: 'で続行',
    or: 'または',
    wait: '処理中…',
    signIn: 'サインイン',
    createAccount: 'アカウントを作成',
    sendCode: 'コードを送信',
    setNewPassword: '新しいパスワードを設定',
    confirmAccount: 'アカウントを確認',
    forgotPassword: 'パスワードをお忘れですか？',
    resendCode: '確認コードを再送信',
    backToSignIn: '← サインインに戻る',
    codeSent: '確認コードを送信しました。',
    resetCodeSent: '再設定用のコードを送信しました。',
    success: '処理が完了しました。',
    newCodeSent: '新しい確認コードを送信しました。',
    loading: 'サインイン画面を読み込んでいます…',
    somethingWentWrong: 'エラーが発生しました',
  },
} as const;

export type ManagedLoginNotice = 'codeSent' | 'resetCodeSent' | 'success' | 'newCodeSent';

const japaneseErrors: Record<string, string> = {
  'Invalid authorization request.': '認可リクエストが無効です。',
  'Unable to load sign in.': 'サインイン画面を読み込めませんでした。',
  'Request failed.': '処理に失敗しました。',
  'Unable to resend code.': '確認コードを再送信できませんでした。',
  'Incorrect username or password.': 'ユーザー名またはパスワードが正しくありません。',
  'User is not confirmed.': 'アカウントの確認が必要です。',
  'Unsupported authentication flow.': 'この認証方式には対応していません。',
  'Account was not found.': 'アカウントが見つかりません。',
  'Invalid verification code provided, please try again.': '確認コードが正しくありません。',
  'User already exists': 'このユーザー名は既に使用されています。',
  'Invalid CSRF token.': '認証セッションが無効です。最初からやり直してください。',
};

export const managedLoginError = (message: string, language: ManagedLoginLanguage): string => {
  if (language === 'en') return message;
  if (message.startsWith('Password did not conform with policy:')) {
    return 'パスワードが設定された条件を満たしていません。';
  }
  return japaneseErrors[message] ?? '処理に失敗しました。';
};
