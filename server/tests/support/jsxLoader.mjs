/*
 * Test-only ESM loader: lets Node import the project's .jsx files without a bundler.
 *  - resolves extensionless relative imports (./x -> ./x.js / ./x.jsx), like Vite
 *  - transforms JSX to React.createElement with a tiny Babel plugin
 *  - stubs import.meta.env (Vite-only)
 * It is NOT a replacement for `vite build`; it exists so components can be rendered
 * to static markup in an environment where the production bundler cannot run.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('node_modules/'));
const rootRequire = createRequire(new URL('../../../package.json', import.meta.url));
const babel = rootRequire('@babel/core');

function jsxPlugin({ types: t }) {
  const nameOf = (n) => {
    if (t.isJSXIdentifier(n)) return /^[a-z]/.test(n.name) ? t.stringLiteral(n.name) : t.identifier(n.name);
    if (t.isJSXMemberExpression(n)) return t.memberExpression(nameOf(n.object), t.identifier(n.property.name));
    throw new Error('unsupported JSX name');
  };
  const text = (value) => {
    const lines = value.split(/\r\n|\n|\r/);
    const out = lines.map((line, i) => {
      let l = line.replace(/\t/g, ' ');
      if (i !== 0) l = l.replace(/^[ ]+/, '');
      if (i !== lines.length - 1) l = l.replace(/[ ]+$/, '');
      return l;
    }).filter(Boolean).join(' ');
    return out ? t.stringLiteral(out) : null;
  };
  const children = (nodes) => nodes.map((c) => {
    if (t.isJSXText(c)) return text(c.value);
    if (t.isJSXExpressionContainer(c)) return t.isJSXEmptyExpression(c.expression) ? null : c.expression;
    return c; // already-transformed element call
  }).filter(Boolean);
  const attrs = (list) => {
    if (!list.length) return t.nullLiteral();
    return t.objectExpression(list.map((a) => {
      if (t.isJSXSpreadAttribute(a)) return t.spreadElement(a.argument);
      const key = a.name.name;
      let value = a.value;
      if (value === null) value = t.booleanLiteral(true);
      else if (t.isJSXExpressionContainer(value)) value = value.expression;
      else if (t.isStringLiteral(value)) value = t.stringLiteral(value.value);
      return t.objectProperty(t.stringLiteral(key), value);
    }));
  };
  const create = (type, props, kids) =>
    t.callExpression(t.memberExpression(t.identifier('__TestReact'), t.identifier('createElement')), [type, props, ...kids]);
  return {
    visitor: {
      Program: { enter(p) { p.unshiftContainer('body', t.importDeclaration([t.importDefaultSpecifier(t.identifier('__TestReact'))], t.stringLiteral('react'))); } },
      JSXElement: { exit(p) {
        const { openingElement: o, children: c } = p.node;
        p.replaceWith(create(nameOf(o.name), attrs(o.attributes), children(c)));
      } },
      JSXFragment: { exit(p) {
        p.replaceWith(create(t.memberExpression(t.identifier('__TestReact'), t.identifier('Fragment')), t.nullLiteral(), children(p.node.children)));
      } },
    },
  };
}

export async function resolve(specifier, context, next) {
  if (specifier.endsWith('hooks/useAuth') || specifier.endsWith('hooks/useAuth.js')) {
    return { url: new URL('./fakeUseAuth.js', import.meta.url).href, shortCircuit: true };
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    for (const candidate of [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]) {
      if (existsSync(candidate) && !(await import('node:fs')).statSync(candidate).isDirectory()) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }
  return next(specifier, context);
}

const ASSET = /\.(css|png|jpe?g|webp|avif|gif|svg|mp4|webm|woff2?|ttf)(\?.*)?$/i;

export async function load(url, context, next) {
  // Vite turns assets into URLs/side-effects; for tests an empty default export is enough.
  if (ASSET.test(url)) return { format: 'module', source: 'export default "";', shortCircuit: true };
  if (!url.startsWith('file:') || url.includes('/node_modules/') || !/\/src\/.*\.(jsx|js)$/.test(url)) return next(url, context);
  let source = await readFile(fileURLToPath(url), 'utf8');
  source = source.replace(/import\.meta\.env/g, '({})');
  const { code } = babel.transformSync(source, {
    filename: fileURLToPath(url), configFile: false, babelrc: false, sourceType: 'module',
    parserOpts: { plugins: ['jsx'] }, plugins: [jsxPlugin],
  });
  return { format: 'module', source: code, shortCircuit: true };
}
