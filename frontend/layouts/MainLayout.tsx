import * as React from 'react';
import { createUseStyles } from 'react-jss';
import { Theme } from '../utils/theme';
import { lighten } from '../utils/colorManipulation';

type Props = {
  children: React.ReactNode;
};

const useStyles = createUseStyles(
  (theme: Theme) => ({
    root: {
      position: 'relative',
    },
    header: {
      height: theme.spacing(8),
      padding: theme.spacing(0, 2),
      display: 'flex',
      alignItems: 'center',
      background: lighten(theme.palette.background, 0.15),
      ...theme.typography.header,
    },
  }),
  { name: 'MainLayout' },
);

function MainLayout({ children }: Props): React.ReactElement {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <div className={classes.header}>CDK Example</div>
      {children}
    </div>
  );
}

export default MainLayout;
