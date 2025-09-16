import Document, { DocumentContext, DocumentInitialProps, Head, Html, Main, NextScript } from "next/document";

interface MyDocumentProps extends DocumentInitialProps {
  domain?: string;
}

class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<MyDocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);
    let domain: string | undefined = undefined;
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
