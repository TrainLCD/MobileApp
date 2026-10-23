import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const message =
  'Use AnimatedTypography from src/components/AnimatedTypography instead of Animated.Text.';

export function checkAnimatedText(source, filename = 'component.tsx') {
  // TypeScript normalizes host lookups to forward slashes, including on Windows.
  const sourcePath = filename.replaceAll('\\', '/');
  const file = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  // Bind local symbols without resolving dependencies, so shadowed names are not reported.
  const program = ts.createProgram(
    [sourcePath],
    { noLib: true, noResolve: true },
    {
      getSourceFile: (name) => (name === sourcePath ? file : undefined),
      getDefaultLibFileName: () => '',
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      fileExists: (name) => name === sourcePath,
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
  const memberKind = (owner, key) => {
    if (owner === 'native' && key === 'Animated') return 'animated';
    if (owner === 'reanimated' && (key === 'default' || key === 'Animated'))
      return 'animated';
    return undefined;
  };
  const kindOf = (node, seen = new Set()) => {
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      if (!symbol || seen.has(symbol)) return undefined;
      if (bindings.has(symbol)) return bindings.get(symbol);
      const next = new Set(seen).add(symbol);
      const declaration = symbol.valueDeclaration;
      if (
        declaration &&
        ts.isVariableDeclaration(declaration) &&
        declaration.initializer
      )
        return kindOf(declaration.initializer, next);
      if (
        declaration &&
        ts.isBindingElement(declaration) &&
        !declaration.dotDotDotToken
      ) {
        const variable = declaration.parent.parent;
        const key = declaration.propertyName ?? declaration.name;
        if (
          ts.isVariableDeclaration(variable) &&
          variable.initializer &&
          (ts.isIdentifier(key) || ts.isStringLiteral(key))
        )
          return memberKind(kindOf(variable.initializer, next), key.text);
      }
      return undefined;
    }
    if (ts.isParenthesizedExpression(node))
      return kindOf(node.expression, seen);
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      !checker.getSymbolAtLocation(node.expression) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      if (node.arguments[0].text === 'react-native') return 'native';
      if (node.arguments[0].text === 'react-native-reanimated')
        return 'reanimated';
    }
    const key = property(node);
    if (key) return memberKind(kindOf(node.expression, seen), key);
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
