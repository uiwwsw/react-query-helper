import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
for(const [path,lang]of [['','ko'],['en/','en']]){const html=await readFile(`site-dist/${path}index.html`,'utf8');assert.match(html,new RegExp(`<html lang="${lang}"`));for(const part of ['rel="canonical"','hreflang="ko"','hreflang="en"','application/ld+json','getUser','createUser','listPosts'])assert.ok(html.includes(part),part);assert.ok(!html.includes('undefined'));}
const xml=await readFile('site-dist/sitemap.xml','utf8');assert.equal((xml.match(/<loc>/g)||[]).length,2);console.log('Bilingual HTML, real generated examples and sitemap verified.');
for (const path of ['', 'en/']) { const html=await readFile(`site-dist/${path}index.html`,'utf8');assert.ok(html.indexOf('rel="stylesheet"')<html.indexOf('<body>'));assert.match(html,/rel="preload" href="\/fonts\/SUITE-Variable\.woff2"/); }
const font=await readFile('site-dist/fonts/SUITE-Variable.woff2');assert.equal(font.subarray(0,4).toString(),'wOF2');const css=await readFile('site-dist/style.css','utf8');assert.match(css,/@font-face\{font-family:SUITE/);assert.match(css,/:root\{font-family:SUITE/);assert.ok(!css.includes('fonts.googleapis.com'));
console.log('First-paint stylesheet and self-hosted SUITE verified.');

for (const path of ['', 'en/']) {
 const html = await readFile(`site-dist/${path}index.html`, 'utf8');
 assert.ok(html.includes('href="/favicon-96.png"'));
 assert.ok(html.includes('href="/assets/logo.svg"'));
}
for (const name of ['favicon-96.png', 'apple-touch-icon.png']) {
 const bytes = await readFile(`site-dist/${name}`);
 assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
}
console.log('Both locales share the branded SVG and PNG favicons.');
