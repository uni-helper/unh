// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
    ignores: ['playground', '**/tmp-pages-test/**'],
    rules: {
      'ts/explicit-function-return-type': 'off',
      'antfu/consistent-list-newline': 'off',
      'pnpm/yaml-enforce-settings': 'off',
    },
  },
)
