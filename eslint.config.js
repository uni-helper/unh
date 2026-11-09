// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
    ignores: ['playground', 'src/manifest.json', 'src/pages.json'],
    rules: {
      'ts/explicit-function-return-type': 'off',
      'antfu/consistent-list-newline': 'off',
      // @antfu/eslint-config v10 从 consistent-list-newline 里拆出来的兄弟规则，一起关掉
      'antfu/reasonable-newline': 'off',
      'pnpm/yaml-enforce-settings': 'off',
    },
  },
)
