/**
 * useTTSText 用の極小テンプレートエンジン。
 *
 * 構文:
 *   {name}                     - context[name] を文字列化して挿入 (null/undefined/false は空文字)
 *   {#if name}...{/if}         - context[name] が truthy ならブロックを展開
 *   {#if name}...{:else}...{/if}
 *
 * 反復は意図的に未サポート。配列はテンプレート利用側で文字列に組み立ててから渡す。
 *
 * トークン書式は識別子のみで、空白や記号を含めない (`{nextStationJa}` は OK、`{ next }` は不可)。
 * これにより SSML 内の `<break time="200ms"/>` のような波括弧を含まない記号列との衝突を回避する。
 */

export type TemplateContext = Record<
  string,
  string | number | boolean | null | undefined
>;

export type TemplateRenderer = (ctx: TemplateContext) => string;

type IfNode = {
  kind: 'if';
  cond: string;
  consequent: Node[];
  alternate: Node[] | null;
};
type Node =
  | { kind: 'text'; text: string }
  | { kind: 'var'; name: string }
  | IfNode;

type Frame = { children: Node[]; ifNode?: IfNode };

const TAG_RE = /\{(?:#if (\w+)|:else|\/if|(\w+))\}/g;

const isTruthy = (v: unknown): boolean =>
  !(v === null || v === undefined || v === false || v === '' || v === 0);

const parse = (template: string): Node[] => {
  const root: Node[] = [];
  const stack: Frame[] = [{ children: root }];
  let lastIndex = 0;

  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null = TAG_RE.exec(template);
  while (m !== null) {
    const top = stack[stack.length - 1];
    if (!top) throw new Error('Template parser stack underflow');

    if (m.index > lastIndex) {
      top.children.push({
        kind: 'text',
        text: template.slice(lastIndex, m.index),
      });
    }

    const ifName = m[1];
    const varName = m[2];
    const tag = m[0];

    if (ifName) {
      const node: IfNode = {
        kind: 'if',
        cond: ifName,
        consequent: [],
        alternate: null,
      };
      top.children.push(node);
      stack.push({ children: node.consequent, ifNode: node });
    } else if (tag === '{:else}') {
      const ifNode = top.ifNode;
      if (!ifNode) {
        throw new Error('{:else} outside of {#if}');
      }
      ifNode.alternate = [];
      stack[stack.length - 1] = { children: ifNode.alternate, ifNode };
    } else if (tag === '{/if}') {
      if (stack.length <= 1) {
        throw new Error('{/if} without matching {#if}');
      }
      stack.pop();
    } else if (varName) {
      top.children.push({ kind: 'var', name: varName });
    }

    lastIndex = TAG_RE.lastIndex;
    m = TAG_RE.exec(template);
  }

  if (lastIndex < template.length) {
    const top = stack[stack.length - 1];
    if (!top) throw new Error('Template parser stack underflow');
    top.children.push({ kind: 'text', text: template.slice(lastIndex) });
  }

  if (stack.length > 1) {
    throw new Error('Unclosed {#if} block');
  }

  return root;
};

const renderNodes = (nodes: Node[], ctx: TemplateContext): string => {
  let out = '';
  for (const node of nodes) {
    if (node.kind === 'text') {
      out += node.text;
    } else if (node.kind === 'var') {
      const v = ctx[node.name];
      if (v !== null && v !== undefined && v !== false) {
        out += String(v);
      }
    } else {
      const branch = isTruthy(ctx[node.cond])
        ? node.consequent
        : node.alternate;
      if (branch) out += renderNodes(branch, ctx);
    }
  }
  return out;
};

/** テンプレート文字列をコンパイルし、context を受け取って文字列を返す関数を返す。 */
export const compile = (template: string): TemplateRenderer => {
  const ast = parse(template);
  return (ctx) => renderNodes(ast, ctx);
};
