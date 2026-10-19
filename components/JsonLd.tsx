// Structured data for search engines: a <script type="application/ld+json"> that
// describes the page (a game, the site) in schema.org terms. Not executed, only read.
// `<` is escaped so text in the data can never close the script tag early (the bundled
// Next.js JSON-LD guide recommends this).

export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />;
}
