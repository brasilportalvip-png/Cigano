/** Divide o texto que chega em frases completas para começar a falar antes do fim (puro). */
export function takeSentences(buffer: string): { ready: string[]; rest: string } {
  const ready: string[] = [];
  const re = /[^.!?…]+[.!?…]+["')\]]?\s+/g;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(buffer))) {
    ready.push(m[0].trim());
    last = re.lastIndex;
  }
  return { ready, rest: buffer.slice(last) };
}
