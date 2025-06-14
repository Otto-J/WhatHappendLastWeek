// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'node/prefer-global/process': 'off',
    'no-console': 'off',
  },
  ignores: ['results/**/*.json', '.vscode/**/*'],
})
