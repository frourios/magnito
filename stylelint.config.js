// import type { Config } from 'stylelint';
// cannot use ts : https://github.com/stylelint/stylelint/issues/9558

export default {
  extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
  // add your custom config here
  // https://stylelint.io/user-guide/configuration
  rules: {
    'selector-class-pattern': '^[a-z][a-zA-Z0-9]+$',
  },
}; // satisfies Config;
