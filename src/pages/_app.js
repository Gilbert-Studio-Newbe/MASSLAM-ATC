// src/pages/_app.js
import '../styles/globals.css';
import '../styles/apple-inspired.css';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/apple-inspired.css" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
