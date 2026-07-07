import fs from 'node:fs';

const sitemapNamespace = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

function normalizeXmlFile(path, rootTag) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing expected sitemap file: ${path}`);
  }

  let xml = fs.readFileSync(path, 'utf8').trim();

  if (!xml.startsWith('<?xml')) {
    xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  }

  xml = xml.replace(
    new RegExp(`<${rootTag}(?![^>]*xmlns=)([^>]*)>`, 'i'),
    `<${rootTag} ${sitemapNamespace}$1>`
  );

  fs.writeFileSync(path, `${xml}\n`, 'utf8');
}

normalizeXmlFile('dist/sitemap-index.xml', 'sitemapindex');
normalizeXmlFile('dist/sitemap-0.xml', 'urlset');

console.log('Sitemap XML normalized.');
