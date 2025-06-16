import Document, { Head, Html, Main, NextScript } from "next/document";
class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    // TODO: Fix plausible script injection during build
    return { ...initialProps };
  }

  render() {
    return (
      <Html>
        <Head>{/* Plausible script temporarily removed */}</Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
