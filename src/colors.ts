const COLORS: { [key: string]: string } = {
  red: '#FF0000',
  blue: '#0000FF',
  green: '#008000',
  yellow: '#FFFF00',
  black: '#000000',
  white: '#FFFFFF'
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
  const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  return randomColor;
}