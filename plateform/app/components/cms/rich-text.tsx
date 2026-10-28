import type { PageInlineNode, PageListNode, PageRichTextNode, PageTextNode } from "@engagement/dto";
import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";

// Rendu du texte riche de Strapi (éditeur « Blocks ») avec les balises HTML simples, mises en forme par le DSFR.
// Aucun HTML brut du CMS n'est injecté : tout passe par React, et les URL de liens sont filtrées.
const EXTERNAL_URL = /^https?:\/\//i;
const INTERNAL_URL = /^\/(?!\/)/;
const SAFE_URL = /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i;

const isBlank = (nodes: PageInlineNode[]) => nodes.every((node) => node.type === "text" && !node.text.trim());

export default function RichText({ nodes }: { nodes: PageRichTextNode[] }) {
  return nodes.map((node, index) => <Node key={index} node={node} />);
}

function Node({ node }: { node: PageRichTextNode }) {
  switch (node.type) {
    case "paragraph":
      // L'éditeur produit des paragraphes vides pour les sauts de ligne : ils n'ont pas leur place dans le HTML.
      return isBlank(node.children) ? null : (
        <p>
          <Inline nodes={node.children} />
        </p>
      );
    case "heading": {
      // Le titre de la page est le h1 : « Titre 1 » de l'éditeur donne un h2, jusqu'au h6.
      const Tag = `h${Math.min(node.level + 1, 6)}` as "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <Tag>
          <Inline nodes={node.children} />
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote>
          <Inline nodes={node.children} />
        </blockquote>
      );
    case "code":
      return (
        <pre>
          <code>{node.children.map((child) => child.text).join("")}</code>
        </pre>
      );
    case "list":
      return <List node={node} />;
    case "image":
      // Sans texte alternatif renseigné dans la médiathèque, l'image est décorative.
      return (
        <figure>
          <img
            src={node.image.url}
            alt={node.image.alternativeText ?? ""}
            width={node.image.width ?? undefined}
            height={node.image.height ?? undefined}
            loading="lazy"
            className="h-auto max-w-full"
          />
        </figure>
      );
    default:
      return null;
  }
}

function List({ node }: { node: PageListNode }) {
  const Tag = node.format === "ordered" ? "ol" : "ul";
  return (
    <Tag>
      {node.children.map((item, index) => (
        <li key={index}>
          {item.children.map((child, childIndex) => (child.type === "list" ? <List key={childIndex} node={child} /> : <Inline key={childIndex} nodes={[child]} />))}
        </li>
      ))}
    </Tag>
  );
}

function Inline({ nodes }: { nodes: PageInlineNode[] }) {
  return nodes.map((node, index) => (node.type === "link" ? <RichLink key={index} url={node.url} nodes={node.children} /> : <TextRun key={index} node={node} />));
}

function TextRun({ node }: { node: PageTextNode }) {
  // Un retour à la ligne dans un paragraphe (Maj+Entrée) devient un <br>.
  let content: ReactNode = node.text.split("\n").map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {line}
    </Fragment>
  ));
  if (node.code) content = <code>{content}</code>;
  if (node.bold) content = <strong>{content}</strong>;
  if (node.italic) content = <em>{content}</em>;
  if (node.underline) content = <u>{content}</u>;
  if (node.strikethrough) content = <s>{content}</s>;
  return content;
}

function RichLink({ url, nodes }: { url: string; nodes: PageTextNode[] }) {
  const content = nodes.map((node, index) => <TextRun key={index} node={node} />);
  // URL non autorisée (ex. `javascript:`) : on garde le texte sans lien.
  if (!SAFE_URL.test(url)) return content;
  if (EXTERNAL_URL.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" title={`${nodes.map((node) => node.text).join("")} - nouvelle fenêtre`}>
        {content}
      </a>
    );
  }
  if (INTERNAL_URL.test(url)) return <Link to={url}>{content}</Link>;
  return <a href={url}>{content}</a>;
}
