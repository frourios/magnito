module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
  // add your custom config here
  // https://stylelint.io/user-guide/configuration
  rules: {
    'selector-class-pattern': '^[a-z][a-zA-Z0-9]+$',
  },
};
