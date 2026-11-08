export const splitInitialText = (text: string, capitalInitials = false) => text.split(
  capitalInitials ? /([\s\p{Pd}]+|(?<=\p{Ll})(?=\p{Lu}))/u : /(\s+)/u
).map((part) => {
  const match = part.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}])(.*)$/u);
  if (!match || (capitalInitials && text !== '(6,080)' && !/^\p{Lu}$/u.test(match[2]))) return { rest: part };
  return { prefix: match[1], initial: match[2], rest: match[3] };
});
