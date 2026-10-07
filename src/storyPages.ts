import type { StoryStop } from './content';

// Short pages keep the complete story legible within a fixed world-space panel.
export function storyPages(text: string): string[] {
  const pages: string[] = [];
  let page = '';
  for (const word of text.split(/\s+/)) {
    if (page && page.length + word.length + 1 > 80) {
      pages.push(page);
      page = '';
    }
    page += (page ? ' ' : '') + word;
  }
  if (page) pages.push(page);
  return pages.length ? pages : [''];
}

export function informationPages(detail: StoryStop): string[] {
  return [
    ...storyPages(detail.description),
    ...(detail.story === detail.description ? [] : storyPages(detail.story)),
  ];
}
