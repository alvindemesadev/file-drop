import FileDownload from './FileDownload';

export default async function DownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FileDownload id={id} />;
}
