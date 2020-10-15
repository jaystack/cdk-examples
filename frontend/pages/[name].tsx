import * as React from 'react';
import { useRouter } from 'next/router';
import { createUseStyles } from 'react-jss';
import { Theme } from '../utils/theme';

const useStyles = createUseStyles(
  (theme: Theme) => ({
    root: {
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: `calc(100vh - ${theme.spacing(8)}px)`,
    },
    title: {
      ...theme.typography.header,
      textTransform: 'uppercase',
      fontSize: theme.spacing(6),
    },
  }),
  { name: 'Name' },
);

const NamePage = (): React.ReactElement => {
  const classes = useStyles();
  const router = useRouter();
  const { name } = router.query;
  return (
    <div className={classes.root}>
      <h1 className={classes.title}>👋 Hi {name} 👋</h1>
    </div>
  );
};

export default NamePage;
