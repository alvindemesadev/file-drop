import FileUpload from '@/components/FileUpload';

export default function UploadPage() {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">FileDrop</h1>
        <p className="text-muted-foreground mt-2">
          Upload files and get a shareable link
        </p>
      </div>
      <FileUpload />
    </div>
  );
}
