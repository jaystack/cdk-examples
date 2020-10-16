import * as React from 'react';
import Router from 'next/router';
import { createUseStyles } from 'react-jss';
import { Theme } from '../utils/theme';
import { darken } from '../utils/colorManipulation';

const useStyles = createUseStyles(
  (theme: Theme) => ({
    root: {
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: `calc(100vh - ${theme.spacing(8)}px)`,
    },
    form: {
      maxWidth: theme.spacing(40),
    },
    top: {
      padding: theme.spacing(2),
      textAlign: 'center',
      textTransform: 'uppercase',
      background: theme.palette.error,
      borderTopLeftRadius: theme.spacing(1),
      borderTopRightRadius: theme.spacing(1),
    },
    bottom: {
      height: theme.spacing(2),
      background: theme.palette.error,
      borderBottomLeftRadius: theme.spacing(1),
      borderBottomRightRadius: theme.spacing(1),
    },
    hello: {
      ...theme.typography.header,
      fontSize: theme.spacing(6),
      fontWeight: 800,
      letterSpacing: 2,
    },
    subtitle: {
      ...theme.typography.header,
      fontWeight: 800,
      letterSpacing: 2,
    },
    input: {
      textAlign: 'center',
      width: '100%',
      height: theme.spacing(8),
      padding: theme.spacing(0, 2),
      border: 0,
      borderRadius: 0,
      display: 'block',
      textTransform: 'uppercase',
      outline: 0,
      ...theme.typography.header,
      fontSize: theme.spacing(4),
      '&::placeholder': {
        color: darken(theme.palette.text, 0.15),
        transition: 'opacity 250ms ease-out',
      },
      '&:focus': {
        '&::placeholder': {
          opacity: 0,
        },
      },
    },
  }),
  { name: 'Index' },
);

const IndexPage = (): React.ReactElement => {
  const classes = useStyles();
  const [name, setName] = React.useState<string>('');
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.currentTarget.value);
  };
  const handleFormSubmission = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await Router.push('/users/[name]', `/users/${name}`);
  };
  return (
    <div className={classes.root}>
      <form className={classes.form} onSubmit={handleFormSubmission}>
        <div className={classes.top}>
          <div className={classes.hello}>Hello</div>
          <div className={classes.subtitle}>my name is</div>
        </div>
        <input
          className={classes.input}
          placeholder="Type here..."
          onChange={handleChange}
          value={name}
        />
        <div className={classes.bottom} />
      </form>
    </div>
  );
};

export default IndexPage;
