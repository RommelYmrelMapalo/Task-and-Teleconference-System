type AttachmentPreviewPageProps = {
  searchParams: Promise<{
    filename?: string | string[];
    url?: string | string[];
  }>;
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AttachmentPreviewPage({ searchParams }: AttachmentPreviewPageProps) {
  const resolvedSearchParams = await searchParams;
  const sourceUrl = firstQueryValue(resolvedSearchParams.url);
  const filename = firstQueryValue(resolvedSearchParams.filename) || "Document preview";

  if (!sourceUrl) {
    return (
      <main
        style={{
          alignItems: "center",
          background: "#f4f6fb",
          color: "#182235",
          display: "flex",
          fontFamily: "Georgia, serif",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
        }}
      >
        <p>Missing document URL.</p>
      </main>
    );
  }

  const viewerUrl = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(sourceUrl)}`;

  return (
    <main
      style={{
        background: "#dfe8f3",
        minHeight: "100vh",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "1rem",
          boxShadow: "0 24px 60px rgba(24, 34, 53, 0.12)",
          height: "calc(100vh - 2rem)",
          overflow: "hidden",
        }}
      >
        <iframe
          src={viewerUrl}
          title={`Preview of ${filename}`}
          style={{
            border: "0",
            height: "100%",
            width: "100%",
          }}
        />
      </div>
    </main>
  );
}
