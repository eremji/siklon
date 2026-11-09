export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'test', 'chore', 'docs', 'refactor']],
    'subject-case': [0],
  },
};
