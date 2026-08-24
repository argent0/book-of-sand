export function Page({
  pageNumber,
  text,
  illustration,
}: {
  pageNumber: string;
  text: string;
  illustration?: { dataUrl: string; description: string };
}) {
  return (
    <article className="page">
      <div className="folio">{pageNumber}</div>
      <div className="columns">
        {illustration && (
          <figure className="illustration">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={illustration.dataUrl} alt={illustration.description} />
          </figure>
        )}
        {text.split(/\n+/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
