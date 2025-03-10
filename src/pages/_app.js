// src/pages/_app.js
import '../../styles/tailwind-base.css';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/main.css" />
        <style dangerouslySetInnerHTML={{ __html: `
          /* Critical CSS to ensure basic styling works even if external CSS fails */
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f7;
            color: #1d1d1f;
            margin: 0;
            padding: 0;
          }
          .apple-container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
          }
          .apple-header {
            background-color: rgba(255, 255, 255, 0.8);
            position: sticky;
            top: 0;
            z-index: 100;
            padding: 1rem 0;
            border-bottom: 1px solid #d2d2d7;
          }
          .apple-nav {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .apple-nav-list {
            display: flex;
            flex-direction: row;
            align-items: center;
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .apple-nav-link {
            color: #1d1d1f;
            text-decoration: none;
            margin: 0 0.75rem;
          }
          .mobile-menu-button {
            display: none;
          }
          @media (max-width: 768px) {
            .mobile-menu-button {
              display: block;
            }
            .mobile-nav {
              display: none;
            }
            .mobile-nav.active {
              display: block;
            }
            .apple-nav-list {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        ` }}/>
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
