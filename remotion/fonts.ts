import {continueRender, delayRender} from 'remotion';

let loaded = false;

export const loadFonts = (serverBase: string) => {
  if (loaded || typeof document === 'undefined') {
    return;
  }
  loaded = true;
  const handle = delayRender('Loading fonts');
  const defs: Array<[string, string, {weight?: string; style?: string}]> = [
    ['Cormorant Garamond', 'cormorant-500.woff2', {weight: '500'}],
    ['Cormorant Garamond', 'cormorant-italic.woff2', {weight: '400', style: 'italic'}],
    ['Marcellus', 'marcellus.woff2', {weight: '400'}],
    ['Montserrat', 'montserrat-300.woff2', {weight: '300'}],
    ['Montserrat', 'montserrat-600.woff2', {weight: '600'}],
    ['Oswald', 'oswald-400.woff2', {weight: '400'}],
  ];
  Promise.all(
    defs.map(([family, file, opts]) => {
      const face = new FontFace(
        family,
        `url(${serverBase}/assets/fonts/${file}) format('woff2')`,
        opts
      );
      return face.load().then((f) => {
        document.fonts.add(f);
      });
    })
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Font loading failed', err);
      continueRender(handle);
    });
};
