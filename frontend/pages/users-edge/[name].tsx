import * as React from 'react';
import { useRouter } from 'next/router';
import { createUseStyles } from 'react-jss';
import { Theme } from '../../utils/theme';
import Axios from 'axios';
import { GetServerSidePropsResult, NextPageContext } from 'next';

type Props = {
  content: string;
};

type PageProps = {
  content: string;
};

const useStyles = createUseStyles(
  (theme: Theme) => ({
    root: {
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      height: `calc(100vh - ${theme.spacing(8)}px)`,
    },
    title: {
      ...theme.typography.header,
      textTransform: 'uppercase',
      fontSize: theme.spacing(6),
    },
    subtitle: {
      maxWidth: theme.spacing(60),
      lineHeight: `${theme.spacing(3.5)}px`,
      textAlign: 'center',
    },
  }),
  { name: 'Name' },
);

const NamePage = ({ content }: Props): React.ReactElement => {
  const classes = useStyles();
  const router = useRouter();
  const { name } = router.query;
  return (
    <div className={classes.root}>
      <h1 className={classes.title}>👋 Hi {name} 👋</h1>
      <p className={classes.subtitle}>{content}</p>
    </div>
  );
};

export async function getServerSideProps(
  context: NextPageContext,
): Promise<GetServerSidePropsResult<PageProps>> {
  console.log(context.query);

  const url = new URL('https://baconipsum.com/api');
  url.searchParams.append('type', 'all-meat');
  url.searchParams.append('sentences', '1');
  url.searchParams.append('start-with-lorem', '0');

  const { data: content } = await Axios.get(url.toString());
  return {
    props: {
      content,
    },
  };
}

export default NamePage;
