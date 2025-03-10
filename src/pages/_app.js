// src/pages/_app.js
import '../../styles/tailwind-base.css';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/combined-styles.css" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
