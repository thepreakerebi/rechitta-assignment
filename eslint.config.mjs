// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

/**
 * The semantic-markup rule is the reason this file exists. It is not a
 * preference to be remembered — it is a build failure.
 *
 * @param {string} element
 * @param {string} alternatives
 */
const bannedElement = (element, alternatives) => ({
  element,
  message: `<${element}> is banned in this project. Use a semantic element instead (${alternatives}).`,
})

export default withNuxt({
  rules: {
    'vue/no-restricted-html-elements': [
      'error',
      bannedElement(
        'div',
        'section, article, header, footer, nav, main, aside, figure, hgroup, ul/li, dl/dt/dd, p, form, fieldset',
      ),
      bannedElement(
        'span',
        'em, strong, small, b, i, mark, q, cite, abbr, data, time, output, bdi, label',
      ),
    ],
    'vue/no-v-html': 'error',
    'vue/multi-word-component-names': 'off',
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-explicit-any': 'error',
  },
})
