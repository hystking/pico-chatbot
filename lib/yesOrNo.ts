export function yesOrNo(text: string) {
  const lowerText = text.toLowerCase();

  // yes から始まってたら true

  if (lowerText.startsWith("yes")) {
    return true;
  }

  // no から始まってたら false

  if (lowerText.startsWith("no")) {
    return false;
  }

  // yes が含まれてたら true

  if (lowerText.includes("yes")) {
    return true;
  }

  // それ以外は false
  return false;
}
