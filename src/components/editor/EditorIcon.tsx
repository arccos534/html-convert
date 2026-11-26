const paths = {
  heading: 'M5 5v14M19 5v14M5 12h14',
  newspaper: 'M4 4h16v15H5a2 2 0 0 1-2-2V7m5 1h8M8 12h3m3 0h2m-8 4h3m3 0h2',
  text: 'M4 5h16M4 10h11M4 15h16M4 20h11',
  image: 'M3 4h18v16H3z M3 16l5-5 5 5 3-3 5 5M16 8h.01',
  quote: 'M4 11h6v7H4v-6c0-3 2-5 5-6m5 5h6v7h-6v-6c0-3 2-5 5-6',
  columns: 'M3 4h18v16H3z M9 4v16m6-16v16',
  cards: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  layers: 'm12 3 9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5',
  divider: 'M4 12h16',
  pointer: 'm5 3 14 9-6 1-3 6-5-16z',
  important: 'M12 3 2.5 20h19L12 3zm0 6v4m0 3h.01',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-1v5m0-8h.01',
  table: 'M3 4h18v16H3z M3 9h18m-18 5h18M9 9v11m6-11v11',
  stats: 'M3 20h18M5 16l5-5 4 3 6-8m-5 0h5v5',
  chart: 'M3 3v18h18M7 17v-5m5 5V7m5 10V4',
  left: 'M4 5h16M4 10h10M4 15h16M4 20h10',
  center: 'M4 5h16M7 10h10M4 15h16M7 20h10',
  right: 'M4 5h16m-10 5h10M4 15h16m-10 5h10',
  justify: 'M4 5h16M4 10h16M4 15h16M4 20h16',
  bullets: 'M8 5h12M8 12h12M8 19h12M4 5h.01M4 12h.01M4 19h.01',
  numbers: 'M10 6h10m-10 12h10M4 8h3M4 4l1-.5V8m-2 7c0-1 4-1 4 .5 0 1-3 2-3 4h3',
  link: 'M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.7 1.7m2.7 4a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.7-1.7',
  unlink: 'm4 4 16 16M9 14l-1 1a3.5 3.5 0 0 0 5 5l2-2m0-8 1-1a3.5 3.5 0 0 0-5-5L9 6',
  reset: 'm7 4 12 0m-6 0-5 13m-3 0h7m3 0 5 5m0-5-5 5',
  color: 'm5 16 5-12 5 12M7 12h6',
}

export type EditorIconName = keyof typeof paths

export const EditorIcon = ({ name }: { name: EditorIconName }) => (
  <svg className="editor-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>
)
