import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const message =
  'Use AnimatedTypography from src/components/AnimatedTypography instead of Animated.Text.';

export function checkAnimatedText(source, filename = 'component.tsx') {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  // Bind local symbols without resolving dependencies, so shadowed names are not reported.
  const program = ts.createProgram(
    [filename],
    { noLib: true, noResolve: true },
    {
      getSourceFile: (name) => (name === filename ? file : undefined),
      getDefaultLibFileName: () => '',
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      fileExists: (name) => name === filename,
      readFile: () => undefined,
      getCanonicalFileName: (name) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
    }
  );
  const checker = program.getTypeChecker();
  const bindings = new Map();
  const bind = (name, kind) =>
    bindings.set(checker.getSymbolAtLocation(name), kind);
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const module = statement.moduleSpecifier.text;
    if (module !== 'react-native' && module !== 'react-native-reanimated')
      continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name)
      bind(clause.name, module === 'react-native' ? 'native' : 'animated');
    const named = clause.namedBindings;
    if (named && ts.isNamespaceImport(named))
      bind(named.name, module === 'react-native' ? 'native' : 'reanimated');
    if (named && ts.isNamedImports(named)) {
      for (const specifier of named.elements) {
        if (specifier.isTypeOnly) continue;
        const imported = (specifier.propertyName ?? specifier.name).text;
        if (
          imported === 'Animated' ||
          (module === 'react-native-reanimated' && imported === 'default')
        )
          bind(specifier.name, 'animated');
      }
    }
  }
  const property = (node) => {
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression)
    )
      return node.argumentExpression.text;
    return undefined;
  };
  const kindOf = (node) => {
    if (ts.isIdentifier(node))
      return bindings.get(checker.getSymbolAtLocation(node));
    if (ts.isParenthesizedExpression(node)) return kindOf(node.expression);
    const key = property(node);
    if (key === 'Animated' && kindOf(node.expression) === 'native')
      return 'animated';
    if (key === 'default' && kindOf(node.expression) === 'reanimated')
      return 'animated';
    return undefined;
  };
  const violations = [];
  const report = (node) => {
    const { line, character } = file.getLineAndCharacterOfPosition(
      node.getStart(file)
    );
    violations.push({ line: line + 1, column: character + 1, message });
  };
  const visit = (node) => {
    if (property(node) === 'Text' && kindOf(node.expression) === 'animated')
      report(node);
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isObjectBindingPattern(node.name) &&
      kindOf(node.initializer) === 'animated'
    ) {
      for (const element of node.name.elements) {
        const key = element.propertyName ?? element.name;
        if (
          (ts.isIdentifier(key) || ts.isStringLiteral(key)) &&
          key.text === 'Text'
        )
          report(element);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return violations;
}

export function lintDirectory(directory) {
  const diagnostics = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '__mocks__', 'coverage'].includes(entry.name))
        diagnostics.push(...lintDirectory(path));
    } else if (
      /\.[cm]?[jt]sx?$/.test(entry.name) &&
      !/\.test\.[jt]sx?$/.test(entry.name)
    ) {
      for (const diagnostic of checkAnimatedText(
        readFileSync(path, 'utf8'),
        path
      ))
        diagnostics.push({ path, ...diagnostic });
    }
  }
  return diagnostics;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const diagnostics = lintDirectory(resolve('src'));
  for (const { path, line, column, message: text } of diagnostics)
    console.error(`${path}:${line}:${column}: ${text}`);
  if (diagnostics.length) process.exitCode = 1;
  else console.log('Animated.Text lint passed.');
}
