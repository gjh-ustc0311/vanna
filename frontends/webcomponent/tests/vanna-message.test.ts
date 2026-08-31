import { describe, expect, it } from 'vitest';

import { renderSafeMarkdown } from '../src/components/vanna-message.js';

describe('renderSafeMarkdown', () => {
  it('renders Markdown while disabling raw HTML', () => {
    const rendered = renderSafeMarkdown('**safe** <script>alert(1)</script>');
    expect(rendered).toContain('<strong>safe</strong>');
    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('&lt;script&gt;');
  });

  it('removes dangerous Markdown link targets', () => {
    const rendered = renderSafeMarkdown('[open](javascript:alert(1))');
    expect(rendered).not.toContain('javascript:');
  });
});
