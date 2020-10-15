import { JssStyle } from 'jss';

export type Theme = {
  palette: {
    error: string;
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
  };
  typography: {
    body: JssStyle;
    header: JssStyle;
  };
  spacing: (value: number, ...rest: number[]) => number[] | number;
};

const toPx = (v: number) => `${v}px`;

const spacing = (value: number, ...rest: number[]): number | number[] => {
  if (!rest || !rest.length) return value * 8;
  return [value, ...rest].map((v: number) => v * 8);
};

export const theme: Theme = {
  spacing,
  palette: {
    error: '#FF3333',
    primary: '#7733FF',
    secondary: '#FFC759',
    background: '#101119',
    surface: '#FCF7FF',
    text: '#FCF7FF',
  },
  typography: {
    body: {
      fontFamily: "'Karla', Sans-Serif",
      fontSize: toPx(spacing(2) as number),
    },
    header: {
      fontWeight: 500,
      fontFamily: "'Rubik', Sans-Serif",
    },
  },
};
