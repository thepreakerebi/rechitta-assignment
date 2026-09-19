import { describe, expect, it } from 'vitest'
import { Linter } from 'eslint'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

/**
 * The "no div, no span" rule is the project's defining constraint. A convention
 * that lives only in a document gets forgotten; this test asserts the rule is
 * real by running the linter against markup that must fail.
 */

const linter = new Linter({ configType: 'flat' })

const config = [
  {
    files: ['**/*.vue'],
    plugins: { vue: vuePlugin },
    languageOptions: { parser: vueParser },
    rules: {
      'vue/no-restricted-html-elements': [
        'error',
        { element: 'div', message: 'banned' },
        { element: 'span', message: 'banned' },
      ],
    },
  },
] satisfies Linter.Config[]

const lint = (template: string) =>
  linter.verify(`<template>${template}</template>`, config, 'probe.vue')

describe('semantic markup rule', () => {
  it('rejects a div', () => {
    expect(lint('<div>no</div>')).toHaveLength(1)
  })

  it('rejects a span', () => {
    expect(lint('<p><span>no</span></p>')).toHaveLength(1)
  })

  it('rejects a div nested inside semantic markup', () => {
    expect(lint('<section><article><div>no</div></article></section>')).toHaveLength(1)
  })

  it.each([
    '<section><h2>ok</h2></section>',
    '<article><header><p>ok</p></header></article>',
    '<dl><dt>Handover</dt><dd><time datetime="2026-07">Q3 2026</time></dd></dl>',
    '<figure><img src="/a.jpg" alt="a"><figcaption>ok</figcaption></figure>',
    '<p>An <em>emphasis</em> and a <strong>weight</strong> and some <small>meta</small>.</p>',
    '<output>ok</output>',
  ])('accepts semantic markup: %s', (template) => {
    expect(lint(template)).toHaveLength(0)
  })
})
