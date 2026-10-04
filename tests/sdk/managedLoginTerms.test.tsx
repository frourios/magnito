import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ManagedLoginTerms } from '../../src/components/ManagedLogin/ManagedLogin';

const terms = {
  termsOfUse: {
    'cognito:default': 'https://example.test/terms',
    'cognito:japanese': 'https://example.test/ja/terms',
  },
  privacyPolicy: { 'cognito:default': 'https://example.test/privacy' },
};

test('managed signup links use localized URL with default fallback', () => {
  const japanese = renderToStaticMarkup(<ManagedLoginTerms terms={terms} language="ja" />);
  expect(japanese).toContain('https://example.test/ja/terms');
  expect(japanese).toContain('https://example.test/privacy');
  expect(japanese).toContain('利用規約');
  const english = renderToStaticMarkup(<ManagedLoginTerms terms={terms} language="en" />);
  expect(english).toContain('https://example.test/terms');
  expect(english).toContain('Terms of use');
  expect(
    renderToStaticMarkup(
      <ManagedLoginTerms terms={{ ...terms, privacyPolicy: {} }} language="ja" />,
    ),
  ).toBe('');
});
