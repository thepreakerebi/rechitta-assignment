/**
 * The suggested prompts in the comp trail off with an ellipsis — they are the
 * opening of a question, not the whole of it. Sending "Is there a 2-bed
 * available…" verbatim would put the ellipsis in the transcript, so it is
 * trimmed to the words themselves.
 *
 * Pure, so the rule can be tested without a browser.
 */
export const spokenForm = (prompt: string): string =>
  prompt.replace(/[…]+$/u, '').replace(/\.{3,}$/u, '').trim()
