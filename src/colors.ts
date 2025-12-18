const COLORS: { [key: string]: string } = {
  red: '#FF0000',
  blue: '#0000FF',
  green: '#008000',
  yellow: '#FFFF00',
};

function getColor(colorName: string): string {
  if (COLORS[colorName]) {
    return COLORS[colorName];
  } else {
    throw new Error(`Color "${colorName}" not found`);
  }
}

function getRandomColor(): string {
  const colorNames = Object.keys(COLORS);
  const randomIndex = Math.floor(Math.random() * colorNames.length);
  return COLORS[colorNames[randomIndex]];
}

function getRandomUnconstrainedColor(): string {
  const colorNumber = Math.floor(Math.random() * 16777215);
  const paddedHex = ("000000" + colorNumber.toString(16)).slice(-6);
  return `#${paddedHex}`;
}