import Document, { Head, Html, Main, NextScript } from "next/document";
class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    let domain = null;
    if (ctx.req) {
      const host = ctx.req.headers?.host || "";
      domain = host.split(":")[0];
    }

    return { ...initialProps, domain };
  }

  render() {
    return (
      <Html>
        <Head>{this.props.domain && <script defer data-domain={this.props.domain} src="https://plausible.io/js/script.js"></script>}</Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
